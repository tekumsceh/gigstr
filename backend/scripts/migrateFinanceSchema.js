require('dotenv').config();

const db = require('../config/db');

async function getCurrentDbName() {
  const [rows] = await db.query('SELECT DATABASE() AS db');
  return rows[0]?.db || process.env.DB_NAME || 'gigstr';
}

async function ensureFinancesLedger(dbName) {
  console.log('--- Step 1: Ensure finances_ledger table exists ---');

  const [tables] = await db.query(
    `SELECT TABLE_NAME 
     FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = 'finances_ledger'`,
    [dbName]
  );

  if (tables.length > 0) {
    console.log('finances_ledger already exists. Skipping CREATE TABLE.');
    return;
  }

  const createSql = `
    CREATE TABLE finances_ledger (
      ledgerID     INT AUTO_INCREMENT PRIMARY KEY,
      dateID       INT NOT NULL,
      bandID       INT NULL,
      targetUserID INT NULL,
      category     ENUM('expense','payout','band_fund') NOT NULL,
      label        VARCHAR(255) NOT NULL,
      amount       DECIMAL(10,2) NOT NULL,
      status       ENUM('draft','published','paid') NOT NULL DEFAULT 'draft',
      settlementID INT NULL,
      createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

      KEY idx_fin_ledger_date (dateID),
      KEY idx_fin_ledger_band (bandID),
      KEY idx_fin_ledger_user (targetUserID),

      CONSTRAINT fk_fin_ledger_date
        FOREIGN KEY (dateID) REFERENCES dates(dateID)
        ON DELETE RESTRICT,

      CONSTRAINT fk_fin_ledger_band
        FOREIGN KEY (bandID) REFERENCES bands(bandID)
        ON DELETE RESTRICT,

      CONSTRAINT fk_fin_ledger_user
        FOREIGN KEY (targetUserID) REFERENCES users(userID)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await db.query(createSql);
  console.log('✅ Created finances_ledger table.');
}

async function ensureNotificationsTable(dbName) {
  console.log('--- Step 2: Ensure notifications table exists ---');

  const [tables] = await db.query(
    `SELECT TABLE_NAME 
     FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = 'notifications'`,
    [dbName]
  );

  if (tables.length > 0) {
    console.log('notifications table already exists. Skipping CREATE TABLE.');
    return;
  }

  const createSql = `
    CREATE TABLE notifications (
      notificationID INT AUTO_INCREMENT PRIMARY KEY,
      userID         INT NOT NULL,
      type           VARCHAR(50) NOT NULL,
      title          VARCHAR(255) NULL,
      body           TEXT NULL,
      payload        JSON NULL,
      isRead         TINYINT(1) NOT NULL DEFAULT 0,
      createdAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      readAt         DATETIME NULL,

      KEY idx_notifications_user (userID),
      CONSTRAINT fk_notifications_user
        FOREIGN KEY (userID) REFERENCES users(userID)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await db.query(createSql);
  console.log('✅ Created notifications table.');
}

async function hardenPaymentsDateId(dbName) {
  console.log('--- Step 3: Harden payments.dateID (NOT NULL + RESTRICT) ---');

  // Check that payments table exists
  const [tables] = await db.query(
    `SELECT TABLE_NAME 
     FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = 'payments'`,
    [dbName]
  );

  if (tables.length === 0) {
    console.log('payments table does not exist. Skipping payments migration.');
    return;
  }

  // Inspect current nullability
  const [cols] = await db.query(
    `SELECT IS_NULLABLE 
     FROM information_schema.columns
     WHERE table_schema = ? 
       AND table_name = 'payments'
       AND column_name = 'dateID'`,
    [dbName]
  );

  const isNullable = cols[0]?.IS_NULLABLE === 'YES';

  // Check for any NULL dateID rows
  const [nullCountRows] = await db.query(
    'SELECT COUNT(*) AS cnt FROM payments WHERE dateID IS NULL'
  );
  const nullCount = nullCountRows[0]?.cnt || 0;

  if (nullCount > 0) {
    console.warn(
      `⚠️ Found ${nullCount} payments rows with NULL dateID. ` +
      'Skipping NOT NULL enforcement for now. Please fix these rows manually ' +
      'and rerun this script if you want dateID to be strictly NOT NULL.'
    );
  } else if (isNullable) {
    console.log('Updating payments.dateID to NOT NULL...');
    await db.query('ALTER TABLE payments MODIFY COLUMN dateID INT NOT NULL');
    console.log('✅ payments.dateID is now NOT NULL.');
  } else {
    console.log('payments.dateID is already NOT NULL.');
  }

  // Recreate FK with explicit ON DELETE RESTRICT (even if it is already RESTRICT by default)
  console.log('Ensuring fk_payments_date uses ON DELETE RESTRICT...');

  // Drop existing FK if present
  const [fks] = await db.query(
    `SELECT CONSTRAINT_NAME 
     FROM information_schema.key_column_usage
     WHERE table_schema = ?
       AND table_name = 'payments'
       AND column_name = 'dateID'
       AND referenced_table_name = 'dates'`,
    [dbName]
  );

  const hasFk = fks.some((fk) => fk.CONSTRAINT_NAME === 'fk_payments_date');

  if (hasFk) {
    await db.query('ALTER TABLE payments DROP FOREIGN KEY fk_payments_date');
  }

  await db.query(
    `ALTER TABLE payments
       ADD CONSTRAINT fk_payments_date
       FOREIGN KEY (dateID) REFERENCES dates(dateID)
       ON DELETE RESTRICT`
  );

  console.log('✅ fk_payments_date now explicitly uses ON DELETE RESTRICT.');
}

async function main() {
  try {
    const dbName = await getCurrentDbName();
    console.log(`Using database: ${dbName}`);

    await ensureFinancesLedger(dbName);
    await ensureNotificationsTable(dbName);
    await hardenPaymentsDateId(dbName);

    console.log('🎉 Finance schema migration complete.');
  } catch (err) {
    console.error('❌ Finance schema migration failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      if (db && typeof db.end === 'function') {
        await db.end();
      }
    } catch {
      // ignore
    }
  }
}

main();

