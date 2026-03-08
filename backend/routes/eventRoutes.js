const express = require('express');
const router = express.Router();
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "You must be logged in to perform this action." });
};
const db = require('../config/db');
const { findOrCreateVenue } = require('../utils/venueUtil');
const financeClient = require('../services/financeClient');

// --- CUSTOM SECURITY MIDDLEWARE ---
const isGod = (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized: Please log in." });
    if (req.user.role !== 'GOD') return res.status(403).json({ error: "Forbidden: You do not have Divine authority." });
    next(); 
};

router.get("/api/dates/filter-options", async (req, res) => {
    try {
        const [yearRows] = await db.query(
            'SELECT DISTINCT YEAR(dateDate) AS year FROM dates ORDER BY year DESC'
        );
        const [bandRows] = await db.query(
            `SELECT DISTINCT b.bandID, b.bandName FROM dates d JOIN bands b ON d.bandID = b.bandID ORDER BY b.bandName ASC`
        );
        const [statusRows] = await db.query(
            'SELECT statusID, statusName FROM status ORDER BY statusName ASC'
        );
        res.json({
            years: yearRows.map((r) => String(r.year)),
            bandID: bandRows.map((r) => ({ bandID: r.bandID, bandName: r.bandName || '—' })),
            statuses: statusRows.map((r) => ({ statusID: r.statusID, statusName: r.statusName || '—' }))
        });
    } catch (err) {
        console.error("Filter options error:", err);
        res.status(500).json({ error: "Failed to fetch filter options" });
    }
});

