/**
 * Client for gigstr-finance internal API. Only used when FINANCE_APP_URL is set.
 * All requests send X-Internal-Key; Gigstr passes userId where required.
 */

function cleanUrl(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().replace(/[,;\s]+$/, '').replace(/\/+$/, '');
}

const BASE = cleanUrl(process.env.FINANCE_APP_URL || '');
const KEY = (process.env.FINANCE_INTERNAL_KEY || '').trim().replace(/[,;\s]+$/, '');

function enabled() {
  return Boolean(BASE && KEY);
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Key': KEY,
  };
}

async function request(method, path, body = null) {
  if (!enabled()) {
    const err = new Error('Finance app not configured (FINANCE_APP_URL)');
    err.code = 'FINANCE_DISABLED';
    throw err;
  }
  const url = `${BASE.replace(/\/$/, '')}${path}`;
  const opt = { method, headers: headers() };
  if (body != null && (method === 'POST' || method === 'PUT')) {
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(url, opt);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || `Finance API ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function getWorksheet(dateID) {
  return request('GET', `/internal/worksheet/${dateID}`);
}

async function createLedgerItem(dateID, body) {
  return request('POST', `/internal/worksheet/${dateID}/items`, body);
}

async function deleteLedgerItem(ledgerID) {
  return request('DELETE', `/internal/worksheet/item/${ledgerID}`);
}

async function publishSettlement(dateID) {
  return request('POST', `/internal/worksheet/${dateID}/publish`);
}

async function getMyLedger(userId, filter = 'all') {
  const q = new URLSearchParams({ userId: String(userId), filter });
  return request('GET', `/internal/my-ledger?${q}`);
}

async function logPayment(userId, dateID, amount, label) {
  return request('POST', '/internal/log-payment', { userId, dateID, amount, label });
}

async function dateCreated(dateID, bandID, dateDate, venueID = null, amount = null, currency = null) {
  const body = { dateID, bandID, dateDate, venueID };
  if (amount != null) body.amount = amount;
  if (currency != null) body.currency = currency;
  return request('POST', '/internal/date-created', body);
}

async function dateDeleted(dateID) {
  return request('POST', '/internal/date-deleted', { dateID });
}

async function summaryForDates(dateIDs) {
  return request('POST', '/internal/summary-for-dates', { dateIDs });
}

async function setRevenue(dateID, bandID, amount, currency) {
  return request('POST', '/internal/set-revenue', { dateID, bandID, amount, currency });
}

async function recordPayment(dateID, amountEUR, amountOriginal, currency, exchangeRate) {
  return request('POST', '/internal/record-payment', { dateID, amountEUR, amountOriginal, currency, exchangeRate });
}

async function recordPaymentsBulk(payments, currency, exchangeRate) {
  return request('POST', '/internal/record-payments-bulk', { payments, currency, exchangeRate });
}

module.exports = {
  enabled,
  getWorksheet,
  createLedgerItem,
  deleteLedgerItem,
  publishSettlement,
  getMyLedger,
  logPayment,
  dateCreated,
  dateDeleted,
  summaryForDates,
  setRevenue,
  recordPayment,
  recordPaymentsBulk,
};
