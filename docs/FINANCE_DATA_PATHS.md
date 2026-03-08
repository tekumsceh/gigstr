# Finance data paths: Gigstr → gigstr-finance

When `FINANCE_APP_URL` and `FINANCE_INTERNAL_KEY` are set in Gigstr, **gigstr-finance is the only engine for financial bookkeeping**: all reads and writes go through the finance app, and Gigstr no longer writes revenue (datePrice/dateCurrency) to its own DB for add-date or update-date.

This doc maps **what used to come from the Gigstr dates DB** to **where it comes from now**.

---

## Data that used to come from Gigstr DB

| Data | Was from | Now (when finance enabled) |
|------|----------|-----------------------------|
| **datePrice** (gross per gig) | `dates.datePrice` | Finance: revenue row in `band_account_entries` (or from `summary-for-dates`) |
| **dateCurrency** | `dates.dateCurrency` | Finance: same revenue row / summary |
| **datePaidAmount** (total paid per date) | `SUM(payments.amountEUR)` | Finance: `summary-for-dates` → `totalPaid` |
| **remainingBalance** | `datePrice - totalPaid` | Computed from finance summary (gross − totalPaid) |
| **Worksheet (gross, ledger, summary)** | `dates` + `finances_ledger` | Finance: `GET /internal/worksheet/:dateID` |
| **My wallet / Valet ledger** | `finances_ledger` (payouts for user) | Finance: `GET /internal/my-ledger?userId=` |
| **Recording a payment** | `INSERT INTO payments` + `dateUpdated` | Finance: `POST /internal/record-payment` or `record-payments-bulk` |
| **Setting revenue for a date** | `dates.datePrice`, `dates.dateCurrency` | Finance: `POST /internal/set-revenue` (and date-created with amount when adding date) |

---

## Gigstr routes and their finance wiring

| Route | Financial data needed | Source when finance enabled |
|-------|------------------------|-----------------------------|
| **GET /api/dashboard-data** | datePrice, datePaidAmount, dateCurrency per date | Gigstr returns dates; then `summaryForDates(dateIDs)` from finance merged into `calendarDates` |
| **GET /api/calendar-dates** | Same | Same: merge finance summary into each date |
| **GET /api/dates** | Same + filter by paid/unpaid | Same: merge finance summary, then filter in code |
| **GET /api/date/:id** | datePrice, dateCurrency, datePaidAmount | Merge finance `summaryForDates([id])` into single date |
| **GET /api/valet-master-package** | gigs with datePrice, totalPaid, remainingBalance | Dates from Gigstr (venue, type); summary from finance; filter remainingBalance > 0.01 |
| **GET /api/finance/worksheet/:dateID** | date, ledger, summary (gross, expenses, payouts) | Proxy to finance `GET /internal/worksheet/:dateID`; Gigstr enriches date with venue, bandColor |
| **POST /api/finance/worksheet/:dateID/items** | Create ledger item | Proxy to finance `POST /internal/worksheet/:dateID/items` |
| **DELETE /api/finance/worksheet/item/:ledgerID** | Delete ledger item | Proxy to finance |
| **POST /api/finance/worksheet/:dateID/publish** | Publish settlement | Proxy to finance |
| **GET /api/my-wallet** | Ledger rows (payouts for user) | Proxy to finance `GET /internal/my-ledger`; Gigstr enriches with venue names |
| **POST /api/my-wallet/log-payment** | Log member payout received | Proxy to finance `POST /internal/log-payment`; Gigstr still sends notifications |
| **POST /api/add-date** | (write) date + price/currency | Gigstr INSERT as before; then finance `POST /internal/date-created` with amount, currency (dual-write) |
| **POST /api/update-date/:id** | (write) datePrice, dateCurrency | Finance `POST /internal/set-revenue`; Gigstr still UPDATEs dates table |
| **POST /api/dates/pay-single/:id** | Read balance; write payment | Finance `summaryForDates([id])` → remainingBalance; then `POST /internal/record-payment` |
| **POST /api/dates/pay-bulk** | Write multiple payments | Finance `POST /internal/record-payments-bulk` |

---

## Finance app endpoints that supply this data

| Endpoint | Purpose |
|----------|---------|
| **GET /internal/worksheet/:dateID** | Full worksheet: date (with gross/currency), ledger items, roster, summary |
| **GET /internal/my-ledger?userId=&filter=** | Payout rows for user (Valet / my-wallet); includes datePrice (gross) per row |
| **POST /internal/summary-for-dates** | Body: `{ dateIDs }` → `{ dateID: { gross, totalPaid, currency } }` |
| **POST /internal/set-revenue** | Set/update revenue (gross) for a date |
| **POST /internal/record-payment** | Record one payment (pay-single) |
| **POST /internal/record-payments-bulk** | Record multiple payments (pay-bulk) |
| **POST /internal/date-created** | Sync new date; optional amount, currency → revenue row |
| **POST /internal/log-payment** | Member logs payout received |

All of the above require `X-Internal-Key` and are called only by the Gigstr backend.

---

## Frontend: no API changes

The frontend still calls the same Gigstr URLs. Response shapes are unchanged: dates have `datePrice`, `datePaidAmount`, `dateCurrency`; worksheet has `date`, `ledgerItems`, `summary`; my-wallet returns an array of ledger rows. When finance is enabled, Gigstr fills these from the finance app and does **not** write revenue (price/currency) to the Gigstr `dates` table on add-date or update-date.

---

## Test script

From the Gigstr backend folder, with both apps running and `.env` containing `FINANCE_APP_URL` and `FINANCE_INTERNAL_KEY`:

```bash
npm run test:finance
```

Or: `node scripts/test-finance-integration.js`

This checks: finance `/health`, finance `/internal/ping` (with key), finance `summary-for-dates`, Gigstr `/api/statuses`, and Gigstr `/api/dates` response shape. Exit code 1 if any check fails.
