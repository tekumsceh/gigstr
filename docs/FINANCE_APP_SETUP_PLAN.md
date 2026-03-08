# Finance app setup plan: separate app, separate DB, called only by Gigstr

## 1. Your approach (validated)

- **New root-level folder** for the finance app, **sibling to the Gigstr app** (e.g. `gigstr/` and `gigstr-finance/` under a common parent). Nothing inside the finance app mixes with Gigstr code; the only link is **Gigstr calls Finance, Finance returns data**.
- **New, separate database** for the finance app. Gigstr keeps its DB for dates, bands, users, venues, etc.; finance app has its own DB for band account, personal account, and reference copies (or event stream) it needs.
- **Copy required existing data** from Gigstr DB into the finance DB so the finance app can work without querying Gigstr’s DB. After that, **Gigstr notifies Finance** when new dates/bands/users are created so Finance stays in sync (or Finance pulls on demand—see below).
- **Access:** Only logged-in users reach finance **via the main app**. The finance app is **not** exposed to the public; only the Gigstr backend (or browser with a Gigstr-issued token) talks to it.

This is a good start. Below is a concrete plan and the recommended way to do it.

---

## 2. Recommended layout and access model

### 2.1 Folder structure — completely separate apps

The finance app is **fully separate** from Gigstr: same level under a common parent, no shared code or imports.

```
parent/
|
|__ gigstr/                  # main app (dates, bands, users, calendar)
|      (backend, src, ...)
|
|__ gigstr-finance/          # finance app (band account, personal account, ledger)
       (its own backend, its own package.json, its own DB — no Gigstr code inside)
```