function escapeLike(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

router.get("/api/dates", async (req, res) => {
    const { timeline, status, paid, year, bandID, limit: limitParam, offset: offsetParam, search: searchParam, order: orderParam } = req.query;
    const usePagination = limitParam != null && limitParam !== '' && !isNaN(Number(limitParam));
    const limit = usePagination ? Math.min(40, Math.max(1, parseInt(limitParam, 10))) : null;
    const offset = usePagination && offsetParam != null && offsetParam !== '' ? Math.max(0, parseInt(offsetParam, 10)) : 0;
    const searchRaw = typeof searchParam === 'string' && searchParam.trim() ? searchParam.trim() : null;
    const search = searchRaw ? escapeLike(searchRaw) : null;
    const orderRaw = typeof orderParam === 'string' ? orderParam.trim().toLowerCase() : '';
    const orderDir = orderRaw === 'desc' ? 'DESC' : 'ASC';

    try {
        let whereClauses = [];
        let queryValues = [];
        if (status && status !== 'all') {
            whereClauses.push(`t1.dateStatus = ?`);
            queryValues.push(status);
        }
        if (year && year !== 'all') {
            whereClauses.push(`YEAR(t1.dateDate) = ?`);
            queryValues.push(year);
        }
        if (bandID && bandID !== 'all') {
            whereClauses.push(`t1.bandID = ?`);
            queryValues.push(bandID);
        }
        if (timeline === 'upcoming') {
            whereClauses.push(`t1.dateDate >= CURDATE()`);
        } else if (timeline === 'past') {
            whereClauses.push(`t1.dateDate < CURDATE()`);
        }
        if (search) {
            const like = `%${search}%`;
            const searchConditions = [
                'COALESCE(v.venueName, "") LIKE ?', 'COALESCE(v.venueCity, "") LIKE ?', 'COALESCE(v.venueCountry, "") LIKE ?',
                'COALESCE(b.bandName, "") LIKE ?', 'COALESCE(t3.statusName, "") LIKE ?', 'COALESCE(t1.dateDescription, "") LIKE ?',
                'COALESCE(t1.dateCategory, "") LIKE ?', 'COALESCE(t1.dateContactOrganizer, "") LIKE ?', 'COALESCE(t1.dateContactTech, "") LIKE ?'
            ];
            whereClauses.push(`(${searchConditions.join(' OR ')})`);
            for (let i = 0; i < searchConditions.length; i++) queryValues.push(like);
        }
        const joins = ` LEFT JOIN venues v ON t1.venueID = v.venueID LEFT JOIN bands b ON t1.bandID = b.bandID LEFT JOIN status t3 ON t1.dateStatus = t3.statusID`;
        const whereSql = whereClauses.length > 0 ? ` WHERE ` + whereClauses.join(" AND ") : '';

        let total = null;
        if (usePagination) {
            const countSql = `SELECT COUNT(*) AS total FROM dates t1 ${joins} ${whereSql}`;
            const [countRows] = await db.query(countSql, queryValues);
            total = countRows[0]?.total ?? 0;
        }

        let sql = `
            SELECT 
                t1.dateID, t1.dateDate, t1.bandID, t1.venueID, t1.dateStatus, t1.dateDescription,
                t1.dateStart, t1.dateLoadin, t1.dateSoundcheck, t1.dateDoors, t1.dateCurfew,
                t1.dateCategory, t1.dateContactOrganizer, t1.dateContactTech, t1.dateOwner,
                v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry,
                DATE_FORMAT(t1.dateDate, '%Y-%m-%d') as dateDate,
                b.bandName, b.bandColor,
                t3.statusName, t3.statusColor
            FROM dates t1
            LEFT JOIN venues v ON t1.venueID = v.venueID
            LEFT JOIN bands b ON t1.bandID = b.bandID
            LEFT JOIN status t3 ON t1.dateStatus = t3.statusID
            ${whereSql}
            ORDER BY t1.dateDate ${orderDir}
        `;
        if (limit != null) {
            sql += ` LIMIT ? OFFSET ?`;
            queryValues.push(limit, offset);
        }
        const [results] = await db.query(sql, queryValues);
        if (results.length > 0 && !financeClient.enabled()) {
            return res.status(503).json({ error: 'Finance service is required.' });
        }
        let finalData = results;
        if (results.length > 0) {
            try {
                const summary = await financeClient.summaryForDates(results.map((r) => r.dateID));
                finalData = results.map((r) => {
                    const s = summary[r.dateID];
                    return s ? { ...r, datePrice: s.gross, datePaidAmount: s.totalPaid, dateCurrency: s.currency || 'EUR' } : r;
                });
            } catch (err) {
                console.error('Dates GET finance summary error', err);
                return res.status(503).json({ error: err.message || 'Finance service unavailable.' });
            }
        }
        if (paid === 'paid') finalData = finalData.filter(r => parseFloat(r.datePaidAmount || 0) >= parseFloat(r.datePrice || 0));
        else if (paid === 'unpaid') finalData = finalData.filter(r => parseFloat(r.datePaidAmount || 0) < parseFloat(r.datePrice || 0));

        if (usePagination && total !== null) {
            return res.json({ dates: finalData, total });
        }
        res.json(finalData);
    } catch (err) {
        console.error("Dates GET Error:", err);
        res.status(500).json({ error: "Failed to fetch dates" });
    }
});

router.get("/api/check-conflict", async (req, res) => {
    const { date, venue, city, country } = req.query;
    try {
        if (!date || !venue) {
            return res.json({ conflict: false });
        }
        const [venueRows] = await db.query(
            'SELECT venueID FROM venues WHERE venueName = ? AND venueCity = ? AND venueCountry = ?',
            [venue || 'Unknown', city || 'Unknown', country || '']
        );
        if (venueRows.length === 0) return res.json({ conflict: false });
        const venueID = venueRows[0].venueID;
        const sql = "SELECT d.*, v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry FROM dates d LEFT JOIN venues v ON d.venueID = v.venueID WHERE d.dateDate = ? AND d.venueID = ?";
        const [results] = await db.query(sql, [date, venueID]);
        if (results.length > 0) {
            return res.json({ conflict: true, event: results[0] });
        }
        res.json({ conflict: false });
    } catch (err) {
        res.status(500).json({ error: "Conflict check failed" });
    }
});

// 1. Change 'isGod' to 'isAuthenticated' (or your standard login check)
router.post("/api/add-date", isAuthenticated, async (req, res) => {
    const d = req.body;
    const dateOwner = req.user.userID || req.user.id;
    if (!dateOwner) {
        return res.status(401).json({ error: "Not authenticated." });
    }
    if (!d.bandID) {
        return res.status(400).json({ error: "Band is required." });
    }
    try {
        const [membership] = await db.query(
            "SELECT role FROM band_members WHERE bandID = ? AND userID = ?",
            [d.bandID, dateOwner]
        );

        if (membership.length === 0) {
            return res.status(403).json({ 
                error: "You are not a member of this band." 
            });
        }
        // ----------------------------

        const hasVenue = d.dateVenue && String(d.dateVenue).trim();
        const venueID = hasVenue
            ? await findOrCreateVenue(d.dateVenue.trim(), d.dateCity || '', d.dateCountry || '', d.dateVenueAddress || null)
            : null;

        const sql = `
            INSERT INTO dates 
            (dateDate, bandID, venueID, datePrice, 
             dateCurrency, dateStart, dateLoadin, dateSoundcheck, dateDoors, 
             dateCurfew, dateCategory, dateContactOrganizer, dateContactTech,
             dateDescription, dateStatus, dateOwner) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const useFinanceOnly = financeClient.enabled();
        const values = [
            d.dateDate, 
            d.bandID, 
            venueID,
            useFinanceOnly ? 0 : (d.datePrice || 0), 
            useFinanceOnly ? 'EUR' : (d.dateCurrency || 'EUR'), 
            d.dateStart || null, 
            d.dateLoadin || null,
            d.dateSoundcheck || null, 
            d.dateDoors || null, 
            d.dateCurfew || null,
            d.dateCategory || null, 
            d.dateContactOrganizer || null,
            d.dateContactTech || null,
            d.dateDescription || null, 
            d.dateStatus || 1,
            dateOwner
        ];

        const [result] = await db.query(sql, values);
        const insertId = result.insertId;

        console.log('Add-date success:', { dateID: insertId, bandID: d.bandID, dateDate: d.dateDate });

        if (financeClient.enabled()) {
          financeClient.dateCreated(insertId, d.bandID, d.dateDate, venueID, d.datePrice ?? null, d.dateCurrency ?? null)
            .catch((err) => console.error('Finance date-created sync failed (date already saved in Gigstr):', err.message));
        }

        res.json({ success: true, insertId });

    } catch (err) {
        console.error("Add Error:", err);
        res.status(500).json({ error: "Failed to add event. Check if the band is valid." });
    }
});

router.get("/api/calendar-dates", async (req, res) => {
    const userId = req.user?.id || req.user?.userID;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const sql = `
            SELECT 
                t1.dateID, 
                DATE_FORMAT(t1.dateDate, '%Y-%m-%d') as dateDate, 
                v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry,
                t1.dateDescription,
                b.bandName, b.bandColor, 
                s.statusName, s.statusColor
            FROM dates t1
            LEFT JOIN venues v ON t1.venueID = v.venueID
            LEFT JOIN bands b ON t1.bandID = b.bandID
            LEFT JOIN status s ON t1.dateStatus = s.statusID
            LEFT JOIN band_members bm ON t1.bandID = bm.bandID
            WHERE bm.userID = ?
            GROUP BY t1.dateID
            ORDER BY t1.dateDate ASC
        `;

        const [results] = await db.query(sql, [userId]);
        if (results.length > 0 && !financeClient.enabled()) {
            return res.status(503).json({ error: 'Finance service is required.' });
        }
        let calendarResults = results;
        if (results.length > 0) {
            try {
                const summary = await financeClient.summaryForDates(results.map((r) => r.dateID));
                calendarResults = results.map((r) => {
                    const s = summary[r.dateID];
                    return s ? { ...r, datePrice: s.gross, datePaidAmount: s.totalPaid, dateCurrency: s.currency || 'EUR' } : r;
                });
            } catch (err) {
                console.error('Calendar-dates finance summary error', err);
                return res.status(503).json({ error: err.message || 'Finance service unavailable.' });
            }
        }
        res.json(calendarResults);
    } catch (err) {
        console.error("CALENDAR ROUTE CRASH:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/api/update-date/:id", isGod, async (req, res) => {
  const { id } = req.params;
  const d = req.body;
  try {
    const [dateRows] = await db.query("SELECT dateDate FROM dates WHERE dateID = ?", [id]);
    if (dateRows.length === 0) return res.status(404).json({ error: "Gig not found" });
    if (isPastDate(dateRows[0].dateDate)) {
      return res.status(400).json({ error: "Past dates cannot be edited." });
    }
    const hasVenue = d.dateVenue && String(d.dateVenue).trim();
      const venueID = hasVenue
        ? await findOrCreateVenue(d.dateVenue.trim(), d.dateCity || '', d.dateCountry || '', d.dateVenueAddress || null)
        : null;

      if (financeClient.enabled() && (d.datePrice != null || d.dateCurrency != null)) {
        try {
          await financeClient.setRevenue(id, d.bandID, d.datePrice ?? 0, d.dateCurrency ?? 'EUR');
        } catch (err) {
          console.error('Update-date setRevenue error', err);
        }
      }

      const useFinanceOnly = financeClient.enabled();
      const sql = `
        UPDATE dates SET 
          dateDate = ?, bandID = ?, venueID = ?, datePrice = ?, dateCurrency = ?, dateStart = ?, 
          dateLoadin = ?, dateSoundcheck = ?, dateDoors = ?, dateCurfew = ?,
          dateCategory = ?, dateContactOrganizer = ?, dateContactTech = ?,
          dateDescription = ?, dateStatus = ?
        WHERE dateID = ?
      `;
      const values = [
        d.dateDate, d.bandID, venueID, useFinanceOnly ? 0 : (d.datePrice ?? 0), useFinanceOnly ? 'EUR' : (d.dateCurrency ?? 'EUR'), d.dateStart || null, 
        d.dateLoadin || null, d.dateSoundcheck || null, d.dateDoors || null, d.dateCurfew || null,
        d.dateCategory || null, d.dateContactOrganizer || null, d.dateContactTech || null,
        d.dateDescription || null, d.dateStatus, id
    ];
    await db.query(sql, values);
    res.json({ success: true });
} catch (err) {
  console.error("Update error:", err);
  res.status(500).json({ error: "Update failed" });
}
});

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(String(dateStr).substring(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

router.delete("/api/delete-date/:id", isGod, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT dateDate FROM dates WHERE dateID = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "No record found with that ID" });
    if (isPastDate(rows[0].dateDate)) {
      return res.status(400).json({ error: "Past dates cannot be deleted." });
    }
    if (financeClient.enabled()) {
      try {
        await financeClient.dateDeleted(id);
      } catch (err) {
        if (err.status !== 404) {
          console.error('Finance date-deleted error', err);
          return res.status(err.status || 500).json({ error: err.message || 'Finance delete failed' });
        }
        // 404 = date not in finance DB; still delete from Gigstr
      }
    }
    const [result] = await db.query("DELETE FROM dates WHERE dateID = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No record found with that ID" });
    }
    res.json({ success: true, message: "Entry expunged" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.get("/api/date/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT t1.dateID, t1.dateDate, t1.bandID, t1.venueID, t1.dateStatus, t1.dateDescription,
      t1.dateStart, t1.dateLoadin, t1.dateSoundcheck, t1.dateDoors, t1.dateCurfew,
      t1.dateCategory, t1.dateContactOrganizer, t1.dateContactTech, t1.dateOwner,
      v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry,
      DATE_FORMAT(t1.dateDate, '%Y-%m-%d') as dateDate,
      b.bandName, b.bandColor, t3.statusName, t3.statusColor
      FROM dates t1
      LEFT JOIN venues v ON t1.venueID = v.venueID
      LEFT JOIN bands b ON t1.bandID = b.bandID
      LEFT JOIN status t3 ON t1.dateStatus = t3.statusID
      WHERE t1.dateID = ?
    `;
    const [rows] = await db.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Gig not found" });
    let row = rows[0];
    if (!financeClient.enabled()) {
      return res.status(503).json({ error: 'Finance service is required.' });
    }
    try {
      const summary = await financeClient.summaryForDates([Number(id)]);
      const s = summary[row.dateID];
      if (s) row = { ...row, datePrice: s.gross, datePaidAmount: s.totalPaid, dateCurrency: s.currency || 'EUR' };
    } catch (err) {
      console.error('Date/:id finance summary error', err);
      return res.status(503).json({ error: err.message || 'Finance service unavailable.' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/api/dates/pay-single/:id", isGod, async (req, res) => {
    const { id: dateID } = req.params;

    if (financeClient.enabled()) {
      try {
        const summary = await financeClient.summaryForDates([Number(dateID)]);
        const s = summary[dateID];
        if (!s) return res.status(404).json({ message: "Gig not found." });
        const remainingBalance = Number(s.gross) - Number(s.totalPaid);
        if (remainingBalance <= 0) return res.status(400).json({ message: "This gig is already fully paid." });
        const [[exRow]] = await db.query("SELECT exrateEurToRsd FROM exrate WHERE exrateID = 1");
        const exrateEurToRsd = exRow?.exrateEurToRsd || 117.3;
        const amountOriginal = s.currency === 'RSD' ? remainingBalance * exrateEurToRsd : remainingBalance;
        await financeClient.recordPayment(dateID, remainingBalance, amountOriginal, s.currency || 'EUR', exrateEurToRsd);
        return res.json({ success: true, message: `Payment of ${remainingBalance.toFixed(2)} for gig ${dateID} processed.` });
      } catch (err) {
        console.error("Pay-single finance error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to process payment." });
      }
    }
    return res.status(503).json({ error: 'Finance service is required.' });
});

router.post("/api/dates/pay-bulk", isGod, async (req, res) => {
    const { payments: list, currency, exchangeRate } = req.body;
    if (!list || !Array.isArray(list) || list.length === 0) {
        return res.status(400).json({ error: "Invalid payments data provided." });
    }

    if (!financeClient.enabled()) {
      return res.status(503).json({ error: 'Finance service is required.' });
    }
    try {
      await financeClient.recordPaymentsBulk(list, currency || 'EUR', exchangeRate);
      return res.json({ success: true, message: `${list.length} payments processed successfully.` });
    } catch (err) {
      console.error("Pay-bulk finance error:", err);
      return res.status(err.status || 500).json({ error: err.message || "Failed to process bulk payment." });
    }
});

module.exports = router;