import { useEffect, useMemo, useState } from 'react';
import PageWrapper from '../components/layouts/PageWrapper';
import SingleColumnLayout from '../components/layouts/SingleColumnLayout';
import { formatDateUniform } from '../utils/dateFormat';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'owed', label: 'Owed' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending settlement' }
];

const MyWalletView = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [logDateID, setLogDateID] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logLabel, setLogLabel] = useState('');
  const [logSaving, setLogSaving] = useState(false);

  const loadWallet = async (currentFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/my-wallet?filter=${encodeURIComponent(currentFilter)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`Failed to load wallet (${res.status})`);
      }
      const json = await res.json();
      setItems(json || []);
    } catch (err) {
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (id) => {
    setFilter(id);
    loadWallet(id);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!logDateID || !logAmount) return;
    setLogSaving(true);
    setError('');
    try {
      const res = await fetch('/api/my-wallet/log-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dateID: Number(logDateID),
          amount: parseFloat(logAmount),
          label: logLabel || undefined
        })
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `Failed to log payout (${res.status})`);
      }
      setLogDateID('');
      setLogAmount('');
      setLogLabel('');
      await loadWallet(filter);
    } catch (err) {
      setError(err.message || 'Failed to log payout');
    } finally {
      setLogSaving(false);
    }
  };

  const totals = useMemo(() => {
    let owed = 0;
    let paid = 0;
    items.forEach((item) => {
      const amt = Number(item.amount || 0);
      if (item.status === 'paid') paid += amt;
      else if (item.status === 'published') owed += amt;
    });
    return { owed, paid };
  }, [items]);

  return (
    <PageWrapper>
      <SingleColumnLayout title="My Wallet" maxWidth="max-w-[960px]">
        <div className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Summary */}
          <section className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Totals
              </div>
              <div className="space-y-0.5">
                <div>
                  <span className="font-semibold">Owed:</span> {totals.owed.toFixed(2)} €
                </div>
                <div>
                  <span className="font-semibold">Paid:</span> {totals.paid.toFixed(2)} €
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded border ${
                    filter === f.id
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          {/* Member log payment form */}
          <section className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 text-sm">
            <h2 className="font-semibold text-sm mb-3">Log a payout you received</h2>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Use this to record when you personally received money for a gig (e.g., cash from the
              organizer). Your band admin will quietly be notified.
            </p>
            <form
              onSubmit={handleLogSubmit}
              className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Gig ID (dateID)
                </label>
                <input
                  type="number"
                  value={logDateID}
                  onChange={(e) => setLogDateID(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="e.g. 42"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Amount (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="e.g. 150"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={logLabel}
                  onChange={(e) => setLogLabel(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="e.g. cash at venue, travel reimbursement"
                />
              </div>
              <div className="flex md:col-span-4 justify-end mt-1">
                <button
                  type="submit"
                  disabled={logSaving}
                  className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
                >
                  {logSaving ? 'Saving...' : 'Log payout'}
                </button>
              </div>
            </form>
          </section>

          {/* Ledger list */}
          <section className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 text-sm">
            <h2 className="font-semibold text-sm mb-3">My gigs & payouts</h2>
            {loading ? (
              <div className="text-sm text-[var(--text-muted)]">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">Nothing to show yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-left py-2 pr-3">Band</th>
                      <th className="text-left py-2 pr-3">Venue</th>
                      <th className="text-left py-2 pr-3">Label</th>
                      <th className="text-right py-2 pr-3">Amount</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-left py-2 pr-3">Settlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.ledgerID}
                        className="border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <td className="py-1.5 pr-3">
                          {formatDateUniform(item.dateDate)}
                        </td>
                        <td className="py-1.5 pr-3">{item.bandName || '—'}</td>
                        <td className="py-1.5 pr-3">
                          {item.venueName || '—'} {item.venueCity ? `(${item.venueCity})` : ''}
                        </td>
                        <td className="py-1.5 pr-3">{item.label}</td>
                        <td className="py-1.5 pr-3 text-right">
                          {Number(item.amount || 0).toFixed(2)} €
                        </td>
                        <td className="py-1.5 pr-3 capitalize">{item.status}</td>
                        <td className="py-1.5 pr-3">{item.settlementID || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </SingleColumnLayout>
    </PageWrapper>
  );
};

export default MyWalletView;

