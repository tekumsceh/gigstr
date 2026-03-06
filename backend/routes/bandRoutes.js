const express = require('express');
const db = require('../config/db');
const router = express.Router();

// Middleware to check if the user is authenticated.
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "You must be logged in to perform this action." });
};

/**
 * @route   POST /api/bands
 * @desc    Creates a new band and sets the creator as the owner
 */
router.post("/api/bands", isAuthenticated, async (req, res) => {
    const { bandName, bandColor } = req.body;
    const creatorId = req.user.userID; 

    if (!bandName || bandName.trim() === '') {
        return res.status(400).json({ message: "Band name cannot be empty." });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [bandResult] = await connection.execute(
            "INSERT INTO bands (bandName, bandColor, createdBy) VALUES (?, ?, ?)",
            [bandName.trim(), bandColor, creatorId]
        );
        const bandId = bandResult.insertId;

        // The creator is automatically an active owner
        await connection.execute(
            "INSERT INTO band_members (bandID, userID, role, status) VALUES (?, ?, ?, 'active')",
            [bandId, creatorId, 'owner']
        );

        await connection.commit();

        res.status(201).json({
            message: "Band created successfully!",
            band: {
                bandID: bandId,
                bandName: bandName.trim(),
                bandColor: bandColor,
                createdBy: creatorId,
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating band:", error);
        res.status(500).json({ message: "Failed to create band due to a server error." });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @route   GET /api/my-bands
 * @desc    Returns all active bands the current user is a member of
 */
router.get("/api/my-bands", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.userID || req.user.id; 
        const sql = `
            SELECT b.bandID, b.bandName, b.bandColor, b.isSolo 
            FROM bands b
            JOIN band_members bm ON b.bandID = bm.bandID
            WHERE bm.userID = ? AND bm.status = 'active'
        `;
        const [bands] = await db.query(sql, [userId]);
        res.json(bands);
    } catch (err) {
        console.error("Error fetching user bands:", err);
        res.status(500).json({ error: "Failed to fetch authorized bands" });
    }
});

router.get("/api/dashboard-data", isAuthenticated, async (req, res) => {
    const userId = req.user.userID || req.user.id;

    try {
        // FIXED: Now fetches dates for standard bands OR the user's Solo band
        const datesSql = `
            SELECT 
                t1.dateID, 
                DATE_FORMAT(t1.dateDate, '%Y-%m-%d') as dateDate, 
                v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry,
                t1.datePrice, t1.dateDescription,
                b.bandID, b.bandName, b.bandColor, 
                s.statusName, s.statusColor,
                COALESCE((SELECT SUM(amountEUR) FROM payments WHERE dateID = t1.dateID), 0) AS datePaidAmount
            FROM dates t1
            LEFT JOIN venues v ON t1.venueID = v.venueID
            LEFT JOIN bands b ON t1.bandID = b.bandID
            LEFT JOIN status s ON t1.dateStatus = s.statusID
            LEFT JOIN band_members bm ON t1.bandID = bm.bandID AND bm.userID = ?
            WHERE bm.userID = ? OR (b.createdBy = ? AND b.isSolo = 1)
            GROUP BY t1.dateID
            ORDER BY t1.dateDate ASC
        `;

        // FIXED: Now fetches standard bands OR the user's Solo band
        const bandsSql = `
            SELECT b.bandID, b.bandName, b.bandColor, b.isSolo, bm.role 
            FROM bands b
            LEFT JOIN band_members bm ON b.bandID = bm.bandID AND bm.userID = ?
            WHERE bm.userID = ? OR (b.createdBy = ? AND b.isSolo = 1)
        `;

        const invitesSql = `
            SELECT b.bandID, b.bandName 
            FROM bands b
            JOIN band_members bm ON b.bandID = bm.bandID
            WHERE bm.userID = ? AND bm.status = 'pending'
        `;

        // Run all three queries simultaneously for maximum speed
        // Notice the exact matching of [userId, userId, userId] arrays
        const [dates, bands, invites] = await Promise.all([
            db.query(datesSql, [userId, userId, userId]),
            db.query(bandsSql, [userId, userId, userId]),
            db.query(invitesSql, [userId])
        ]);

        res.json({
            calendarDates: dates[0],
            bands: bands[0],
            invites: invites[0]
        });

    } catch (err) {
        console.error("Dashboard Data Error:", err);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

// --- INVITATION ROUTES ---

// GET /api/my-invites - Fetch pending invites for the dashboard
router.get("/api/my-invites", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.userID || req.user.id;
        const sql = `
            SELECT b.bandID, b.bandName, b.bandColor, bm.role, bm.status
            FROM band_members bm
            JOIN bands b ON bm.bandID = b.bandID
            WHERE bm.userID = ? AND bm.status = 'pending'
        `;
        const [invites] = await db.query(sql, [userId]);
        res.json(invites);
    } catch (err) {
        console.error("Invites Error:", err);
        res.status(500).json({ error: "Failed to fetch invites" });
    }
});

// POST /api/invites/respond - Accept or Decline an invite
router.post("/api/invites/respond", isAuthenticated, async (req, res) => {
    const { bandID, status } = req.body; 
    const userId = req.user.userID || req.user.id;

    try {
        if (status === 'active') {
            await db.query(
                "UPDATE band_members SET status = 'active' WHERE bandID = ? AND userID = ?",
                [bandID, userId]
            );
        } else {
            // If declined, simply remove the pending record
            await db.query(
                "DELETE FROM band_members WHERE bandID = ? AND userID = ?",
                [bandID, userId]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Invite Response Error:", err);
        res.status(500).json({ error: "Failed to update invitation" });
    }
});

// --- COMMAND CENTER ROUTES ---

// GET /api/bands/:id - Fetch basic band info for the header
router.get('/api/bands/:id', isAuthenticated, async (req, res) => {
    try {
        const [bands] = await db.query(
            'SELECT bandID, bandName, bandColor FROM bands WHERE bandID = ?', 
            [req.params.id]
        );
        if (bands.length === 0) return res.status(404).json({ error: "Band not found" });
        res.json(bands[0]);
    } catch (err) {
        console.error("Error fetching band details:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /api/band/:bandID/roster - Fetch the Roster (Consolidated and fixed)
router.get("/api/band/:bandID/roster", isAuthenticated, async (req, res) => {
    const { bandID } = req.params;
    try {
        const sql = `
            SELECT u.userID AS id, u.displayName, u.email, bm.role, bm.status
            FROM band_members bm
            JOIN users u ON bm.userID = u.userID
            WHERE bm.bandID = ?
            ORDER BY bm.status = 'pending' ASC, bm.role = 'owner' DESC, u.displayName ASC
        `;
        const [roster] = await db.query(sql, [bandID]);
        res.json(roster);
    } catch (err) {
        console.error("Roster Fetch Error:", err); 
        res.status(500).json({ error: "Failed to fetch roster" });
    }
});

// POST /api/bands/:id/members - Add a new member (Invite)
router.post('/api/bands/:id/members', isAuthenticated, async (req, res) => {
    const { email, role } = req.body;
    const bandId = req.params.id;

    try {
        const [users] = await db.query('SELECT userID FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: "No user found with that email." });
        }
        
        const newUserId = users[0].userID;
        const [existing] = await db.query(
            'SELECT * FROM band_members WHERE bandID = ? AND userID = ?', 
            [bandId, newUserId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: "User is already in this band or has a pending invite." });
        }

        // Explicitly set status to 'pending' upon invite
        await db.query(
            "INSERT INTO band_members (bandID, userID, role, status) VALUES (?, ?, ?, 'pending')", 
            [bandId, newUserId, role]
        );

        res.json({ success: true, message: "Member invited successfully." });
    } catch (err) {
        console.error("Error adding member:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE /api/bands/:id/members/:userId - Remove a member or cancel invite
router.delete('/api/bands/:id/members/:userId', isAuthenticated, async (req, res) => {
    try {
        const bandId = req.params.id;
        const targetUserId = req.params.userId;
        const requesterId = req.user.userID || req.user.id;

        // 1. SECURITY CHECK: Does the requester have permission?
        const [requesterCheck] = await db.query(
            "SELECT role FROM band_members WHERE bandID = ? AND userID = ?",
            [bandId, requesterId]
        );

        if (requesterCheck.length === 0 || (requesterCheck[0].role !== 'owner' && requesterCheck[0].role !== 'admin')) {
            console.warn(`[SECURITY] User ${requesterId} tried to illegally remove a member from Band ${bandId}`);
            return res.status(403).json({ error: "Unauthorized: Only Admins or Owners can remove members." });
        }

        // Prevent Admins from deleting Owners
        if (requesterCheck[0].role === 'admin') {
            const [targetCheck] = await db.query(
                "SELECT role FROM band_members WHERE bandID = ? AND userID = ?",
                [bandId, targetUserId]
            );
            if (targetCheck.length > 0 && targetCheck[0].role === 'owner') {
                return res.status(403).json({ error: "Admins cannot remove Owners." });
            }
        }

        // 2. Execution
        await db.query(
            'DELETE FROM band_members WHERE bandID = ? AND userID = ?',
            [bandId, targetUserId]
        );
        res.json({ success: true });
        
    } catch (err) {
        console.error("Error removing member:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;