const express = require('express');
const db = require('../config/db');
const router = express.Router();

// Middleware to check if the user is authenticated.
// passport.js adds the isAuthenticated() method to the request object.
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "You must be logged in to perform this action." });
};

/**
 * @route   POST /api/bands
 * @desc    Creates a new band and sets the creator as the owner
 * @access  Private
 */
router.post("/api/bands", isAuthenticated, async (req, res) => {
    // Destructure both bandName and bandColor from the request body
    const { bandName, bandColor } = req.body;
    
    // The passport session stores the logged-in user's info in req.user
    const creatorId = req.user.userID; 

    if (!bandName || bandName.trim() === '') {
        return res.status(400).json({ message: "Band name cannot be empty." });
    }

    let connection;
    try {
        // Get a connection from the pool to run a transaction
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Step 1: Create the band in the 'bands' table, now including the bandColor
        const [bandResult] = await connection.execute(
            "INSERT INTO bands (bandName, bandColor, createdBy) VALUES (?, ?, ?)",
            [bandName.trim(), bandColor, creatorId] // Add bandColor to the query parameters
        );
        const bandId = bandResult.insertId;

        // Step 2: Add the creator to the 'band_members' table as the 'owner'
        await connection.execute(
            "INSERT INTO band_members (bandID, userID, role) VALUES (?, ?, ?)",
            [bandId, creatorId, 'owner']
        );

        // If both inserts are successful, commit the transaction
        await connection.commit();

        // Return the full band object, including the color
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
        // If any error occurs, roll back the transaction
        if (connection) {
            await connection.rollback();
        }
        console.error("Error creating band:", error);
        res.status(500).json({ message: "Failed to create band due to a server error." });
    } finally {
        // Finally, always release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
});
router.get("/api/my-bands", async (req, res) => {
    try {
        // Use the ID from the passport session
        const userId = req.user.userID; 
        
        const sql = `
            SELECT b.bandID, b.bandName, b.bandColor, b.isSolo 
            FROM bands b
            JOIN band_members bm ON b.bandID = bm.bandID
            WHERE bm.userID = ?
        `;

        const [bands] = await db.query(sql, [userId]);
        res.json(bands);
    } catch (err) {
        console.error("Error fetching user bands:", err);
        res.status(500).json({ error: "Failed to fetch authorized bands" });
    }
});

module.exports = router;
