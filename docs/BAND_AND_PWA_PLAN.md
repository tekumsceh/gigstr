# Band Management Redesign & PWA Plan

**Purpose:** Plan and explanation only — pros/cons and options. No implementation is prescribed here; implement when you decide.

---

## 1. Band Management – Current State

- **Route:** `/band/:id/manage` (BandManagementView).
- **Access:** Any **band member** can open the page (rejected only if not a member).
- **Content:**
  - **All members:** Band name, current roster (list with role/status, remove button only if permitted).
  - **Owner/Admin only:** Sidebar with “Add new member” (invite by email + assign role). Others see a “Restricted” lock message.
- **Roles:** `owner`, `admin`, `bandit`. Owner/admin can invite and remove (admin cannot remove owner).

Finance worksheet is **separate**: linked from Date Detail as “Open finance worksheet”, and currently **GOD-only** (global admin). It is not yet part of band management.

---

## 2. Redesign & Owner/Admin Area – Plan

### 2.1 Goals

- **Redesign** the band management page (clearer layout, navigation).
- **Introduce an “Admin” area** for **owner and admin only**, where band-level management lives (finance first, more later).
- Keep a **member-facing** view (roster, band info) for all members.

### 2.2 Option A – Single page with tabs

**Idea:** One URL `/band/:id/manage` with two tabs: **Roster** (all members) and **Admin** (owner/admin only). Admin tab contains Finance entry (list of band’s gigs → link to worksheet per date) and room for more sections later.

| Pros | Cons |
|------|------|
| Single place for “manage this band”; no extra routes. | Tabs can get crowded if Admin gets many sections (Finance, Settings, Setlists, etc.). |
| Role check once; show/hide Admin tab by role. | Deep-linking to “Finance” is still “this page, Admin tab” (no `/band/1/admin/finance`). |
| Simple mental model: Roster vs Admin. | |
| Easy to add a third tab (e.g. “Info”) later. | |

### 2.3 Option B – Sub-routes

**Idea:** `/band/:id/manage` = Roster for all. `/band/:id/manage/admin` or `/band/:id/admin` = Admin area (owner/admin only), with its own sub-routes or tabs (e.g. `/band/:id/admin/finance`).

| Pros | Cons |
|------|------|
| Shareable / bookmarkable URLs for each admin section. | More routes and guards to maintain. |
| Scales to many admin sections without one page getting huge. | Slightly more complex navigation (back to band, then Admin, then Finance). |
| Clear separation: “manage” = roster, “admin” = owner-only area. | Overkill if you only ever have Finance (and one or two more) in Admin. |

### 2.4 Recommendation (for planning)

- **Start with Option A (tabs)** if you want minimal change and expect only a few admin sections (Finance + maybe band settings).
- **Choose Option B (sub-routes)** if you want shareable admin URLs or expect many admin sections (Finance, Settings, Setlists, Documents, etc.).

You can also start with A and later introduce sub-routes for Admin when the single Admin tab feels too full.

### 2.5 Opening finance to band owner/admin (vs keeping GOD-only)

**Today:** Only users with global role GOD can open the finance worksheet. Band owner/admin have no access.

**Change:** Allow access if the user is **band owner or admin** for that gig’s band (in addition to GOD).

| Pros | Cons |
|------|------|
| Band leads manage their own finances without needing a global admin. | You must enforce “band of this date” correctly in backend (middleware like `isBandAdminForDate(dateID)`). |
| Aligns with “Admin” area in band management (Finance lives there). | Slightly more permission logic and tests. |
| GOD can remain as oversight / support access. | |

**Backend:** Add middleware that, for a given `dateID`, resolves `bandID` from the date, then checks `band_members` for current user with `role IN ('owner','admin')` and `status = 'active'`. Use it on all worksheet routes alongside `isGod`.  

**Frontend:** Show “Open finance worksheet” on Date Detail when the user is band owner/admin for that gig’s band (or GOD). In Band Admin tab, list the band’s dates with a link to `/date/:dateID/finance` for each.

