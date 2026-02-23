const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- CUSTOM SECURITY MIDDLEWARE ---
const isGod = (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized: Please log in." });
    if (req.user.role !== 'GOD') return res.status(403).json({ error: "Forbidden: You do not have Divine authority." });
    next(); 
};

router.get("/api/dates", async (req, res) => {
    const { timeline, status, paid, year } = req.query;
    try {
        let sql = `
            SELECT 
                t1.*, 
                DATE_FORMAT(t1.dateDate, '%Y-%m-%d') as dateDate, 
                b.bandName, b.bandColor, 
                t3.statusName, t3.statusColor,
                COALESCE(SUM(p.amountEUR), 0) AS datePaidAmount
            FROM dates t1
            LEFT JOIN bands b ON t1.bandID = b.bandID
            LEFT JOIN status t3 ON t1.dateStatus = t3.statusID
            LEFT JOIN payments p ON t1.dateID = p.dateID
        `;
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
        if (timeline === 'upcoming') {
            whereClauses.push(`t1.dateDate >= CURDATE()`);
        } else if (timeline === 'past') {
            whereClauses.push(`t1.dateDate < CURDATE()`);
        }
        if (whereClauses.length > 0) {
            sql += ` WHERE ` + whereClauses.join(" AND ");
        }
        sql += ` GROUP BY t1.dateID ORDER BY t1.dateDate ASC`;
        const [results] = await db.query(sql, queryValues);
        let finalData = results;
        if (paid === 'paid') finalData = results.filter(r => parseFloat(r.datePaidAmount) >= parseFloat(r.datePrice));
        else if (paid === 'unpaid') finalData = results.filter(r => parseFloat(r.datePaidAmount) < parseFloat(r.datePrice));
        res.json(finalData);
    } catch (err) {
        console.error("Dates GET Error:", err); 
        res.status(500).json({ error: "Failed to fetch dates" });
    }
});

router.get("/api/check-conflict", async (req, res) => {
    const { date, venue } = req.query;
    try {
        const sql = "SELECT * FROM dates WHERE dateDate = ? AND dateVenue = ?";
        const [results] = await db.query(sql, [date, venue]);
        if (results.length > 0) {
            return res.json({ conflict: true, event: results[0] });
        }
        res.json({ conflict: false });
    } catch (err) {
        res.status(500).json({ error: "Conflict check failed" });
    }
});

