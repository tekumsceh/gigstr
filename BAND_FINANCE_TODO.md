# Band Finance & Settlement Engine – Build TODO

Use this checklist to track progress. Mark items as done by changing `[ ]` to `[x]`.

## Phase 1 – Database Hardening & Ledger Backbone

- [ ] Review existing tables for gigs, bands, users, and dates (including current foreign keys and constraints).
- [ ] Add NOT NULL constraints to `bandID` and other critical foreign keys.
- [ ] Create `finances_ledger` table with:
  - [ ] `ledgerID` (PK), `dateID` (FK), `category`, `label`, `targetUserID`, `amount`, `status`.
  - [ ] `settlementID` for grouping rows by settlement version.
  - [ ] `createdAt` / `updatedAt` timestamps.
- [ ] Add `ON DELETE RESTRICT` constraints for all financial links.
- [ ] Ensure every write to `finances_ledger` also updates `dates.dateUpdated`.
- [ ] Migrate or backfill any existing financial data into `finances_ledger` (if applicable).

## Phase 2 – Backend Worksheet & Settlement Logic

- [ ] Implement service functions to:
  - [ ] Read gross amount from `dates.datePrice`.
  - [ ] Aggregate expenses (category = `expense`) per date.
  - [ ] Compute net profit and proposed distributions (fixed rates + splits).
- [ ] Create admin-only Worksheet API endpoints for:
  - [ ] CRUD on draft ledger line items (expenses, payouts, band_fund).
  - [ ] Publishing a settlement (assign/bump `settlementID`, set statuses).
- [ ] Enforce immutability:
  - [ ] Block edits/deletes for rows with `status = 'paid'`.
  - [ ] Allow corrections only via new adjustment rows tied to the same `settlementID`.

## Phase 3 – Admin Finance UI (Worksheet)

- [ ] Add "Finance" tab to the Band Admin area (owner/admin only).
- [ ] Build line-item editor UI for expenses and payouts in draft state.
- [ ] Show live Waterfall/summary:
  - [ ] Gross → Expenses → Net → Distribution.
  - [ ] Balance indicator (Gross == Expenses + Payouts).
- [ ] Add actions to:
  - [ ] Save worksheet drafts.
  - [ ] Publish settlements.
  - [ ] View previous settlements per date (by `settlementID`).

## Phase 4 – Member Valet / Wallet UI

- [ ] Build "My Wallet" / Valet page for logged-in members.
- [ ] List all gigs where `targetUserID = current user`.
- [ ] Display per-gig payout amount and status (Owed, Pending, Paid).
- [ ] Enforce visibility:
  - [ ] Hide gross gig price and other members' payouts.
- [ ] Implement member-initiated payout logging:
  - [ ] UI for members to record money they received.
  - [ ] Backend endpoint that writes these entries to `finances_ledger`.

## Phase 5 – Notifications & Oversight

- [ ] Implement notifications:
  - [ ] Member notification when a relevant settlement is published.
  - [ ] Silent admin/owner notification when a member files a payout via Valet.
- [ ] Build admin overview screens:
  - [ ] Per-date view of payouts, expenses, and settlements.
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

