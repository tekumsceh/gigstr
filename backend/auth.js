const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});


// Put your actual Gmail address here
const GOD_EMAIL = process.env.ADMIN_EMAIL;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const picture = profile.photos[0].value;
        const displayName = profile.displayName;

        // 1. Check if user exists
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE googleId = ? OR email = ?", 
            [googleId, email]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            await db.execute("UPDATE users SET picture = ? WHERE userID = ?", [picture, user.userID]);
            user.picture = picture; 
            return done(null, user);
        }

        // 2. NEW USER BIRTH CANAL
        const role = (email === process.env.ADMIN_EMAIL) ? 'GOD' : 'musician';
        
        // Create the User
        const [result] = await db.execute(
            "INSERT INTO users (googleId, email, displayName, role, picture) VALUES (?, ?, ?, ?, ?)",
            [googleId, email, displayName, role, picture]
        );
        const userId = result.insertId;

        // --- AUTOMAGICAL SOLO BAND SETUP ---
        // Create the Ghost Band (isSolo = 1)
        const [bandResult] = await db.execute(
            "INSERT INTO bands (bandName, bandColor, createdBy, isSolo) VALUES (?, ?, ?, 1)",
            [`${displayName} (Solo)`, '#999999', userId]
        );
        const bandId = bandResult.insertId;

        // Link the user as the Admin of their new Solo Project
        await db.execute(
            "INSERT INTO band_members (bandID, userID, role) VALUES (?, ?, 'admin')",
            [bandId, userId]
        );

        // Fetch the final user object to return to the session
        const [newUserRows] = await db.execute("SELECT * FROM users WHERE userID = ?", [userId]);
        return done(null, newUserRows[0]);

    } catch (err) {
        console.error("Auth Error:", err);
        return done(err, null);
    }
  }
));

// These tell Passport how to keep you logged in (sessions)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
