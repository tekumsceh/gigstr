/**
 * Integration test: verifies gigstr-finance and Gigstr backend are wired and reachable.
 * Run from gigstr backend: node scripts/test-finance-integration.js
 * Requires .env with FINANCE_APP_URL, FINANCE_INTERNAL_KEY (and optional GIGSTR_URL).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

function cleanUrl(s, defaultVal) {
  if (!s || typeof s !== 'string') return defaultVal;
  return s.trim().replace(/[,;\s]+$/, '').replace(/\/+$/, '') || defaultVal;
}

const FINANCE_URL = cleanUrl(process.env.FINANCE_APP_URL, 'http://127.0.0.1:3002');
const FINANCE_KEY = (process.env.FINANCE_INTERNAL_KEY || '').trim().replace(/[,;\s]+$/, '');
const GIGSTR_URL = cleanUrl(process.env.GIGSTR_URL, 'http://localhost:5000');

async function run() {
  console.log('Config: GIGSTR_URL=%s, FINANCE_APP_URL=%s, FINANCE_INTERNAL_KEY=%s', GIGSTR_URL, FINANCE_URL || '(none)', FINANCE_KEY ? '***' : '(not set)');
  console.log('(GIGSTR_URL must be the backend, e.g. http://localhost:5000, not the Vite dev server)\n');

  const results = { passed: 0, failed: 0, skipped: 0 };
  const log = (name, ok, msg = '') => {
    if (ok) {
      results.passed++;
      console.log(`  \u2713 ${name}`);
    } else {
      results.failed++;
      console.log(`  \u2717 ${name}${msg ? ': ' + msg : ''}`);
    }
  };
  const skip = (name, reason) => {
    results.skipped++;
    console.log(`  - ${name} (skipped: ${reason})`);
  };

  console.log('\n--- Finance integration checks ---\n');

  if (!FINANCE_KEY) {
    skip('Finance internal API', 'FINANCE_INTERNAL_KEY not set');
  } else {
    try {
      const r = await fetch(`${FINANCE_URL}/health`);
      const ok = r.ok;
      const data = ok ? await r.json().catch(() => ({})) : null;
      log('Finance /health', ok && data?.status === 'ok', ok ? '' : `status ${r.status}`);
    } catch (e) {
      log('Finance /health', false, e.message);
    }

    try {
      const r = await fetch(`${FINANCE_URL}/internal/ping`, {
        headers: { 'X-Internal-Key': FINANCE_KEY },
      });
      const ok = r.ok;
      const data = ok ? await r.json().catch(() => ({})) : null;
      log('Finance /internal/ping (with key)', ok && data?.ok === true, ok ? '' : `status ${r.status}`);
    } catch (e) {
      log('Finance /internal/ping', false, e.message);
    }

    try {
      const r = await fetch(`${FINANCE_URL}/internal/summary-for-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Key': FINANCE_KEY },
        body: JSON.stringify({ dateIDs: [] }),
      });
      const ok = r.ok;
      const data = ok ? await r.json().catch(() => ({})) : null;
      log('Finance POST /internal/summary-for-dates', ok && typeof data === 'object', ok ? '' : `status ${r.status}`);
    } catch (e) {
      log('Finance summary-for-dates', false, e.message);
    }
  }

  console.log('');
  console.log('--- Gigstr backend ---\n');

  try {
    const r = await fetch(`${GIGSTR_URL}/api/statuses`);
    let msg = '';
    if (!r.ok) {
      const text = await r.text();
      msg = `status ${r.status}${text ? ': ' + text.slice(0, 120) : ''}`;
    }
    log('Gigstr GET /api/statuses', r.ok, msg);
  } catch (e) {
    log('Gigstr /api/statuses', false, e.message + ' (is the backend running?)');
  }

  if (FINANCE_URL && FINANCE_KEY) {
    try {
      const r = await fetch(`${GIGSTR_URL}/api/dates?year=all`);
      const ok = r.ok;
      const data = ok ? await r.json().catch(() => null) : null;
      const hasShape = Array.isArray(data) && (data.length === 0 || (data[0] && 'dateID' in data[0] && ('datePrice' in data[0] || 'datePaidAmount' in data[0])));
      log('Gigstr GET /api/dates (shape)', ok && (data?.length === 0 || hasShape), ok ? '' : `status ${r.status}`);
    } catch (e) {
      log('Gigstr /api/dates', false, e.message);
    }
  } else {
    skip('Gigstr /api/dates (finance shape)', 'finance not configured');
  }

  console.log('\n--- Summary ---');
  console.log(`  Passed: ${results.passed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
  if (results.failed > 0) {
    process.exit(1);
  }
  console.log('  All checks passed.\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
