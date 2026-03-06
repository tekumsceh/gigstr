const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Basic auth middlewares (mirroring patterns from other routes)
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'You must be logged in to perform this action.' });
};

const isGod = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized: Please log in.' });
  }
  if (!req.user || req.user.role !== 'GOD') {
    return res.status(403).json({ error: 'Forbidden: You do not have Divine authority.' });
  }
  next();
};

async function touchDateUpdated(connectionOrPool, dateID) {
  try {
    await connectionOrPool.query(
      'UPDATE dates SET dateUpdated = NOW() WHERE dateID = ?',
      [dateID]
    );
  } catch (err) {
    console.error('Failed to update dates.dateUpdated for', dateID, err);
  }
}

async function insertNotifications(userIds, type, title, body, payloadJson) {
  if (!userIds || userIds.length === 0) return;

  const rows = userIds.map((userID) => [
    userID,
    type,
    title || null,
    body || null,
    payloadJson || null
  ]);

  const sql = `
    INSERT INTO notifications (userID, type, title, body, payload)
    VALUES ?
  `;

  try {
    await db.query(sql, [rows]);
  } catch (err) {
    console.error('Failed to insert notifications', err);
  }
}

// --- Admin Worksheet Endpoints ---

// Get worksheet for a specific date (GOD only for now)
router.get('/api/finance/worksheet/:dateID', isGod, async (req, res) => {
  const { dateID } = req.params;

  try {
    const [dateRows] = await db.query(
      `
        SELECT 
          d.dateID,
          d.dateDate,
          d.datePrice,
          d.dateCurrency,
          d.bandID,
          b.bandName,
          b.bandColor,
          v.venueName,
          v.venueCity,
          v.venueCountry
        FROM dates d
        LEFT JOIN bands b ON d.bandID = b.bandID
        LEFT JOIN venues v ON d.venueID = v.venueID
        WHERE d.dateID = ?
      `,
      [dateID]
    );

    if (dateRows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    const date = dateRows[0];

    const [ledgerRows] = await db.query(
      `
        SELECT 
          fl.*,
          u.displayName AS targetUserName
        FROM finances_ledger fl
        LEFT JOIN users u ON fl.targetUserID = u.userID
        WHERE fl.dateID = ?
        ORDER BY fl.createdAt ASC, fl.ledgerID ASC
      `,
      [dateID]
    );

    const [rosterRows] = await db.query(
      `
        SELECT 
          u.userID,
          u.displayName,
          u.email,
          bm.role,
          bm.status
        FROM band_members bm
        JOIN users u ON bm.userID = u.userID
        WHERE bm.bandID = ?
        ORDER BY bm.role = 'owner' DESC, bm.role = 'admin' DESC, u.displayName ASC
      `,
      [date.bandID]
    );

    const gross = Number(date.datePrice || 0);
    const totalExpenses = ledgerRows
      .filter((row) => row.category === 'expense')
      .reduce((acc, row) => acc + Number(row.amount || 0), 0);
    const totalPayouts = ledgerRows
      .filter((row) => row.category === 'payout')
      .reduce((acc, row) => acc + Number(row.amount || 0), 0);

    const netAfterExpenses = gross - totalExpenses;

    const summary = {
      gross,
      totalExpenses,
      totalPayouts,
      netAfterExpenses,
      balanced: Math.abs(gross - (totalExpenses + totalPayouts)) < 0.01
    };

    res.json({
      date,
      ledgerItems: ledgerRows,
      roster: rosterRows,
      summary
    });
  } catch (err) {
    console.error('Worksheet fetch error', err);
    res.status(500).json({ error: 'Failed to load finance worksheet' });
  }
});

// Create a new ledger line item for a date
router.post('/api/finance/worksheet/:dateID/items', isGod, async (req, res) => {
  const { dateID } = req.params;
  const { category, label, amount, targetUserID } = req.body || {};

  if (!category || !['expense', 'payout', 'band_fund'].includes(category)) {
    return res.status(400).json({ error: 'Invalid or missing category' });
  }
  if (!label || typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'Label is required' });
  }
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    const [dateRows] = await db.query('SELECT bandID FROM dates WHERE dateID = ?', [dateID]);
    if (dateRows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    const bandID = dateRows[0].bandID;

    const [result] = await db.query(
      `
        INSERT INTO finances_ledger
          (dateID, bandID, targetUserID, category, label, amount, status)
        VALUES (?, ?, ?, ?, ?, ?, 'draft')
      `,
      [dateID, bandID, targetUserID || null, category, label.trim(), numAmount]
    );

    await touchDateUpdated(db, dateID);

    res.status(201).json({ success: true, ledgerID: result.insertId });
  } catch (err) {
    console.error('Create ledger item error', err);
    res.status(500).json({ error: 'Failed to create ledger item' });
  }
});

