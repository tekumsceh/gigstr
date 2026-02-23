const express = require('express');
const passport = require('passport');
const router = express.Router();

// 1. Start Google Login
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google Callback
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login` }),
    (req, res) => res.redirect(`${process.env.CLIENT_URL}/`) // Drop safely on Home
);

// 3. Check current user (Used by React AuthContext)
router.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
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

module.exports = router;