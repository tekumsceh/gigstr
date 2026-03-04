const express = require('express');
const path = require('path');
const db = require('../config/db'); // Adjust this path if necessary

const app = express();
const PORT = 4001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fetch all venues and how many dates they are used for
app.get('/api/venues', async (req, res) => {
  try {
    const [venues] = await db.query(`
      SELECT 
        v.venueID, 
        v.venueName, 
        v.venueCity, 
        v.venueCountry, 
        COUNT(d.dateID) AS usageCount
      FROM venues v
      LEFT JOIN dates d ON v.venueID = d.venueID
      GROUP BY v.venueID
      ORDER BY v.venueName ASC
    `);
    res.json(venues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database read failed' });
  }
});

// Merge venues based on chronological click order
app.post('/api/venues/merge', async (req, res) => {
  const { selectedIds } = req.body;

  if (!Array.isArray(selectedIds) || selectedIds.length < 2) {
    return res.status(400).json({ error: 'Select at least two venues to merge.' });
  }

  const masterId = selectedIds[0];
  const slaveIds = selectedIds.slice(1);
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Reassign all dates to the Master venue
    await connection.query(
      'UPDATE dates SET venueID = ? WHERE venueID IN (?)',
      [masterId, slaveIds]
    );

    // Delete the duplicate venues
    await connection.query(
      'DELETE FROM venues WHERE venueID IN (?)',
      [slaveIds]
    );

    await connection.commit();
    res.json({ message: `Successfully merged ${slaveIds.length} venues into Master ID ${masterId}.` });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Merge transaction failed.' });
  } finally {
    if (connection) connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`Simple Dedupe tool running at http://localhost:${PORT}`);
});