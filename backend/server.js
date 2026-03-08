require('dotenv').config();
require('./auth'); 

const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bandRoutes = require('./routes/bandRoutes');
const venueRoutes = require('./routes/venueRoutes');
const financeRoutes = require('./routes/financeRoutes');
const translationRoutes = require('./routes/translationRoutes');
const financeClient = require('./services/financeClient');
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

// Register before routers so they are always reachable (avoids router precedence issues)
app.get('/api/health', (req, res) => res.json({ ok: true, message: 'Gigstr API', port: process.env.PORT || 5000 }));
app.get('/api/band-admin-ping', (req, res) => res.json({ ok: true, message: 'Band admin routes available' }));

app.use('/', authRoutes);
app.use('/', eventRoutes);
app.use('/', bandRoutes);
app.use('/', venueRoutes);
app.use('/', financeRoutes);
app.use('/', translationRoutes);

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
        if (!financeClient.enabled()) {
            return res.status(503).json({ error: 'Finance service is required.' });
        }
        const today = new Date().toISOString().split('T')[0];
        const baseSql = `
            SELECT d.dateID, v.venueName as dateVenue, v.venueCity as dateCity, v.venueCountry as dateCountry,
            DATE_FORMAT(d.dateDate, '%Y-%m-%d') as dateDate, d.bandID, t.bandName
            FROM dates d
            LEFT JOIN venues v ON d.venueID = v.venueID
            LEFT JOIN type t ON d.bandID = t.typeID
            WHERE d.dateDate <= ?
            ORDER BY d.dateDate ASC
        `;
        const rows = (await db.query(baseSql, [today]))[0];
        const summary = rows.length > 0 ? await financeClient.summaryForDates(rows.map((g) => g.dateID)) : {};
        const gigs = rows
            .map((g) => {
                const s = summary[g.dateID];
                if (!s) return null;
                const totalPaid = s.totalPaid ?? 0;
                const remainingBalance = s.gross - totalPaid;
                if (remainingBalance <= 0.01) return null;
                return { ...g, datePrice: s.gross, totalPaid, remainingBalance };
            })
            .filter(Boolean);
        const [rates] = await db.query("SELECT * FROM exrate WHERE exrateID = 1");
        const [yearRows] = await db.query(`SELECT DISTINCT YEAR(dateDate) as year FROM dates ORDER BY year DESC`);
        const [types] = await db.query("SELECT typeID, bandName FROM type");
        res.json({
            gigs,
            rate: rates[0] || { exrateEurToRsd: 117.3 },
            options: { bandID: types, years: yearRows.map((y) => y.year) }
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