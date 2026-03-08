const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Working = where translators save. Master = canonical backup; only updated by "Merge" (GOD).
const WORKING_DIR = path.join(__dirname, '..', 'translation-overrides');
const MASTER_DIR = path.join(__dirname, '..', 'translation-master');
const BACKUP_DIR = path.join(__dirname, '..', 'translation-master-backup');
const MAX_HISTORY = 50;
const SUPPORTED_LANGS = ['de', 'sr', 'ru', 'es'];

// Admin or translator only
const isGodOrTranslator = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const role = req.user?.role;
  if (role !== 'GOD' && role !== 'translator') {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  next();
};

// GOD only (e.g. merge to master)
const isGod = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (req.user?.role !== 'GOD') {
    return res.status(403).json({ error: 'Forbidden. Master admin only.' });
  }
  next();
};

function workingOverridesPath(lang) {
  return path.join(WORKING_DIR, `${lang}.json`);
}

function workingHistoryPath(lang) {
  return path.join(WORKING_DIR, `${lang}.history.json`);
}

function masterOverridesPath(lang) {
  return path.join(MASTER_DIR, `${lang}.json`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile(filePath, fallback) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

async function readWorkingOverrides(lang) {
  return readJsonFile(workingOverridesPath(lang), {});
}

async function readMasterOverrides(lang) {
  return readJsonFile(masterOverridesPath(lang), {});
}

// Merged = master + working (working wins). This is what the app and Translate UI see.
async function readMergedOverrides(lang) {
  const [master, working] = await Promise.all([
    readMasterOverrides(lang),
    readWorkingOverrides(lang),
  ]);
  return { ...master, ...working };
}

async function readHistory(lang) {
  return readJsonFile(workingHistoryPath(lang), []);
}

// GET overrides: serve merged (master + working) so app and Translate see latest. No auth so app can apply.
router.get('/api/translate/overrides', async (req, res) => {
  const lang = req.query.lang;
  if (!lang || !/^[a-z]{2}$/.test(lang)) {
    return res.status(400).json({ error: 'Invalid lang.' });
  }
  try {
    const obj = await readMergedOverrides(lang);
    const list = Object.entries(obj).map(([key, v]) => ({
      key,
      value: v.value ?? '',
      plural1: v.plural1 ?? '',
      plural2: v.plural2 ?? '',
    }));
    res.json({ list });
  } catch (err) {
    console.error('Translate overrides error:', err);
    res.status(500).json({ error: 'Failed to load overrides.' });
  }
});

// PATCH: write to working only. Master is never written here.
router.patch('/api/translate', isGodOrTranslator, async (req, res) => {
  const { lang, key, value, plural1, plural2 } = req.body;
  if (!lang || !/^[a-z]{2}$/.test(lang) || !key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Invalid lang or key.' });
  }
  const keyTrim = key.trim().slice(0, 120);
  if (!keyTrim) return res.status(400).json({ error: 'Key required.' });
  const userId = req.user?.userID ?? req.user?.id ?? null;
  try {
    await ensureDir(WORKING_DIR);
    const overrides = await readWorkingOverrides(lang);
    overrides[keyTrim] = {
      value: value ?? '',
      plural1: plural1 ?? '',
      plural2: plural2 ?? '',
    };
    await fs.writeFile(
      workingOverridesPath(lang),
      JSON.stringify(overrides, null, 2),
      'utf8'
    );

    const history = await readHistory(lang);
    history.unshift({
      key: keyTrim,
      value: value ?? '',
      plural1: plural1 ?? null,
      plural2: plural2 ?? null,
      changed_at: new Date().toISOString(),
      changed_by: userId,
    });
    const trimmed = history.slice(0, MAX_HISTORY);
    await fs.writeFile(
      workingHistoryPath(lang),
      JSON.stringify(trimmed, null, 2),
      'utf8'
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Translate save error:', err);
    res.status(500).json({ error: 'Failed to save.' });
  }
});

// GET history for a key (from working)
router.get('/api/translate/history', isGodOrTranslator, async (req, res) => {
  const { lang, key } = req.query;
  if (!lang || !key) return res.status(400).json({ error: 'lang and key required.' });
  try {
    const history = await readHistory(lang);
    const filtered = history
      .filter((h) => h.key === key)
      .slice(0, 30)
      .map((h) => ({
        value: h.value,
        plural1: h.plural1,
        plural2: h.plural2,
        changed_at: h.changed_at,
        changed_by: h.changed_by,
      }));
    res.json({ history: filtered });
  } catch (err) {
    console.error('Translate history error:', err);
    res.status(500).json({ error: 'Failed to load history.' });
  }
});

// Merge working → master (GOD only). Backs up current master first.
router.post('/api/translate/merge', isGod, async (req, res) => {
  try {
    await ensureDir(MASTER_DIR);
    await ensureDir(BACKUP_DIR);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupSubdir = path.join(BACKUP_DIR, timestamp);

    for (const lang of SUPPORTED_LANGS) {
      const masterPath = masterOverridesPath(lang);
      const workingPath = workingOverridesPath(lang);

      const working = await readJsonFile(workingPath, null);
      if (working === null) continue;

      // Backup current master if it exists
      try {
        await fs.access(masterPath);
        await ensureDir(backupSubdir);
        await fs.copyFile(masterPath, path.join(backupSubdir, `${lang}.json`));
      } catch (_) {}

      // Write working → master
      await fs.writeFile(
        masterPath,
        JSON.stringify(working, null, 2),
        'utf8'
      );
    }

    res.json({ ok: true, backup: timestamp });
  } catch (err) {
    console.error('Translate merge error:', err);
    res.status(500).json({ error: 'Failed to merge.' });
  }
});

module.exports = router;
