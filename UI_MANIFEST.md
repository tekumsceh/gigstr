# Gigstr UI Manifest & Consolidation Plan

## 1. Design DNA (The HomeView Standard)
* **Base Background:** `#020617` (Slate-950)
* **Element Background:** `#1e293b` (Slate-800)
* **Highlight/Focus:** `#f97316` (Orange-500)
* **Primary Action:** `#3b82f6` (Blue-500)
* **Fonts:** `Inter` (Base), Uppercase + Tracking-Widest + Weight-900 (Accents/Inputs)

## 2. The Core Elements (Atoms)
All components must use these global CSS classes defined in `index.css`:
* `.standard-card`: Glassmorphism dark card for wrapping content.
* `.gig-input` / `.gig-select`: Standardized form fields.
* `.gig-btn` (`-primary`, `-ghost`): Standardized actions.
* `.detail-value`: 24px bold text for high-contrast data (dates, prices).

## 3. The Modal Standard (No Native Alerts)
All confirmations, edits, and alerts must use the custom modal wrapper:
* `.modal-overlay`: Blurs the background app.
* `.modal-container`: The floating slate-900 box.
* `.modal-header`: Contains the Orange `.modal-title`.
* `.modal-body`: For descriptions and forms.
* `.modal-footer`: For right-aligned `.gig-btn` actions.

## 4. Rollout & Cleanup Roadmap
- [x] Phase 1: Lock in `index.css` with `@layer` definitions.
- [x] Phase 2: Create reusable React component for `Modal`.
- [ ] Phase 3: Create reusable React component for `Button` & `Input`.
- [ ] Phase 4: Refactor `HomeView.jsx` to use new global classes.
- [ ] Phase 5: Refactor `Listings.jsx` to use `.standard-card` and new Modal.
- [ ] Phase 6: Refactor `Filtering.jsx` inputs.