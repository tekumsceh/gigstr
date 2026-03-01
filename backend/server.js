require('dotenv').config();
require('./auth'); 

const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bandRoutes = require('./routes/bandRoutes');
const venueRoutes = require('./routes/venueRoutes');
const express = require('express');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 5000;
const db = require('./config/db');
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({}, db);


// --- 1. MIDDLEWARE ---
app.use(cors({
    origin: process.env.CLIENT_URL || (process.env.NODE_ENV !== 'production' ? true : undefined),
    credentials: true 
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // <-- THIS IS THE MAGIC LINE
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7 // Keeps you logged in for 1 week
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use('/', authRoutes);
app.use('/', eventRoutes);
app.use('/', bandRoutes);
app.use('/', venueRoutes);

const isGod = (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized: Please log in." });
    if (req.user.role !== 'GOD') return res.status(403).json({ error: "Forbidden: You do not have Divine authority." });
    next(); 
};
// --- 3. HELPER FUNCTIONS ---
const syncExchangeRate = async () => {
    console.log("--- Starting Exchange Rate Sync ---");
    try {
        const response = await fetch("https://kurs.resenje.org/api/v1/currencies/eur/rates/today");
        if (!response.ok) throw new Error(`API Status: ${response.status}`);
        
        const data = await response.json();
        const eurToRsd = parseFloat(data.exchange_middle);
        
        if (!eurToRsd || isNaN(eurToRsd)) throw new Error("Invalid rate data.");

        const rsdToEur = 1 / eurToRsd;
        const updatedAt = new Date();

        const sql = `UPDATE exrate SET exrateEurToRsd = ?, exrateRsdToEur = ?, exrateUpdated = ? WHERE exrateID = 1`;
        await db.query(sql, [eurToRsd, rsdToEur, updatedAt]);
        console.log(`✅ Success: 1€ = ${eurToRsd.toFixed(4)} RSD`);

    } catch (error) {
        console.error("❌ Sync Error:", error.message);
    }
};

cron.schedule('5 18 * * *', syncExchangeRate);

// --- 4. GET ROUTES ---
app.get("/api/valet-master-package", async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const gigsSql = `
            SELECT d.dateID, v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry,
            DATE_FORMAT(d.dateDate, '%Y-%m-%d') as dateDate, 
            d.datePrice, d.bandID, t.bandName, 
            COALESCE(SUM(p.amountEur), 0) AS totalPaid,
            (d.datePrice - COALESCE(SUM(p.amountEur), 0)) AS remainingBalance
            FROM dates d
            LEFT JOIN venues v ON d.venueID = v.venueID
            LEFT JOIN type t ON d.bandID = t.typeID
            LEFT JOIN payments p ON d.dateID = p.dateID
            WHERE d.dateDate <= ?
            GROUP BY d.dateID
            HAVING remainingBalance > 0.01
            ORDER BY d.dateDate ASC
        `;
        const [gigs] = await db.query(gigsSql, [today]);
        const [rates] = await db.query("SELECT * FROM exrate WHERE exrateID = 1");
        const [yearRows] = await db.query(`SELECT DISTINCT YEAR(dateDate) as year FROM dates ORDER BY year DESC`);
        const [types] = await db.query("SELECT typeID, bandName FROM type");

        res.json({ 
            gigs, 
            rate: rates[0] || { exrateEurToRsd: 117.3 }, 
            options: { bandID: types, years: yearRows.map(y => y.year) } 
        });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// --- 5. POST / PUT ROUTES ---

app.get("/api/statuses", async (req, res) => { 
    try {
        const [results] = await db.query("SELECT * FROM status");
        res.json(results);
    } catch (err) { res.status(500).send(err); }
});

app.get("/api/types", async (req, res) => { 
    try {
        const [results] = await db.query("SELECT * FROM type");
        res.json(results);
    } catch (err) { res.status(500).send(err); }
});

app.get('/api/rates', async (req, res) => {
    try {
        const [results] = await db.query("SELECT exrateEurToRsd FROM exrate WHERE exrateID = 1");
        if (!results.length) return res.json({ exrateEurToRsd: 117.3 });
        res.json(results[0]);
    } catch (err) { res.status(500).send(err); }
});




app.get("/", (req, res) => res.send("Gigstr Backend Live"));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server live at http://127.0.0.1:${PORT}`);
  console.log(`Network: http://<your-ip>:${PORT} (for API proxy via Vite)`);
});