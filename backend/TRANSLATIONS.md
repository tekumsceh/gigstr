# Translation storage and master backup

## Folders

- **`translation-overrides/`** (working) — Where translator edits are saved. Safe to clear for a fresh start; use master or backup to restore.
- **`translation-master/`** — Canonical copy. Only updated by **Merge to master** (GOD only). Treat as the backup no one should delete.
- **`translation-master-backup/`** — Timestamped backups of master, created automatically each time you run **Merge to master** (e.g. `2026-03-07T14-30-00`).

## Flow

1. Translators edit on the Translate page → saves go to **working** only.
2. App and Translate UI read **merged** data (master + working; working wins).
3. When you’re happy with changes, a **GOD** user clicks **Merge to master**: current master is backed up, then working is copied to master. Master stays safe; only this action updates it.

## Production build and visibility of translation files

- **Dev**: In browser DevTools → Sources you see `src/translations/en.js`, `de.js`, etc. because Vite serves source files.
- **Production** (`npm run build`): The app is bundled and minified. Those separate files disappear; their content is inside one or a few JS chunks. So the translation **file list** is no longer visible in Sources. The **strings** are still in the client bundle (needed for the app to run).
- If you need translation strings **not** in the client at all (e.g. for secrecy), the next step would be to load messages only from the API (e.g. `GET /api/translate/overrides?lang=...`) and not ship static translation files in the bundle. Right now the app uses static JS files + overrides from the API.
