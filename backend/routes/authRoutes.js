const express = require('express');
const passport = require('passport');
const router = express.Router();
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "Not authenticated" });
};
const db = require('../config/db'); 

// 1. Start Google Login
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google Callback
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login` }),
    (req, res) => res.redirect(`${process.env.CLIENT_URL}/`) // Drop safely on Home
);

// 3. Check current user (Used by React AuthContext)
router.get('/api/me', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            // Fetch the user's band memberships and roles
            const [bands] = await db.query(`
                SELECT bm.bandID, bm.role, b.bandName, b.bandColor
                FROM band_members bm
                JOIN bands b ON bm.bandID = b.bandID
                WHERE bm.userID = ?
            `, [req.user.userID]);

            // Send both the Passport user info AND the band info to React
            res.json({
                user: req.user,
                bands: bands
            });
        } catch (error) {
            console.error("Error fetching user bands:", error);
            // Fallback: If DB fails, still send the user so the app doesn't crash
            res.json({ user: req.user, bands: [] });
        }
    } else {
        res.status(401).json({ error: "Not authenticated" });
    }
});

// 4. Logout
router.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect(`${process.env.CLIENT_URL}/login`);
    });
});
router.get('/api/users/search', isAuthenticated, async (req, res) => {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json([]);

    try {
        // Search by name or email, limit to 5 results for speed
        const [users] = await db.query(
            'SELECT userID, displayName, email, picture FROM users WHERE displayName LIKE ? OR email LIKE ? LIMIT 5',
            [`%${query}%`, `%${query}%`]
        );
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

module.exports = router;