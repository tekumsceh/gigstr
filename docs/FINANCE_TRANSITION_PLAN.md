# Finance transition plan: dates → band account + personal account

## 1. Goal

- **Remove all financial data from the `dates` table.** Dates are only the **trigger** (a date exists → finance can attach money) and the **temporal gate** (past vs future → can pay or not).
- **Introduce first-class “band account” and “personal account”** as the single source of truth for money. All financial references in the app ultimately come from these accounts (or a separate finance app that owns them).

---

## 2. Current state (in-depth)

### 2.1 Database: what holds money today

| Table / concept | Financial columns / role | Tied to |
|-----------------|---------------------------|--------|
| **dates** | `datePrice` (float), `dateCurrency` (varchar), `dateUpdated` (touched on payment/ledger writes) | One “gross” per gig; date is the anchor |
| **payments** | `dateID`, `amountEUR`, `amountOriginal`, `currency`, `exchangeRate`, `paymentDate` | Date; aggregate “paid toward this date” (no userID) |
| **finances_ledger** | `dateID`, `bandID`, `targetUserID`, `category`, `label`, `amount`, `status`, `settlementID`, `createdAt`, `updatedAt` | Date + band + optional user; line items (expense/payout) per date |

So today: **dates** hold gross + currency; **payments** hold “paid per date”; **finances_ledger** holds worksheet line items per date. There is no “band account” or “personal account” table—only date-centric data.

### 2.2 Backend: every use of date money and payments

| File | Usage | Effect of removing financial data from dates |
|------|--------|-----------------------------------------------|
| **bandRoutes.js** | `GET /api/dashboard-data`: SELECT `t1.datePrice`, `COALESCE((SELECT SUM(amountEUR) FROM payments WHERE dateID = t1.dateID), 0) AS datePaidAmount` | Calendar/dashboard currently get price and paid from dates + payments. Must switch to finance/account source (or finance app API). |
| **eventRoutes.js** | `GET /api/dates`: SELECT with `COALESCE(SUM(p.amountEUR), 0) AS datePaidAmount`; filter `paid` by datePrice vs datePaidAmount | Same: needs balance/paid from accounts, not dates. |
| **eventRoutes.js** | `POST /api/add-date`: INSERT `datePrice`, `dateCurrency` into `dates` | Add-date must **not** write price/currency to dates. Either drop these columns from INSERT or add a separate “request price” step that writes to band account (or finance app). |
| **eventRoutes.js** | `POST /api/update-date/:id`: UPDATE `datePrice`, `dateCurrency` on `dates` | Must stop updating price/currency on dates. Edits to “gross” move to band account / finance app. |
| **eventRoutes.js** | `GET /api/calendar-dates` (and `GET /api/date/:id`): SELECT `datePrice`, subquery `datePaidAmount` from payments | All consumers of date price/paid must get this from finance/account API. |
| **eventRoutes.js** | `POST /api/dates/pay-single/:id`: reads `datePrice`, `dateCurrency`, `totalPaid` from dates + payments; writes to `payments`; `UPDATE dates SET dateUpdated` | Payment flow must become “credit band account” or “credit personal account” (and optionally still link to dateID for “reason”). No more reading gross from dates. |
| **eventRoutes.js** | `POST /api/dates/pay-bulk`: same—writes to `payments` by dateID, touches `dateUpdated` | Same as pay-single: payments become account transactions; temporal rule (past/future) still applied by main app before calling finance. |
| **financeRoutes.js** | `GET /api/finance/worksheet/:dateID`: SELECT `d.datePrice`, `d.dateCurrency`; `gross = date.datePrice`; summary from ledger + gross | Worksheet “gross” must come from band account (or first ledger entry for that date), not from dates.datePrice. |
| **financeRoutes.js** | Worksheet create item, publish, my-wallet: all use `dateID` / `bandID` / `targetUserID`; no direct reads of datePrice in my-wallet | Ledger already date- and band-centric; can be refactored to “band account” + “personal account” entries keyed by dateID as reference. |
| **server.js** | `GET /api/valet-master-package`: SELECT `d.datePrice`, `COALESCE(SUM(p.amountEur))`, `remainingBalance` from dates + payments | Valet must get balances from personal account (and band account if needed), not from dates + payments. |
| **middleware/queryEngine.js** | Builds SELECT with `datePaidAmount` and JOIN payments on dateID | Any route using this for “date list with paid” must use account-based API instead. |
| **scripts (migrateFinanceSchema, etc.)** | Delete or constrain payments/dates/finances_ledger | Migration and cleanup scripts must be updated for new schema (accounts, no datePrice/dateCurrency on dates). |

