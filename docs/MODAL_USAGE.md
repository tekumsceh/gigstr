# Modal usage across the app

All places that use a modal (overlay + box) or modal-like UI. **No modal has a close X button**; close by overlay click or action buttons.

| # | Location | Purpose | Implementation |
|---|----------|---------|----------------|
| 1 | **Avatar.jsx** | User menu: View profile, Logout | **Stay as is.** Card flyout (dropdown) from avatar, hover/click. |
| 2 | **QuickActionFAB.jsx** | Add date / Create band | **New look.** Flyout box attached by corner to plus button; no overlay, no X; two rows. |
| 3 | **AddDate.jsx** | Success after adding event | **Stay as is.** `modal-overlay` + `modal-content modal-success`. |
| 4 | **HomeView.jsx** | Event note / intelligence | **New look.** Flyout from trigger (View Notes); positioned under button or centered; overlay click to close. |
| 5 | **FinanceWorksheetView.jsx** | "What is this page?" info | **Stay as is.** `<Modal>` (no X). |
| 6 | **ValetView.jsx** | Pay single confirmation | **Stay as is.** `<Modal>` (no X) + action buttons. |
| 7 | **DateDetailView.jsx** | Delete event confirmation | **Stay as is.** `modal-overlay` + `modal-content modal-error` + buttons. |
| 8 | **BulkPay.jsx** | Review bulk payment | **Stay as is.** Inline overlay + custom box + Cancel/Execute. |
| 9 | **GlobalFooter.jsx** | My Bands list | **Stay as is.** Absolute box, no X; title + list. |

**Reusable components:**

- **components/Modal.jsx** – Used by FinanceWorksheetView, ValetView. Props: `isOpen`, `onClose`, `title`, `children`. No close X; overlay click closes.
- **components/ui/Modal.jsx** – Variant-aware (title optional). Check imports if used.
- **index.css** – `.modal-overlay`, `.modal-content`, `.modal-title`, `.modal-text`, `.modal-success`, `.modal-error`.
