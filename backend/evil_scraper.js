const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config(); // Pulls your DB credentials from your .env file

// --- CONFIGURATION ---
// Folders and files we DO NOT want to scrape (to save space and prevent crashes)
const IGNORE_LIST = ['node_modules', '.git', '.env', 'package-lock.json', 'dist', 'public'];
const ROOT_DIR = path.join(__dirname, '..'); // Points to the main gigstr folder
const OUTPUT_FILE = path.join(__dirname, 'ultimate_context.txt');

// --- 1. THE FILE SCRAPER ---
async function scrapeFiles(dir, fileList = []) {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
        if (IGNORE_LIST.includes(file)) continue; // Skip the heavy/secret stuff
        
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
            await scrapeFiles(filePath, fileList);
        } else {
            // Only grab text-based files, skip images/fonts
            if (file.match(/\.(js|jsx|json|html|css|txt|md)$/)) {
                const content = await fs.readFile(filePath, 'utf-8');
                fileList.push(`\n\n========== FILE: ${filePath.replace(ROOT_DIR, '')} ==========\n`);
                fileList.push(content);
            }
        }
    }
    return fileList.join('');
}

// --- 2. THE DATABASE SCRAPER ---
async function scrapeDatabase() {
    let dbOutput = "\n\n========== DATABASE SCHEMA & DATA ==========\n";
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gigstr'
        });

        // Get all tables
        const [tables] = await connection.query('SHOW TABLES');
        const tableKey = `Tables_in_${process.env.DB_NAME || 'gigstr'}`;

        for (const row of tables) {
            const tableName = row[tableKey];
            dbOutput += `\n--- TABLE: ${tableName} ---\n`;
            
            // Get all data as JSON
            const [data] = await connection.query(`SELECT * FROM ${tableName}`);
            dbOutput += JSON.stringify(data, null, 2) + "\n";
        }
        
        await connection.end();
        return dbOutput;
    } catch (err) {
        return `\n\n[DATABASE SCRAPE FAILED]: ${err.message}\n`;
    }
}

// --- 3. THE EXECUTION ---
async function executeEvilPlan() {
    console.log("Initiating evil sequence...");
    
    console.log("1. Scraping codebase...");
    const codebaseText = await scrapeFiles(ROOT_DIR);
    
    console.log("2. Scraping database...");
    const databaseText = await scrapeDatabase();
    
    console.log("3. Combining and writing to file...");
    const finalOutput = `GIGSTR MASTER CONTEXT DUMP\nDate: ${new Date().toISOString()}\n\n` + codebaseText + databaseText;
    
    await fs.writeFile(OUTPUT_FILE, finalOutput);
    
    console.log(`\nSUCCESS! Your weapon is ready at: ${OUTPUT_FILE}`);
}

executeEvilPlan();