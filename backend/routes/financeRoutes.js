const express = require('express');
const db = require('../config/db');
const financeClient = require('../services/financeClient');

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
// When FINANCE_APP_URL is set, proxies to gigstr-finance and enriches date with venue/bandColor from Gigstr DB.
router.get('/api/finance/worksheet/:dateID', isGod, async (req, res) => {
  const { dateID } = req.params;

  if (!financeClient.enabled()) {
    return res.status(503).json({ error: 'Finance service is required.' });
  }
  try {
    const data = await financeClient.getWorksheet(dateID);
    if (data.date?.venueID) {
      const [v] = await db.query('SELECT venueName, venueCity, venueCountry FROM venues WHERE venueID = ?', [data.date.venueID]);
      if (v?.length) Object.assign(data.date, { venueName: v[0].venueName, venueCity: v[0].venueCity, venueCountry: v[0].venueCountry });
    }
    if (data.date?.bandID) {
      const [b] = await db.query('SELECT bandColor FROM bands WHERE bandID = ?', [data.date.bandID]);
      if (b?.length) data.date.bandColor = b[0].bandColor;
    }
    return res.json(data);
  } catch (err) {
    console.error('Worksheet finance proxy error', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to load finance worksheet' });
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

  if (!financeClient.enabled()) {
    return res.status(503).json({ error: 'Finance service is required.' });
  }
  try {
    const data = await financeClient.createLedgerItem(dateID, { category, label, amount: numAmount, targetUserID: targetUserID || null });
    return res.status(201).json(data);
  } catch (err) {
    console.error('Create ledger item proxy error', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to create ledger item' });
  }
});

// Delete a ledger item (only if not paid)
router.delete('/api/finance/worksheet/item/:ledgerID', isGod, async (req, res) => {
  const { ledgerID } = req.params;

  if (!financeClient.enabled()) {
    return res.status(503).json({ error: 'Finance service is required.' });
  }
  try {
    const data = await financeClient.deleteLedgerItem(ledgerID);
    return res.json(data);
  } catch (err) {
    console.error('Delete ledger item proxy error', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to delete ledger item' });
  }
});

// Publish settlement for a date (assign settlementID, move draft -> published)
router.post('/api/finance/worksheet/:dateID/publish', isGod, async (req, res) => {
  const { dateID } = req.params;

  if (!financeClient.enabled()) {
    return res.status(503).json({ error: 'Finance service is required.' });
  }
  try {
    const data = await financeClient.publishSettlement(dateID);
    return res.json(data);
  } catch (err) {
    console.error('Publish settlement proxy error', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to publish settlement' });
  }
});

// --- Member Wallet Endpoints ---

// GET /api/my-wallet?filter=owed|paid|pending|all
router.get('/api/my-wallet', isAuthenticated, async (req, res) => {
  const userId = req.user.userID || req.user.id;
  const filter = (req.query.filter || 'all').toLowerCase();

  if (!financeClient.enabled()) {
    return res.status(503).json({ error: 'Finance service is required.' });
  }
  try {
    const rows = await financeClient.getMyLedger(userId, filter);
    if (rows.length && rows.some((r) => r.venueID)) {
      const venueIds = [...new Set(rows.map((r) => r.venueID).filter(Boolean))];
      const [venues] = await db.query('SELECT venueID, venueName, venueCity, venueCountry FROM venues WHERE venueID IN (?)', [venueIds]);
      const byVenue = Object.fromEntries((venues || []).map((v) => [v.venueID, v]));
      rows.forEach((r) => {
        const v = byVenue[r.venueID];
        if (v) Object.assign(r, { venueName: v.venueName, venueCity: v.venueCity, venueCountry: v.venueCountry });
      });
    }
    return res.json(rows);
  } catch (err) {
    console.error('My wallet proxy error', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to load wallet data' });
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
      'SELECT d.dateID, d.bandID FROM dates d WHERE d.dateID = ?',
      [dateID]
    );
    if (dateRows.length === 0) return res.status(404).json({ error: 'Gig not found' });
    const bandID = dateRows[0].bandID;

    const [membership] = await db.query(
      'SELECT role FROM band_members WHERE bandID = ? AND userID = ? AND status = "active"',
      [bandID, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not an active member of this band.' });
    }

    if (!financeClient.enabled()) {
      return res.status(503).json({ error: 'Finance service is required.' });
    }
    await financeClient.logPayment(userId, dateID, numAmount, label);
    const [owners] = await db.query(
      'SELECT bm.userID FROM band_members bm WHERE bm.bandID = ? AND bm.status = "active" AND bm.role IN ("owner", "admin")',
      [bandID]
    );
    const ownerIds = owners.map((row) => row.userID);
    if (ownerIds.length > 0) {
      const payload = JSON.stringify({ dateID, memberUserID: userId, amount: numAmount });
      await insertNotifications(ownerIds, 'member_payment_logged', 'Member logged a payout', 'A band member has recorded a payout in their Valet.', payload);
    }
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Log payment proxy error', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to log payout' });
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