// Delete a ledger item (only if not paid)
router.delete('/api/finance/worksheet/item/:ledgerID', isGod, async (req, res) => {
  const { ledgerID } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT dateID, status FROM finances_ledger WHERE ledgerID = ?',
      [ledgerID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ledger item not found' });
    }

    const row = rows[0];
    if (row.status === 'paid') {
      return res.status(400).json({ error: 'Paid ledger items cannot be deleted' });
    }

    await db.query('DELETE FROM finances_ledger WHERE ledgerID = ?', [ledgerID]);
    await touchDateUpdated(db, row.dateID);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete ledger item error', err);
    res.status(500).json({ error: 'Failed to delete ledger item' });
  }
});

// Publish settlement for a date (assign settlementID, move draft -> published)
router.post('/api/finance/worksheet/:dateID/publish', isGod, async (req, res) => {
  const { dateID } = req.params;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingDrafts] = await connection.query(
      'SELECT ledgerID, targetUserID FROM finances_ledger WHERE dateID = ? AND status = "draft"',
      [dateID]
    );

    if (existingDrafts.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No draft ledger items to publish for this gig.' });
    }

    const [maxRow] = await connection.query(
      'SELECT COALESCE(MAX(settlementID), 0) AS maxSettle FROM finances_ledger WHERE dateID = ?',
      [dateID]
    );
    const nextSettlement = (maxRow[0]?.maxSettle || 0) + 1;

    await connection.query(
      `
        UPDATE finances_ledger
        SET settlementID = ?, status = 'published'
        WHERE dateID = ? AND status = 'draft'
      `,
      [nextSettlement, dateID]
    );

    await touchDateUpdated(connection, dateID);

    await connection.commit();

    // Notify all members who have payouts in this settlement
    const memberUserIds = Array.from(
      new Set(
        existingDrafts
          .map((row) => row.targetUserID)
          .filter((id) => id != null)
      )
    );

    if (memberUserIds.length > 0) {
      const payload = JSON.stringify({ dateID, settlementID: nextSettlement });
      await insertNotifications(
        memberUserIds,
        'settlement_published',
        'Settlement published',
        'A new settlement has been published for one of your gigs.',
        payload
      );
    }

    res.json({ success: true, settlementID: nextSettlement });
  } catch (err) {
    await connection.rollback();
    console.error('Publish settlement error', err);
    res.status(500).json({ error: 'Failed to publish settlement' });
  } finally {
    connection.release();
  }
});

// --- Member Wallet Endpoints ---

