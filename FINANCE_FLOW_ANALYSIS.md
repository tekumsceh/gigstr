# Finance Flow Analysis: Add Date → Pay

## Theoretical Flow (Ideal)

1. **Add date** – User enters price in chosen currency (EUR/USD/GBP/RSD). System stores amount + currency.
2. **Canonical storage** – All amounts normalized to a single currency (e.g. EUR) using exchange rate at time of entry; original amount + currency + rate kept for audit.
3. **Display** – Amounts shown in user’s preferred currency using current rate.
4. **Payment** – When paying, balance is in canonical currency; user can enter in any currency; conversion uses rate at time of payment.
5. **Ledger** – Worksheet line items stored with amount + currency + rate; math done in canonical currency.

---

## Actual Flow (Step by Step)

### Step 1: Add Date

| Location | Input | Currencies | Storage |
|----------|-------|------------|---------|
| **AddDate.jsx** | `datePrice` (number), `dateCurrency` (select) | EUR, USD, GBP, RSD | Sent as-is |
| **POST /api/add-date** | `d.datePrice`, `d.dateCurrency` | — | Stored in `dates` table |

**Stored:** `datePrice` (raw number), `dateCurrency` (varchar). No conversion, no exchange rate.

**Match:** ✅ User intent preserved. ❌ No canonical currency; no rate stored.

---

### Step 2: Edit Date (DateDetailView)

| Location | Input | Currencies | Storage |
|----------|-------|------------|---------|
| **DateDetailView** | `datePrice`, `dateCurrency` (edit form) | EUR, USD, GBP, RSD | Sent as-is |
| **POST /api/update-date/:id** | Same | — | Updates `dates` |

**Match:** ✅ Same as add-date. ❌ Still no conversion or rate.

---

### Step 3: Data Flow to Valet / Dashboard

| Source | Returns | dateCurrency? |
|--------|---------|----------------|
| **GET /api/dashboard-data** | `datePrice`, `datePaidAmount` | ❌ **Not returned** |
| **GET /api/date/:id** | `t1.*` (includes dateCurrency) | ✅ Yes |
| **GET /api/calendar-dates** | `datePrice`, `datePaidAmount` | ❌ **Not returned** |

**ValetView** uses `dashboard-data` → `calendarDates`. No `dateCurrency` on each gig.

**Match:** ❌ Valet cannot know event currency; it treats all amounts as EUR.

---

### Step 4: Balance Calculation (ValetView)

```javascript
balance = gig.datePrice - (gig.datePaidAmount || 0);
rawBalance = balance;  // Used for waterfall
```

- `datePrice` = event currency (unknown to Valet; not in response)
- `datePaidAmount` = `SUM(payments.amountEUR)` → always EUR

**Assumption:** Both in same unit. In reality: `datePrice` can be RSD/USD/GBP; `datePaidAmount` is EUR.

**Match:** ❌ **Critical mismatch.** For non-EUR events, balance mixes currencies.

---

### Step 5: Bulk Pay (ValetView)

| Step | Action | Currency handling |
|------|--------|-------------------|
| User enters | `bulkAmount` in EUR or RSD (toggle) | `currencyView` |
| Conversion | `remainingPool = inputVal / eurToRsd` if RSD | RSD → EUR |
| Waterfall | `payAmount = min(remainingPool, gig.rawBalance)` | Assumes `rawBalance` in EUR |
| API | `payments: [{ id, amount }]`, `currency`, `exchangeRate` | `amount` = EUR |
| Backend | Stores `amountEUR`, `amountOriginal`, `currency`, `exchangeRate` | ✅ Correct |

**Match:** ✅ Backend stores correctly. ❌ `rawBalance` is wrong for non-EUR gigs, so waterfall distributes incorrectly.

---

### Step 6: Single Pay (pay-single)

```javascript
remainingBalance = datePrice - totalPaid;
amountEUR = remainingBalance;  // Treated as EUR!
amountOriginal = dateCurrency === 'RSD' ? amountEUR * exrateEurToRsd : amountEUR;
```

- `datePrice` in `dateCurrency` (e.g. RSD)
- `totalPaid` in EUR
- `remainingBalance` = RSD − EUR (invalid)
- Stored as `amountEUR` = that invalid value