router.post("/api/add-date", isGod, async (req, res) => {
    const d = req.body;
    const dateOwner = req.user.id; 
    try {
        const sql = `
            INSERT INTO dates 
            (dateDate, bandID, dateCity, dateVenue, dateCountry, datePrice, 
             dateCurrency, dateStart, dateLoadin, dateSoundcheck, dateDoors, 
             dateCurfew, dateCategory, dateDescription, dateStatus, dateOwner) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            d.dateDate, d.bandID, d.dateCity, d.dateVenue, d.dateCountry || null,
            d.datePrice || 0, d.dateCurrency, d.dateStart || null, d.dateLoadin || null,
            d.dateSoundcheck || null, d.dateDoors || null, d.dateCurfew || null,
            d.dateCategory || null, d.dateDescription || null, d.dateStatus, dateOwner
        ];
        const [result] = await db.query(sql, values);
        res.json({ success: true, insertId: result.insertId });
    } catch (err) {
        console.error("Add Error:", err);
        res.status(500).json({ error: "Failed to add event" });
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
                t1.dateVenue, t1.dateCity, t1.datePrice, t1.dateDescription,
                b.bandName, b.bandColor, 
                s.statusName, s.statusColor,
                (SELECT COALESCE(SUM(amountEUR), 0) FROM payments WHERE dateID = t1.dateID) AS datePaidAmount
            FROM dates t1
            LEFT JOIN bands b ON t1.bandID = b.bandID
            LEFT JOIN status s ON t1.dateStatus = s.statusID
            LEFT JOIN band_members bm ON t1.bandID = bm.bandID
            WHERE bm.userID = ?
            GROUP BY t1.dateID
            ORDER BY t1.dateDate ASC
        `;

        const [results] = await db.query(sql, [userId]);
        console.log(`Successfully fetched ${results.length} rows for user ${userId}`);
        res.json(results);
    } catch (err) {
        console.error("CALENDAR ROUTE CRASH:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/api/update-date/:id", isGod, async (req, res) => {
  const { id } = req.params;
  const d = req.body;
  try {
      const sql = `
        UPDATE dates SET 
          dateDate = ?, bandID = ?, dateCity = ?, dateVenue = ?, 
          dateCountry = ?, datePrice = ?, dateCurrency = ?, dateStart = ?, 
          dateLoadin = ?, dateSoundcheck = ?, dateDoors = ?, dateCurfew = ?,
          dateCategory = ?, dateContactOrganizer = ?, dateContactTech = ?,
          dateDescription = ?, dateStatus = ?
        WHERE dateID = ?
      `;
      const values = [
        d.dateDate, d.bandID, d.dateCity, d.dateVenue, 
        d.dateCountry || null, d.datePrice, d.dateCurrency, d.dateStart || null, 
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

router.delete("/api/delete-date/:id", isGod, async (req, res) => {
  const { id } = req.params;
  try {
      console.log("Attempting to delete ID:", id);
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
      SELECT t1.*, DATE_FORMAT(t1.dateDate, '%Y-%m-%d') as dateDate, 
      b.bandName, b.bandColor, t3.statusName, t3.statusColor,
      (SELECT COALESCE(SUM(p.amountEUR), 0) FROM payments p WHERE p.dateID = t1.dateID) AS datePaidAmount
      FROM dates t1
      LEFT JOIN bands b ON t1.bandID = b.bandID
      LEFT JOIN status t3 ON t1.dateStatus = t3.statusID
      WHERE t1.dateID = ?
    `;
    const [rows] = await db.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Gig not found" });
    res.json(rows[0]);
} catch (err) {
    res.status(500).json({ error: "Server Error" });
}
});

// ... (The payment routes remain unchanged as they don't query type/band directly)
router.post("/api/dates/pay-single/:id", isGod, async (req, res) => {
    const { id: dateID } = req.params;
    const paymentDate = new Date();
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [gigInfo] = await connection.query(`
            SELECT 
                d.datePrice, 
                d.dateCurrency,
                COALESCE((SELECT SUM(p.amountEUR) FROM payments p WHERE p.dateID = d.dateID), 0) AS totalPaid,
                (SELECT exrateEurToRsd FROM exrate WHERE exrateID = 1) as exrateEurToRsd
            FROM dates d
            WHERE d.dateID = ?
        `, [dateID]);

        if (gigInfo.length === 0) {
            throw new Error("Gig not found.");
        }

        const { datePrice, dateCurrency, totalPaid, exrateEurToRsd } = gigInfo[0];
        const remainingBalance = parseFloat(datePrice) - parseFloat(totalPaid);

        if (remainingBalance <= 0) {
            await connection.rollback();
            return res.status(400).json({ message: "This gig is already fully paid." });
        }

        const amountEUR = remainingBalance;
        const amountOriginal = dateCurrency === 'RSD' ? amountEUR * exrateEurToRsd : amountEUR;

        const insertSql = `
            INSERT INTO payments 
            (dateID, bulkGroup, amountEUR, amountOriginal, currency, exchangeRate, paymentDate) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [dateID, null, amountEUR, amountOriginal, dateCurrency, exrateEurToRsd, paymentDate];
        
        await connection.query(insertSql, values);
        await connection.commit();

        res.json({ success: true, message: `Payment of ${amountEUR.toFixed(2)} EUR for gig ${dateID} processed.` });

    } catch (err) {
        await connection.rollback();
        console.error("Single Pay Error:", err);
        res.status(500).json({ error: "Failed to process single payment." });
    } finally {
        connection.release();
    }
});

router.post("/api/dates/pay-bulk", isGod, async (req, res) => {
    const { payments, currency, exchangeRate } = req.body;
    const paymentDate = new Date();
    const bulkGroup = `bulk_${Date.now()}`;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
        return res.status(400).json({ error: "Invalid payments data provided." });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const payment of payments) {
            const { id: dateID, amount: amountEUR } = payment; 
            
            if (!dateID || amountEUR == null || amountEUR <= 0) continue; 

            const amountOriginal = currency === 'RSD' ? amountEUR * exchangeRate : amountEUR;

            const sql = `
                INSERT INTO payments 
                (dateID, bulkGroup, amountEUR, amountOriginal, currency, exchangeRate, paymentDate) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [dateID, bulkGroup, amountEUR, amountOriginal, currency, exchangeRate, paymentDate];
            await connection.query(sql, values);
        }

        await connection.commit();
        res.json({ success: true, message: `${payments.length} payments processed successfully.` });

    } catch (err) {
        await connection.rollback();
        console.error("Bulk Pay Error:", err);
        res.status(500).json({ error: "A failure occurred while processing bulk payment. The transaction was rolled back." });
    } finally {
        connection.release();
    }
});

module.exports = router;