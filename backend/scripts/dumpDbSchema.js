require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const db = require('../config/db');

async function main() {
  try {
    // Figure out which database we are connected to
    const [dbRows] = await db.query('SELECT DATABASE() AS db');
    const dbName = dbRows[0]?.db || process.env.DB_NAME || 'gigstr';

    const schema = {
      generatedAt: new Date().toISOString(),
      database: dbName,
      tables: {}
    };

    // Get all tables in the current database
    const [tables] = await db.query(
      `SELECT TABLE_NAME 
       FROM information_schema.tables 
       WHERE table_schema = ? 
       ORDER BY TABLE_NAME`,
      [dbName]
    );

    for (const row of tables) {
      const tableName = row.TABLE_NAME || row.table_name;
      if (!tableName) continue;

      // Columns
      const [columns] = await db.query(
        `SELECT 
           COLUMN_NAME,
           DATA_TYPE,
           COLUMN_TYPE,
           IS_NULLABLE,
           COLUMN_DEFAULT,
           COLUMN_KEY,
           EXTRA
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ORDINAL_POSITION`,
        [dbName, tableName]
      );

      // Indexes
      const [indexes] = await db.query(`SHOW INDEX FROM \`${tableName}\``);

      // Foreign keys
      const [foreignKeys] = await db.query(
        `SELECT 
           CONSTRAINT_NAME,
           COLUMN_NAME,
           REFERENCED_TABLE_NAME,
           REFERENCED_COLUMN_NAME
         FROM information_schema.key_column_usage
         WHERE table_schema = ? 
           AND table_name = ? 
           AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY CONSTRAINT_NAME, COLUMN_NAME`,
        [dbName, tableName]
      );

      schema.tables[tableName] = {
        columns,
        indexes,
        foreignKeys
      };
    }

    const outPath = path.join(__dirname, '..', 'db_schema_snapshot.json');
    await fs.writeFile(outPath, JSON.stringify(schema, null, 2), 'utf8');

    console.log(`✅ DB schema snapshot written to: ${outPath}`);
    console.log(`Database: ${dbName}`);
    console.log(`Tables: ${Object.keys(schema.tables).length}`);
  } catch (err) {
    console.error('❌ Error dumping DB schema:', err);
    process.exitCode = 1;
  } finally {
    // Close the connection pool cleanly
    try {
      if (db && typeof db.end === 'function') {
        await db.end();
      }
    } catch (e) {
      // ignore
    }
  }
}

main();