**Match:** ❌ **Critical bug.** For RSD events, wrong amount is stored as EUR.

---

### Step 7: Finance Worksheet – Add Ledger Item

| Location | Input | Currencies | Conversion |
|----------|-------|------------|------------|
| **FinanceWorksheetView** | Amount + EUR/RSD toggle | EUR, RSD only | Converts to event currency |
| Event EUR | User enters RSD → ÷ eurToRsd | — | ✅ |
| Event RSD | User enters EUR → × eurToRsd | — | ✅ |
| Event USD/GBP | Toggle only EUR/RSD | ❌ **No support** | — |

**Stored:** `amount` in event currency. No `currency` or `exchangeRate` on ledger row.

**Match:** ✅ EUR↔RSD works. ❌ USD/GBP events: no conversion path; only EUR/RSD toggle.

---

### Step 8: My Wallet – Log Payment

| Location | Input | Currencies | Storage |
|----------|-------|------------|---------|
| **MyWalletView** | `logAmount` (number) | EUR only (label "Amount (EUR)") | Sent as-is |
| **POST /api/my-wallet/log-payment** | `amount` | — | Insert into `finances_ledger` |

**Stored:** Single `amount`; no currency. Assumed EUR.

**Match:** ✅ Works if all payouts are EUR. ❌ No RSD/USD/GBP; no conversion.

---

## Amount Input Inventory

| # | Location | Field | Currencies offered | Converts? | Stored where |
|---|----------|-------|--------------------|-----------|--------------|
| 1 | AddDate | datePrice + dateCurrency | EUR, USD, GBP, RSD | No | dates |
| 2 | DateDetailView (edit) | datePrice + dateCurrency | EUR, USD, GBP, RSD | No | dates |
| 3 | FinanceWorksheetView | amount + EUR/RSD toggle | EUR, RSD | Yes (to event currency) | finances_ledger |
| 4 | ValetView (bulk) | bulkAmount + currencyView | EUR, RSD | Yes (RSD→EUR) | payments |
| 5 | MyWalletView | logAmount | EUR only | No | finances_ledger |

---

## Theoretical vs Actual – Summary

| Aspect | Theoretical | Actual | Gap |
|--------|-------------|--------|-----|
| **Canonical currency** | Single (e.g. EUR) | None; mixed | Critical |
| **Date price storage** | Amount + currency + rate | Amount + currency only | Medium |
| **Payment balance** | Same unit as price | datePaidAmount EUR, datePrice in event currency | Critical |
| **pay-single** | Convert before compare | Compares RSD with EUR | Critical |
| **pay-bulk** | Correct per-gig balance | Assumes all balances in EUR | Critical |
| **Valet data** | Include dateCurrency | dashboard-data omits it | Medium |
| **Worksheet input** | All event currencies | EUR/RSD only | Medium |
| **Ledger storage** | Amount + currency + rate | Amount only | Medium |
| **My Wallet** | Multi-currency | EUR only | Low |

---

## Critical Issues

1. **Currency mixing in balance** – `datePrice` (event currency) and `datePaidAmount` (EUR) are subtracted without conversion.
2. **pay-single** – Treats `remainingBalance` as EUR even when `dateCurrency` is RSD.
3. **Valet waterfall** – Uses `rawBalance` as if it were EUR; wrong for USD/GBP/RSD events.
4. **dashboard-data** – Missing `dateCurrency`; Valet cannot correct for event currency.

---

## What Works

1. **Add/Edit date** – Price and currency stored correctly.
2. **pay-bulk backend** – Stores amountEUR, amountOriginal, currency, exchangeRate.
3. **Worksheet EUR↔RSD** – Converts correctly for EUR/RSD events.
4. **exrate** – Fetched and used for display and worksheet conversion.

---

## Recommended Fix Order

1. Add `dateCurrency` to dashboard-data (and any date list used by Valet).
2. Normalize `datePrice` to EUR at add/update (or at read time) using exrate; keep original for display.
3. Fix pay-single: convert `datePrice` to EUR before computing `remainingBalance` when `dateCurrency` ≠ EUR.
4. Fix Valet: compute `rawBalance` in EUR (convert `datePrice` when needed).
5. Extend worksheet input to USD/GBP when event currency is USD/GBP.
6. Add currency + rate to ledger schema and worksheet POST.