### 2.3 Frontend: every use of date price / paid / currency

| File | Usage | Effect of removing financial data from dates |
|------|--------|-----------------------------------------------|
| **AddDate.jsx** | Form fields `datePrice`, `dateCurrency`; submit to `POST /api/add-date` with price/currency | Form must not send price/currency to main app (or send only to finance app). Option: “Request price” after date is created, or finance app pulls “dates needing a price” and band admin sets gross in band account. |
| **DateDetailView.jsx** | Reads `event.datePrice`, `event.datePaidAmount`, `event.dateCurrency`; computes balance; displays “Money” section; edit mode has `DetailRow` for `datePrice`, `dateCurrency`; “Open finance worksheet” | All price/paid/balance/currency must come from API that reads band/personal account (or finance app). Edit price/currency removed or replaced by “Set gross in finance” (worksheet or finance app). |
| **ValetView.jsx** | Filters and lists by `datePrice`, `datePaidAmount`, balance (price − paid); builds `processedData` and totals from these | Valet must consume “personal account” or finance API (e.g. ledger rows where targetUserID = me); no datePrice/datePaidAmount from dates. |
| **FinanceWorksheetView.jsx** | Displays `summary.gross`, `date.dateCurrency`, expenses/payouts in same currency | Gross must come from band account (or ledger “revenue” line for that date), not from date object. |
| **Listings.jsx** | Valet grid: `item.datePrice`, `item.datePaidAmount`, `item.dateCurrency`, `item.rawBalance` | Listings when used for Valet must receive account/ledger data (e.g. “my” payout rows with amount and status), not date-level price/paid. |
| **Valet.jsx** (component) | `item.datePaidAmount`, `item.datePrice` for display | Same: data shape must be account/ledger-based. |
| **filterService.js** | `getFilteredByPaidStatus`: compares `datePaidAmount` vs `datePrice` | Paid filter must work on account/ledger data (e.g. status paid vs owed), not date columns. |
| **accountingService.js** | `simulateWaterfall`: uses `gig.datePrice`, `gig.datePaidAmount`; `getFinancialSummary`: uses `item.datePrice`, `item.datePaidAmount` | Waterfall and summary must be driven by “unpaid ledger rows” or account balances, not dates. |

### 2.4 Summary of code impact

- **Backend:** 6+ route files and 2 middleware/scripts touch date price, date paid, or payments; all must be updated to either call a finance service / band+personal account or read from new tables.
- **Frontend:** 8+ components/services read or write date price/currency/paid; all must switch to finance/account data and possibly to a different API (finance app or new account endpoints).
- **DB:** `dates.datePrice` and `dates.dateCurrency` removed (or deprecated and no longer read); `payments` table either removed or repurposed as “band account transactions” (with optional dateID as reference). New or clarified “band account” and “personal account” storage (see below).

---

## 3. Target model: band account + personal account

### 3.1 Concepts

- **Band account**  
  One logical “account” per band. Holds:
  - Revenue entries (e.g. “gig on date X: +1000 EUR”) — previously the “gross” on the date.
  - Expense entries (e.g. “gig on date X: −200 EUR”).
  - Payout entries (e.g. “gig on date X: −200 EUR to user Alice”) that **also** create a corresponding credit in the member’s **personal account**.

- **Personal account**  
  One per user (each user has a solo band, so “personal” can map to “solo band account” or a dedicated `user_id` account). Holds:
  - Credits from band payouts (e.g. “from band Y, gig date X: +200 EUR”).
  - Optionally “payments received” (member logs receipt) — already similar to finances_ledger status = paid.

- **Dates**  
  - No `datePrice`, no `dateCurrency`.  
  - Only: dateDate, bandID, venueID, schedule, status, description, etc.  
  - **Trigger:** “Date created” → main app (or integration) notifies finance / creates “slot” for band account entries for that dateID.  
  - **Temporal rule:** Main app (or gateway) only allows “record payment / mark paid” when the date is in the past (or per your rule).

### 3.2 Where to store “band account” and “personal account”

Two main options (to be chosen before implementation):

- **Option A – Same DB, new/refactored tables**  
  - e.g. `band_account_entries` (bandID, dateID, type: revenue|expense|payout, amount, currency, targetUserID for payouts, status, createdAt).  
  - “Personal account” = entries where targetUserID = me (or a `personal_account_entries` table keyed by userID, populated from payouts).  
  - `finances_ledger` can be renamed/refactored into this, with **revenue** (gross) moved from dates into a “revenue” line per date in band account.

