const express = require('express');
const router = express.Router();
const db = require('../config/db');

// List all venues
router.get('/api/venues', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT venueID, venueName, venueCity, venueCountry, venueAddress FROM venues ORDER BY venueCountry, venueCity, venueName'
    );
    res.json(rows);
  } catch (err) {
    console.error('Venues GET Error:', err);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Search venues by name (autocomplete) - returns matches for venueName, venueCity, or venueCountry
router.get('/api/venues/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.json([]);
  }
  try {
    const term = `%${q.trim()}%`;
    const [rows] = await db.query(
      `SELECT venueID, venueName, venueCity, venueCountry, venueAddress 
       FROM venues 
       WHERE venueName LIKE ? OR venueCity LIKE ? OR venueCountry LIKE ?
       ORDER BY venueName ASC
       LIMIT 10`,
      [term, term, term]
    );
    res.json(rows);
  } catch (err) {
    console.error('Venues search error:', err);
    res.status(500).json({ error: 'Failed to search venues' });
  }
});

module.exports = router;