// GET /api/my-wallet?filter=owed|paid|pending|all
router.get('/api/my-wallet', isAuthenticated, async (req, res) => {
  const userId = req.user.userID || req.user.id;
  const filter = (req.query.filter || 'all').toLowerCase();

  try {
    let statusFilter;
    if (filter === 'owed') statusFilter = ['published'];
    else if (filter === 'paid') statusFilter = ['paid'];
    else if (filter === 'pending') statusFilter = ['draft'];

    const params = [userId];
    let statusSql = '';
    if (statusFilter) {
      statusSql = 'AND fl.status IN (?)';
      params.push(statusFilter);
    } else {
      // default: all non-draft (published or paid)
      statusSql = "AND fl.status IN ('published', 'paid')";
    }

    const [rows] = await db.query(
      `
        SELECT 
          fl.ledgerID,
          fl.dateID,
          fl.category,
          fl.label,
          fl.amount,
          fl.status,
          fl.settlementID,
          fl.createdAt,
          fl.updatedAt,
          d.dateDate,
          d.dateCurrency,
          d.datePrice,
          b.bandName,
          v.venueName,
          v.venueCity,
          v.venueCountry
        FROM finances_ledger fl
        JOIN dates d ON fl.dateID = d.dateID
        LEFT JOIN bands b ON d.bandID = b.bandID
        LEFT JOIN venues v ON d.venueID = v.venueID
        WHERE fl.targetUserID = ?
          ${statusSql}
        ORDER BY d.dateDate DESC, fl.createdAt DESC
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('My wallet fetch error', err);
    res.status(500).json({ error: 'Failed to load wallet data' });
  }
});

// Member logs that they received a payment for a given gig
router.post('/api/my-wallet/log-payment', isAuthenticated, async (req, res) => {
  const userId = req.user.userID || req.user.id;
  const { dateID, amount, label } = req.body || {};

  if (!dateID) {
    return res.status(400).json({ error: 'dateID is required' });
  }
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    const [dateRows] = await db.query(
      `
        SELECT d.dateID, d.bandID
        FROM dates d
        WHERE d.dateID = ?
      `,
      [dateID]
    );

    if (dateRows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    const bandID = dateRows[0].bandID;

    // Optional: ensure the member is actually in the band
    const [membership] = await db.query(
      'SELECT role FROM band_members WHERE bandID = ? AND userID = ? AND status = "active"',
      [bandID, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not an active member of this band.' });
    }

    const labelText = label && label.trim()
      ? label.trim()
      : 'Member self-reported payout';

    await db.query(
      `
        INSERT INTO finances_ledger
          (dateID, bandID, targetUserID, category, label, amount, status)
        VALUES (?, ?, ?, 'payout', ?, ?, 'paid')
      `,
      [dateID, bandID, userId, labelText, numAmount]
    );

    await touchDateUpdated(db, dateID);

    // Notify band owners/admins
    const [owners] = await db.query(
      `
        SELECT bm.userID
        FROM band_members bm
        WHERE bm.bandID = ?
          AND bm.status = 'active'
          AND bm.role IN ('owner', 'admin')
      `,
      [bandID]
    );

    const ownerIds = owners.map((row) => row.userID);
    if (ownerIds.length > 0) {
      const payload = JSON.stringify({ dateID, memberUserID: userId, amount: numAmount });
      await insertNotifications(
        ownerIds,
        'member_payment_logged',
        'Member logged a payout',
        'A band member has recorded a payout in their Valet.',
        payload
      );
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Member log payment error', err);
    res.status(500).json({ error: 'Failed to log payout' });
  }
});

// --- Notifications for current user (simple API) ---

router.get('/api/notifications', isAuthenticated, async (req, res) => {
  const userId = req.user.userID || req.user.id;

  try {
    const [rows] = await db.query(
      `
        SELECT notificationID, type, title, body, payload, isRead, createdAt, readAt
        FROM notifications
        WHERE userID = ?
        ORDER BY createdAt DESC
        LIMIT 100
      `,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Notifications fetch error', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.post('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
  const userId = req.user.userID || req.user.id;
  const { id } = req.params;

  try {
    await db.query(
      `
        UPDATE notifications
        SET isRead = 1, readAt = NOW()
        WHERE notificationID = ? AND userID = ?
      `,
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;