- **Option B – Separate finance app**  
  - Finance app owns band account and personal account (and optionally ledger).  
  - Main app: creates/updates dates only; when it needs price/paid/balance it calls finance app (e.g. “get balance for date X”, “get my personal ledger”, “record payment for date X”).  
  - Main app enforces “date exists” and “date in past” before calling finance.

The rest of this plan assumes **Option A** (same DB) for concreteness; if you choose Option B, the same code-impact list applies, but “read/write” becomes “call finance app API” instead of new tables.

---

## 4. Data migration and schema changes

### 4.1 New or refactored tables (Option A)

- **band_account_entries** (or keep and extend `finances_ledger`):
  - `bandID`, `dateID` (nullable or required for “reason”), `type` (revenue | expense | payout | band_fund), `amount`, `currency`, `targetUserID` (for payout), `label`, `status`, `settlementID`, `createdAt`, `updatedAt`.
  - **Revenue** for a date: one row per date (or per gig) with type = revenue, amount = former dates.datePrice. Migrate existing datePrice into these rows (one per date with non-null datePrice).
- **personal_account_entries** (or derive from band_account_entries where targetUserID IS NOT NULL):
  - Either a view / query “all payout rows where targetUserID = me” or a separate table populated when a payout is created (copy from band account payout to personal “credit”).

Decide: single table (band + personal as views) vs two tables. Single table + views keeps one source of truth.

### 4.2 Dropping financial data from dates

- Remove or stop using:
  - `dates.datePrice`
  - `dates.dateCurrency`
- Keep:
  - `dates.dateUpdated` (can still be touched when “something about this date changed” in finance, or drop if finance owns all state).
- Migration:
  - For every row in `dates` with non-null datePrice: insert a **revenue** row into band account (bandID = dates.bandID, dateID = dates.dateID, amount = datePrice, currency = dateCurrency).
  - Then alter table `dates` drop column datePrice, drop column dateCurrency (or leave columns and stop reading/writing).

### 4.3 payments table

- **Option 1:** Deprecate. “Paid” state is represented in band account (e.g. “payment received” entries) and personal account (payout status = paid). Migrate existing payments rows into band account “payment received” entries (dateID, amount, paymentDate).
- **Option 2:** Keep for a transition period: leave payments as “legacy” and have new code read from accounts only; later remove.

### 4.4 finances_ledger

- Becomes the band-account ledger (and source for “personal” via targetUserID). Ensure it has a **revenue** category or type (or use category = 'band_fund' / new type) for the “gross” that used to sit on dates. Migration: for each date with datePrice, insert one revenue row; then remove datePrice/dateCurrency from dates.

---

## 5. API and flow changes

### 5.1 Main app (Gigstr) – dates

- **POST /api/add-date**  
  Body no longer includes price/currency. Only: dateDate, bandID, venueID, schedule, description, status, etc. Optionally after insert, main app or a job notifies finance: “date created, dateID, bandID” so finance can create a “slot” for revenue (band admin sets amount later).

- **PUT /api/update-date/:id**  
  No longer send or accept datePrice/dateCurrency. If “edit gross” is needed, that becomes a finance/worksheet or finance-app call.

- **GET /api/date/:id**, **GET /api/dates**, **GET /api/dashboard-data**, **GET /api/calendar-dates**  
  Do **not** SELECT datePrice, dateCurrency. Do **not** compute datePaidAmount from payments. Either:
  - Return dates without financial fields and let the frontend call a separate “finance” or “account” API for “balance for this date” / “my payouts for these dates”, or
  - Backend calls finance service (or new account queries) and attaches a small financial summary per date (e.g. “hasRevenue”, “balance”) for list/detail views.

### 5.2 Finance / account API (new or existing)

- **Band account**
  - “Get band balance” (or “get band ledger for date X”).
  - “Set revenue for date X” (replaces writing datePrice on the date).
  - “Add expense / payout” (already in worksheet; stays, but gross comes from band account revenue row for that date, not from dates).

- **Personal account**
  - “Get my ledger” (payouts where targetUserID = me; status owed/paid).
  - “Log payout received” (mark my payout as paid; already exists as my-wallet/log-payment).

- **Temporal rule**
  - “Can record payment for date X?”: main app (or gateway) checks dateDate &lt; today; only then calls finance to record payment / mark paid.

### 5.3 Pay-single and pay-bulk

- Current: read datePrice and totalPaid from dates + payments, write to payments.
- New: main app checks date is in the past; then calls finance/account API to “record payment for date X” (and amount). Finance app writes to band account (and optionally personal accounts). No reads from dates.datePrice or payments table from main app (if payments is deprecated).