### 2.6 Implementation order (when you implement)

1. **Backend:** Add `isBandAdminForDate(dateID)` (and optionally `isBandAdmin(bandID)`), use it on finance worksheet routes alongside `isGod`.
2. **Frontend – Band Management:**
   - Redesign layout (header, clearer roster, optional tabs).
   - Add “Admin” tab (owner/admin only) with a “Finance” block: fetch band’s dates, link each to `/date/:dateID/finance`.
3. **Frontend – Date Detail:** Show finance worksheet button for band owner/admin (and GOD).
4. **Route guard:** Protect `/date/:id/finance` so only GOD or band owner/admin for that date’s band can open it (backend already enforced; frontend can hide/redirect if not allowed).

---

## 3. PWA (Progressive Web App) – Plan & Explanation

### 3.1 What is a PWA (in this context)

A PWA is a web app that can be **installed** (e.g. “Add to Home Screen”) and, if you add a service worker, can **cache assets** for faster loads or limited offline use. Browsers treat it more like an app (standalone window, icon, sometimes splash screen).

### 3.2 What you need to implement it

| Requirement | Purpose |
|-------------|--------|
| **Web App Manifest** | Name, short name, icons (e.g. 192×192, 512×512), theme/background color, `display: standalone` (or `minimal-ui`), start URL. Tells the browser how to show the app when “installed”. |
| **Service worker** (optional but common) | Can cache HTML/JS/CSS (and optionally API responses) so the app loads from cache when offline or slow network. Often generated by a build plugin (e.g. `vite-plugin-pwa`). |
| **HTTPS** | Required in production for service workers and install prompt. Localhost is treated as secure. |
| **Icons** | At least 192×192 and 512×512 for install UI and splash. |

### 3.3 Pros and cons of making Gigstr a PWA

| Pros | Cons |
|------|------|
| **Install to home screen** — one tap to open, app-like window (no browser chrome). | **Cache invalidation** — if you cache aggressively, users can see old code until the SW updates; need a strategy (e.g. `autoUpdate` vs `prompt`). |
| **Better on mobile** — full-screen, no address bar, can feel native. | **Offline is hard** — your app talks to the backend; true offline would need local storage/sync and more logic. |
| **Optional offline** — with a service worker you can cache the shell so the UI loads offline (API calls will fail unless you add offline handling). | **Build/config** — manifest + SW add a bit of build and deploy complexity. |
| **No app store** — deploy via your site; users “install” from the browser. | **iOS/Safari** — install and SW support exist but have quirks; test on device. |

### 3.4 Implementation options (when you do it)

- **Minimal (install only):** Add a `manifest.json` (or generate via plugin) and icons. Link manifest in `index.html`. No service worker. Result: installable, no caching.
- **Full (install + caching):** Use something like `vite-plugin-pwa` to generate the manifest and a service worker that caches the built assets. Choose `registerType: 'autoUpdate'` (SW updates in background) or `'prompt'` (ask user to reload when new version exists).

**Order of work:** (1) Manifest + icons + theme-color in HTML, (2) deploy on HTTPS and test “Add to Home Screen”, (3) optionally add plugin and service worker for caching.

---

## 4. “Advance” Field for Gig Pricing

Planned **after** band management and admin area:

- Add an **advance** field to the gig (e.g. amount paid or agreed in advance).
- **Storage:** In gigstr-finance (e.g. revenue/ledger or a dedicated field), and/or in Gigstr `dates` if you keep a non-finance copy. Prefer one source of truth (finance app).
- **UI:** Date Detail and/or Add/Edit Date (when not past) and Finance worksheet (e.g. as part of revenue or a separate line).
- **Use:** Display and use in settlement/waterfall (e.g. “Advance” vs “Balance on the night”) as needed.

This can be scoped in a follow-up task once the admin/finance flow is in place.
