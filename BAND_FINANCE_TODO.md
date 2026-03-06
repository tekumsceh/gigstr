# Band Finance & Settlement Engine – Build TODO

Use this checklist to track progress. Mark items as done by changing `[ ]` to `[x]`.

## Phase 1 – Database Hardening & Ledger Backbone

- [x] Review existing tables for gigs, bands, users, and dates (including current foreign keys and constraints).
- [x] Add NOT NULL constraints to `bandID` and other critical foreign keys.
- [x] Create `finances_ledger` table with:
  - [x] `ledgerID` (PK), `dateID` (FK), `category`, `label`, `targetUserID`, `amount`, `status`.
  - [x] `settlementID` for grouping rows by settlement version.
  - [x] `createdAt` / `updatedAt` timestamps.
- [x] Add `ON DELETE RESTRICT` constraints for all financial links.
- [x] Ensure every write to `finances_ledger` also updates `dates.dateUpdated`.
- [ ] Migrate or backfill any existing financial data into `finances_ledger` (if applicable).

## Phase 2 – Backend Worksheet & Settlement Logic

- [x] Implement service functions to:
  - [x] Read gross amount from `dates.datePrice`.
  - [x] Aggregate expenses (category = `expense`) per date.
  - [ ] Compute net profit and proposed distributions (fixed rates + splits).
- [x] Create admin-only Worksheet API endpoints for:
  - [x] CRUD on draft ledger line items (expenses, payouts, band_fund).
  - [x] Publishing a settlement (assign/bump `settlementID`, set statuses).
- [ ] Enforce immutability:
  - [x] Block edits/deletes for rows with `status = 'paid'`.
  - [ ] Allow corrections only via new adjustment rows tied to the same `settlementID`.

## Phase 3 – Admin Finance UI (Worksheet)

- [ ] Add "Finance" tab to the Band Admin area (owner/admin only).
- [x] Build line-item editor UI for expenses and payouts in draft state.
- [x] Show live Waterfall/summary:
  - [x] Gross → Expenses → Net.
  - [x] Balance indicator (Gross == Expenses + Payouts).
- [x] Add actions to:
  - [x] Save worksheet drafts.
  - [x] Publish settlements.
  - [ ] View previous settlements per date (by `settlementID`).

## Phase 4 – Member Valet / Wallet UI

- [x] Build "My Wallet" / Valet page for logged-in members.
- [x] List all gigs where `targetUserID = current user`.
- [x] Display per-gig payout amount and status (Owed, Pending, Paid).
- [x] Enforce visibility:
  - [x] Hide gross gig price and other members' payouts.
- [x] Implement member-initiated payout logging:
  - [x] UI for members to record money they received.
  - [x] Backend endpoint that writes these entries to `finances_ledger`.

## Phase 5 – Notifications & Oversight

- [x] Implement notifications:
  - [x] Member notification when a relevant settlement is published.
  - [x] Silent admin/owner notification when a member files a payout via Valet.
- [ ] Build admin overview screens:
  - [x] Per-date view of payouts, expenses, and settlements.
  - [ ] Per-member view of owed vs reported as received.

## Phase 6 – Permissions, Auditing & QA

- [ ] Verify role-based access control for:
  - [ ] Admin/owner worksheet and gross price access.
  - [ ] Member-only personal ledger and Valet.
  - [ ] Tech/Manager read-only access (where applicable).
- [ ] Add or configure audit logging for key financial actions.
- [ ] Write automated tests for:
  - [ ] Waterfall calculations and edge cases.
  - [ ] Immutability after `status = 'paid'`.
  - [ ] Visibility rules and permissions.
  - [ ] Constraint behavior and `ON DELETE RESTRICT`.

