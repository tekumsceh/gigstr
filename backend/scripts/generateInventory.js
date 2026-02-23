const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gigstr'
};

async function generateInventory() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database [" + dbConfig.database + "]. Mapping schema...");

        // 1. Get ALL columns with exact casing
        const [columns] = await connection.query(`
            SELECT 
                TABLE_NAME as tableName, 
                COLUMN_NAME as columnName, 
                DATA_TYPE as dataType, 
                IS_NULLABLE as isNullable
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            ORDER BY TABLE_NAME, ORDINAL_POSITION`, [dbConfig.database]);

        // 2. Get Foreign Key Relationships with exact casing
        const [fks] = await connection.query(`
            SELECT 
                TABLE_NAME as tableName, 
                COLUMN_NAME as columnName, 
                REFERENCED_TABLE_NAME as refTable, 
                REFERENCED_COLUMN_NAME as refColumn
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`, [dbConfig.database]);

        const inventory = {};

        // 3. Process Columns
        columns.forEach(col => {
            if (!inventory[col.tableName]) {
                inventory[col.tableName] = {
                    columns: {},
                    relationships: []
                };
            }

            let suggestedType = "Search"; 
            const type = col.dataType.toLowerCase();
            
            if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
                suggestedType = "Range";
            } else if (type.includes('int') || type.includes('decimal') || type.includes('float')) {
                suggestedType = "Range";
            } else if (col.columnName.toLowerCase().startsWith('is') || type === 'tinyint') {
                suggestedType = "By";
            }

            inventory[col.tableName].columns[col.columnName] = {
                type: col.dataType,
                suggestedFilter: suggestedType,
                isNullable: col.isNullable === 'YES'
            };
        });

        // 4. Process Relationships
        fks.forEach(fk => {
            if (inventory[fk.tableName]) {
                inventory[fk.tableName].relationships.push({
                    column: fk.columnName,
                    references: fk.refTable,
                    refColumn: fk.refColumn
                });
                
                inventory[fk.tableName].columns[fk.columnName].suggestedFilter = "By";
                inventory[fk.tableName].columns[fk.columnName].sourceTable = fk.refTable;
            }
        });

        // 5. Define Paths and Save Copies
        const jsonContent = JSON.stringify(inventory, null, 2);
        
        const backendPath = path.join(__dirname, '../db_inventory.json');
        const frontendPath = path.join(__dirname, '../../src/db_inventory.json');

        fs.writeFileSync(backendPath, jsonContent);
        console.log("Success: Backend inventory saved to " + backendPath);

        // Ensure frontend directory exists before saving
        const frontendDir = path.dirname(frontendPath);
        if (fs.existsSync(frontendDir)) {
            fs.writeFileSync(frontendPath, jsonContent);
            console.log("Success: Frontend inventory saved to " + frontendPath);
        } else {
            console.log("Warning: Frontend src directory not found. Skipping second copy.");
        }

    } catch (err) {
        console.error("Error during schema mapping: " + err.message);
    } finally {
        if (connection) await connection.end();
    }
}

generateInventory();