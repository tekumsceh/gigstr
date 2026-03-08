# What non-GOD users can access

Any logged-in user (musician, admin, editor, guest) can use the following. GOD-only routes and APIs are listed at the end.

---

## Pages (frontend routes)

| Route | Access | Notes |
|-------|--------|--------|
| `/` | Any logged-in | Home / upcoming schedule (only their bands’ dates) |
| `/add` | Any logged-in | Add date (only for bands they belong to) |
| `/valet` | Any logged-in | Valet view (data filtered by backend to their bands) |
| `/wallet` | Any logged-in | My Wallet (only their payouts) |
| `/date/:id` | Any logged-in | Date detail (if they have access to that date’s band) |
| `/create-band` | Any logged-in | Create new band |
| `/band/:id/manage` | Any logged-in | Band management (role-based inside: owner/admin see more) |
| `/settings` | Any logged-in | Settings (appearance, language, etc.) |
| `/date/:id/finance` | **GOD only** | Finance worksheet for a date |

---

## API (backend)

**Any authenticated user** can call:

- `GET /api/me` – current user + bands
- `GET /api/dashboard-data` – calendar dates and bands (only their bands/solo)
- `GET /api/my-bands` – bands they’re in
- `GET /api/my-invites` – band invites
- `POST /api/invites/respond` – accept/decline invite
- `GET /api/bands/:id` – band details (if member)
- `GET /api/band/:bandID/roster` – roster (if member)
- `POST /api/bands` – create band
- `POST /api/bands/:id/members` – invite member (owner/admin)
- `DELETE /api/bands/:id/members/:userId` – remove member (owner/admin)
- `POST /api/add-date` – add date (band member)
- `GET /api/date/:id` – date details (no auth on this route; data filtered elsewhere)
- `GET /api/my-wallet` – their wallet/payouts
- `POST /api/my-wallet/log-payment` – log a payment they received
- `GET /api/notifications` – their notifications
- `POST /api/notifications/:id/read` – mark read
- `GET /api/users/search` – user search (authenticated)

**GOD only:**

- `POST /api/update-date/:id` – edit date
- `DELETE /api/delete-date/:id` – delete date
- `POST /api/dates/pay-single/:id` – record single payment (Valet)
- `POST /api/dates/pay-bulk` – bulk payments
- `GET /api/finance/worksheet/:dateID` – get worksheet
- `POST /api/finance/worksheet/:dateID/items` – add/edit ledger items
- `DELETE /api/finance/worksheet/item/:ledgerID` – delete ledger item
- `POST /api/finance/worksheet/:dateID/publish` – publish settlement

---

## UI visibility (current behavior)

- **Header, footer, QuickAction FAB**: Shown only when `user.role === 'GOD'` or when GOD is impersonating another user (`testAsUserId` set). So non-GOD users do not see the main nav bar, footer, or floating “Add date / Create band” button unless the app is updated to show a different nav for them.