- **parent** — e.g. your repo root, or `htdocs`, or `projects`. You open one workspace for Gigstr, a different one for the finance app (or a multi-root workspace with both).
- **gigstr/** — unchanged. No finance app code lives here; Gigstr only **calls** the finance app over HTTP when it needs money data.
- **gigstr-finance/** — its own project (own `package.json`, own `.env`, own dependencies). No imports from `gigstr/`, no shared files. It only **receives HTTP requests** (from Gigstr backend) and **returns data**.

So: two sibling folders under parent, completely separate; the only link is **HTTP** (Gigstr → Finance).

### 2.2 Who calls whom, and how

- **Users** only use the **Gigstr** frontend (login, calendar, dates, Valet, worksheet link, etc.).
- **Gigstr backend** is the only thing that talks to the finance app (or the frontend talks to Gigstr, and Gigstr backend proxies to Finance). So:
  - **Option A – Backend proxy (recommended):**  
    - Frontend calls **Gigstr** only (e.g. `GET /api/finance/my-ledger`, `POST /api/finance/log-payment`).  
    - Gigstr backend validates the user (session), then calls the **finance app** (e.g. `http://localhost:3002/internal/my-ledger?userId=123`).  
    - Finance app trusts requests from Gigstr (e.g. shared secret or API key in header). Finance app returns JSON; Gigstr returns it to the client.  
    - **Result:** Finance app is not reachable from the internet; only the Gigstr server can call it. “Only logged-in user via main app” is automatic.
  - **Option B – Frontend calls Finance with token:**  
    - Frontend gets a short-lived token from Gigstr (e.g. after login), then calls the finance app URL with that token.  
    - Finance app validates the token (e.g. JWT signed by Gigstr) and returns data.  
    - **Result:** Finance app must be reachable by the browser (CORS from Gigstr origin only); you need token endpoint and CORS config.

**Recommendation:** **Option A (backend proxy).** Simpler and secure: finance app listens only on localhost (or internal network), no CORS, no public URL. Only Gigstr backend has the finance app URL and API key.

### 2.3 “Any logged-in user has access via main app; not accessible from other places”

- **Access:** User logs in to Gigstr → all finance features (Valet, worksheet, log payment, etc.) are **handled by Gigstr routes** that internally call the finance app. So “any logged-in user” = any user with a valid Gigstr session; Gigstr backend forwards their identity (e.g. `userId`) to the finance app.
- **Not accessible from other places:**  
  - Finance app does **not** have a public route for “login” or “sign up”; it has **internal** endpoints only (e.g. `/internal/*` or `/api/*`).  
  - Those endpoints accept requests only from Gigstr: e.g. a shared `X-Internal-Key` or `Authorization: Bearer <service-token>`.  
  - Finance app runs on a port that is **not** exposed to the internet (e.g. only `localhost:3002` or a private IP). So only the machine running Gigstr (or your backend network) can call it.

---

## 3. New database for the finance app

### 3.1 Create a separate DB

- **Name:** e.g. `gigstr_finance` (or `gigstrfinance`).
- **Server:** Same MySQL (or Postgres) as Gigstr, or a different instance—your choice. Separate DB is enough so that schema and backups are independent.
- **Credentials:** Finance app has its own DB user (e.g. `gigstr_finance_rw`) with access only to `gigstr_finance`. No access to `gigstr` DB from the finance app (so no mixing).

### 3.2 What lives in the finance DB

- **Reference data (copied from Gigstr, then kept in sync):**
  - **users** (minimal): `userID`, `displayName`, `email` (optional). Used to resolve “who is this” and display names in ledger/worksheet.
  - **bands:** `bandID`, `bandName`, `createdBy`, `isSolo`. Used for “band account” and permissions.
  - **band_members:** `bandID`, `userID`, `role`, `status`. Used to know who is in which band (worksheet access, “my” payouts).
  - **dates (minimal):** `dateID`, `dateDate`, `bandID`, `venueID` (optional), or even just `dateID`, `dateDate`, `bandID`. Used as **trigger** (“this date exists”) and **temporal** (past vs future for “can pay”). **No** `datePrice` / `dateCurrency` in this copy—those move to band account (see below).

- **Canonical finance data (owned by finance app):**
  - **band_account_entries** (or keep name `finances_ledger`): one row per “line” (revenue, expense, payout) per date/band. Columns: e.g. `ledgerID`, `dateID`, `bandID`, `type` (revenue | expense | payout | band_fund), `targetUserID` (for payout), `label`, `amount`, `currency`, `status`, `settlementID`, `createdAt`, `updatedAt`. **Revenue** for a date = one row with `type = 'revenue'` (replaces `dates.datePrice`).
  - **personal_account_entries** (optional): can be a **view** over band_account_entries where `targetUserID IS NOT NULL`, or a separate table if you want to denormalize. “My ledger” = rows where `targetUserID = me`.
  - **payments** (legacy) or **payment_records**: if you migrate existing `payments` into “band account payment received” entries, you might not need a separate payments table; otherwise a small table “payment received for date X, amount, at” for audit. Prefer encoding “payment” as an entry in band account so one model fits all.

So: finance DB has **reference copies** (users, bands, band_members, dates minimal) **plus** the **ledger/account tables** that are the single source of truth for money.

---

## 4. Copy required existing data from Gigstr DB

### 4.1 One-time copy (migration)

- **From Gigstr DB → Finance DB:**
  1. **users:** `userID`, `displayName`, `email` (and any other needed for display).
  2. **bands:** `bandID`, `bandName`, `createdBy`, `isSolo`.
  3. **band_members:** `bandID`, `userID`, `role`, `status`.
  4. **dates:** `dateID`, `dateDate`, `bandID`, `venueID` (no `datePrice`/`dateCurrency` in the finance copy).
  5. **finances_ledger:** full copy (if finance app keeps the same schema at first).
  6. **payments:** copy into finance DB (e.g. into a `payments` table or transform into “band account payment” entries). If you transform, for each payment row insert a “payment received” entry in band account for that date/band.

- **Gross (datePrice) migration:** For each **date** that has `datePrice` / `dateCurrency` in Gigstr, insert one **revenue** row in the finance app’s band account (bandID, dateID, type=revenue, amount=datePrice, currency=dateCurrency). After that, Gigstr can drop `datePrice`/`dateCurrency` from its `dates` table.

- **Tool:** Script (e.g. Node) that connects to **both** DBs, reads from Gigstr and writes to Finance (with the revenue transformation above). Run once; after that, finance app owns all new writes.

### 4.2 Keeping reference data in sync (after first copy)

- **Option 1 – Push from Gigstr:** When Gigstr creates a date (or band, or user), it **calls the finance app** (e.g. `POST /internal/date-created` with `{ dateID, bandID, dateDate }`). Finance app inserts/updates its minimal `dates` (and bands/users if you copy those too). Same for “band created”, “user created” if finance needs them.
- **Option 2 – Periodic sync:** A job (in Gigstr or in Finance) periodically copies new/updated users, bands, band_members, dates from Gigstr DB to Finance DB. Simpler but slightly stale.
- **Option 3 – Finance pulls on demand:** Finance app does **not** store users/bands/dates; on each request it calls **Gigstr** (e.g. “give me date dateID”) and Gigstr returns minimal info. Then you don’t copy reference data; you only copy ledger/payments. Trade-off: finance app depends on Gigstr being up and must call it often.

**Recommendation:** **Option 1 (push).** Gigstr already has the events (add-date, create-band, etc.); add one HTTP call to the finance app so Finance stays in sync. Finance DB then has everything it needs without querying Gigstr.

---

## 5. Step-by-step plan (order of work)

### Phase 0 – Prepare new root and project (completely separate)

1. **Create folder** at the **same level** as `gigstr`, under the same parent:
   - If Gigstr is at `c:\xampp\htdocs\gigstr`, then parent is `c:\xampp\htdocs` and you create `c:\xampp\htdocs\gigstr-finance`.
   - Result: `parent/` contains `gigstr/` and `gigstr-finance/` — two separate apps, no shared files.
2. **Initialize project** inside `gigstr-finance/`: `npm init`, add dependencies (e.g. Express, mysql2, dotenv). Same stack as Gigstr is easiest (Node + Express + MySQL). Do **not** add Gigstr as a dependency or copy Gigstr code in.
3. **Structure:** e.g. `gigstr-finance/server.js`, `gigstr-finance/routes/`, `gigstr-finance/config/db.js`, `gigstr-finance/.env` (DB host, DB name = gigstr_finance, user, password, PORT=3002, INTERNAL_API_KEY=…). Everything lives under `gigstr-finance/` only.

### Phase 1 – Finance database

4. **Create DB:** `CREATE DATABASE gigstr_finance;`
5. **Create schema in finance DB:**
   - Reference tables: `users` (minimal), `bands`, `band_members`, `dates` (dateID, dateDate, bandID, venueID only).
   - Ledger: `finances_ledger` (or `band_account_entries`) with type including `revenue`.
   - If you keep legacy payments for a while: `payments` table in finance DB.
6. **Migration script (in Gigstr or in Finance):** Connect to Gigstr DB, read users, bands, band_members, dates (no price/currency), finances_ledger, payments. Write to Finance DB. For each date that has datePrice in Gigstr, insert one revenue row in Finance ledger. Run once.

### Phase 2 – Finance app API (internal only)

7. **Endpoints (examples):** All under e.g. `/internal` or `/api`, protected by API key (or service token):
   - `GET /internal/band-ledger?dateID=…` or `GET /internal/worksheet/:dateID` (for worksheet).
   - `GET /internal/my-ledger?userId=…` (for Valet / personal account).
   - `POST /internal/set-revenue` (dateID, bandID, amount, currency).
   - `POST /internal/ledger-item` (add expense/payout; same as current worksheet item).
   - `POST /internal/publish-settlement` (dateID).
   - `POST /internal/log-payment` (userId, dateID, amount, label).
   - `POST /internal/date-created` (dateID, bandID, dateDate) for sync.
8. **Auth:** Every request must include e.g. `X-Internal-Key: <secret>` or `Authorization: Bearer <service-token>`. Finance app rejects requests without it. Optionally, for “who is the user”, Gigstr sends `userId` in body or query so Finance never sees passwords or sessions.

### Phase 3 – Gigstr calls Finance (backend proxy)

9. **Gigstr backend:** Add a small **finance client** (e.g. `services/financeClient.js`) that does HTTP to `http://localhost:3002` (or `process.env.FINANCE_APP_URL`) with the internal API key and, when needed, `userId` from `req.user`.
10. **Gigstr routes:** Replace direct DB reads of datePrice/datePaidAmount and finances_ledger with calls to the finance client. Examples:
    - Dashboard/calendar: after loading dates from Gigstr DB, call Finance “get balances for these dateIDs” (or “get my ledger”) and merge into response.
    - Worksheet: `GET /api/finance/worksheet/:dateID` → Gigstr backend calls Finance `GET /internal/worksheet/:dateID`, returns result.
    - Valet: `GET /api/valet` (or my-wallet) → Gigstr backend calls Finance `GET /internal/my-ledger?userId=…`, returns result.
    - Log payment: `POST /api/valet/log-payment` → Gigstr checks date is in the past, then calls Finance `POST /internal/log-payment` with userId, dateID, amount.
11. **Add-date (Gigstr):** Stop sending datePrice/dateCurrency. After inserting the date, call Finance `POST /internal/date-created` with dateID, bandID, dateDate so Finance has the new date.

### Phase 4 – Access and deployment

12. **Finance app process:** Run on a fixed port (e.g. 3002), **binding only to localhost** (e.g. `app.listen(3002, '127.0.0.1')`). So it is **not** accessible from other machines.
13. **Gigstr .env:** Add `FINANCE_APP_URL=http://127.0.0.1:3002` and `FINANCE_INTERNAL_KEY=…`. Only Gigstr backend uses these; frontend never sees them.
14. **Result:** “Any logged-in user has access via main app” = user uses only Gigstr; Gigstr backend proxies to Finance. “Not accessible from other places” = Finance is not exposed publicly and only accepts callers that know the internal key (Gigstr).

---

## 6. Summary

| Item | Recommendation |
|------|----------------|
| **Layout** | New root folder `gigstr-finance/` sibling to `gigstr/`; no shared code. |
| **DB** | New DB `gigstr_finance`; copy users, bands, band_members, dates (minimal), ledger, payments; migrate datePrice → revenue rows. |
| **Sync** | Gigstr pushes “date created” (and optionally band/user) to Finance so Finance stays in sync. |
| **Access** | Only Gigstr backend calls Finance (backend proxy). Finance listens on localhost only, validates internal API key. |
| **User access** | “Any logged-in user” = they use Gigstr; Gigstr forwards their identity to Finance. Finance is not reachable directly by users or other apps. |

This gives you a clean separation: two roots, two DBs, one-way “Gigstr → Finance” with no mixing except the agreed HTTP API and the initial (and ongoing) reference data sync.