---

## 6. Step-by-step transition (order to avoid breakage)

### Phase 1 – Finance side: band + personal account model

1. **Define** band account and personal account storage (extend finances_ledger with “revenue” type, or add band_account_entries; define view or table for “personal”).
2. **Add** revenue rows for existing dates: for each date with datePrice, insert one revenue line in band account (dateID, bandID, amount, currency).
3. **Expose** APIs: “get band ledger/balance for date”, “get my personal ledger”, “set revenue for date” (used by worksheet instead of date.datePrice). Worksheet already uses ledger; change it to get “gross” from band account revenue row for that date instead of dates.datePrice.
4. **Migrate** existing payments into band account “payment” entries (or leave payments as legacy and have new logic only use accounts).

### Phase 2 – Main app: stop writing financial data to dates

5. **Add-date:** Remove datePrice and dateCurrency from the INSERT. Frontend AddDate form: remove price/currency fields (or keep as “request price” that calls finance to create a “revenue placeholder” for that dateID).
6. **Update-date:** Remove datePrice and dateCurrency from the UPDATE.
7. **Backend:** Remove every SELECT of datePrice, dateCurrency, and datePaidAmount from event and band routes (or replace with a join/call to account API that returns “financial summary” per date for backward compatibility during transition).

### Phase 3 – Main app: stop reading financial data from dates

8. **Dashboard / calendar / date list:** Backend returns dates without price/paid; frontend gets financial data from finance/account API (e.g. “get balances for these dateIDs” or “get my ledger”). Alternatively, backend calls finance internally and attaches a small financial object per date.
9. **Date detail:** Same: price/paid/balance/currency come from finance/account API, not from event.datePrice/datePaidAmount. Edit price/currency removed or replaced by “Set in worksheet” / finance app.
10. **Valet:** Driven entirely by “my personal account” (or “my ledger” from finances_ledger where targetUserID = me). No datePrice/datePaidAmount from dates.
11. **Pay-single / pay-bulk:** Implement as “main app checks date in past → call finance to record payment”; finance writes to band (and personal) account. Remove direct reads of datePrice and writes to payments from main app (once finance handles it).

### Phase 4 – Schema and cleanup

12. **Drop** columns dates.datePrice and dates.dateCurrency (or leave and ignore).
13. **Deprecate or remove** payments table (if all payment state is in accounts).
14. **Update** any remaining scripts (e.g. migrateFinanceSchema) to use new tables and no longer assume datePrice/dateCurrency on dates.
15. **DB trigger:** If “cannot delete past gigs” is implemented as a trigger on dates, keep it; it only needs dateDate, not datePrice.

---

## 7. Risk and backward compatibility

- **Breaking change:** Any client (or other service) that expects datePrice/datePaidAmount/dateCurrency on date objects will break until they use the new finance/account API.
- **Temporary compatibility:** During transition, you can add a “shim” API that, for a given dateID, returns { datePrice, datePaidAmount } by reading from band account revenue row and sum of payments (or account payment rows) for that date, so existing frontend keeps working until it’s updated to use account API only.
- **Order:** Implement finance/account side and migration first; then switch main app to read/write through it; then drop date columns and payments.

---

## 8. Checklist (for implementation)

- [ ] Decide: Option A (same DB, new/refactored account tables) vs Option B (separate finance app).
- [ ] Design exact schema for “band account” and “personal account” (tables or views).
- [ ] Migration: datePrice/dateCurrency → band account revenue rows; payments → band (and optionally personal) account entries.
- [ ] New or updated APIs: get band ledger/balance for date; get my personal ledger; set revenue for date; record payment for date (with temporal check in main app).
- [ ] Worksheet: gross from band account (revenue for dateID), not dates.datePrice.
- [ ] Add-date: no price/currency in body or INSERT.
- [ ] Update-date: no price/currency in UPDATE.
- [ ] All GET date/list/dashboard/calendar: no datePrice/datePaidAmount/dateCurrency from dates; attach from account API or return without and let frontend call account API.
- [ ] DateDetailView: price/paid/balance from account API; remove or replace edit price/currency.
- [ ] ValetView + Valet + Listings: data from personal account / my ledger only.
- [ ] filterService / accountingService: drive from account/ledger data.
- [ ] Pay-single and pay-bulk: main app checks past date → call finance; no direct payments table or datePrice read.
- [ ] Drop dates.datePrice, dates.dateCurrency; deprecate or remove payments.
- [ ] Update any scripts and other references to datePrice/dateCurrency/datePaidAmount.

This plan gives you a full map of what the transition does to existing code and a safe order to execute it.
