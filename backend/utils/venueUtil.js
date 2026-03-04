const db = require('../config/db');

async function findOrCreateVenue(venueName, venueCity, venueCountry, venueAddress = null) {
  const [existing] = await db.query(
    'SELECT venueID FROM venues WHERE venueName = ? AND venueCity = ? AND venueCountry = ?',
    [venueName || 'Unknown', venueCity || 'Unknown', venueCountry || '']
  );
  if (existing.length > 0) return existing[0].venueID;
  const [ins] = await db.query(
    'INSERT INTO venues (venueName, venueCity, venueCountry, venueAddress) VALUES (?, ?, ?, ?)',
    [venueName || 'Unknown', venueCity || 'Unknown', venueCountry || '', venueAddress]
  );
  return ins.insertId;
}

module.exports = { findOrCreateVenue };
