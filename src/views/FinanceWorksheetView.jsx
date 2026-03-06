import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SingleColumnLayout from '../components/layouts/SingleColumnLayout';
import PageWrapper from '../components/layouts/PageWrapper';
import Modal from '../components/Modal';

const FinanceWorksheetView = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [form, setForm] = useState({
    category: 'expense',
    label: '',
    amount: '',
    targetUserID: ''
  });

  const loadWorksheet = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/worksheet/${encodeURIComponent(id)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`Failed to load worksheet (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to load worksheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadWorksheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!form.label.trim() || !form.amount) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        category: form.category,
        label: form.label.trim(),
        amount: parseFloat(form.amount),
        targetUserID: form.targetUserID ? Number(form.targetUserID) : null
      };
      const res = await fetch(`/api/finance/worksheet/${encodeURIComponent(id)}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `Failed to add item (${res.status})`);
      }
      setForm({
        category: 'expense',
        label: '',
        amount: '',
        targetUserID: ''
      });
      await loadWorksheet();
    } catch (err) {
      setError(err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (ledgerID) => {
    if (!window.confirm('Delete this line item?')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/worksheet/item/${encodeURIComponent(ledgerID)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `Failed to delete item (${res.status})`);
      }
      await loadWorksheet();
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Publish this settlement? This will notify affected members.')) return;
    setPublishing(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/worksheet/${encodeURIComponent(id)}/publish`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `Failed to publish (${res.status})`);
      }
      await loadWorksheet();
    } catch (err) {
      setError(err.message || 'Failed to publish settlement');
    } finally {
      setPublishing(false);
    }
  };

  const isGod = user?.role === 'GOD';

  const summary = data?.summary;
  const date = data?.date;
  const ledgerItems = data?.ledgerItems || [];
  const roster = data?.roster || [];

  return (
    <PageWrapper>
      <SingleColumnLayout maxWidth="max-w-[980px]">
        {!isGod && (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            You need GOD access to view and edit the finance worksheet.
          </div>
        )}

        {isGod && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-[13px] font-black uppercase tracking-[0.25em] text-slate-200">
                Finance worksheet
              </h1>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="h-7 w-7 rounded-full border border-slate-600 text-[11px] font-black flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:border-slate-400"
                aria-label="What is this page?"
              >
                i
              </button>
            </div>
            {loading && <div className="text-sm text-[var(--text-muted)]">Loading worksheet...</div>}
            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
                {error}
              </div>
            )}

            {date && (
              <section className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 space-y-1 text-sm">
                <div className="font-semibold text-base">
                  {date.bandName || '—'} @ {date.venueName || '—'}
                </div>
                <div className="text-[var(--text-muted)]">
                  {date.dateDate?.substring(0, 10)} • {date.venueCity || '—'},{' '}
                  {date.venueCountry || '—'}
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-semibold">Gross:</span>{' '}
                  {summary ? `${summary.gross.toFixed(2)} ${date.dateCurrency}` : '—'}
                </div>
                {summary && (
                  <div className="text-xs text-[var(--text-muted)] space-y-1 mt-1">
                    <div>
                      Expenses: {summary.totalExpenses.toFixed(2)} {date.dateCurrency}
                    </div>
                    <div>
                      Payouts: {summary.totalPayouts.toFixed(2)} {date.dateCurrency}
                    </div>
                    <div>
                      Net after expenses: {summary.netAfterExpenses.toFixed(2)} {date.dateCurrency}
                    </div>
                    <div>
                      Balance check:{' '}
                      <span className={summary.balanced ? 'text-emerald-400' : 'text-amber-300'}>
                        {summary.balanced ? 'Balanced' : 'Not balanced (Gross ≠ Expenses + Payouts)'}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {isGod && !loading && (
              <>
                {/* Add item form */}
                <section className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4">
                  <h2 className="font-semibold text-sm mb-3">Add line item</h2>
                  <form
                    onSubmit={handleAddItem}
                    className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm items-end"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        Category
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                      >
                        <option value="expense">Expense</option>
                        <option value="payout">Payout</option>
                        <option value="band_fund">Band fund</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        Label
                      </label>
                      <input
                        name="label"
                        value={form.label}
                        onChange={handleChange}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                        placeholder="e.g. Gas, Lead singer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        Amount
                      </label>
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={handleChange}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        Member (optional)
                      </label>
                      <select
                        name="targetUserID"
                        value={form.targetUserID}
                        onChange={handleChange}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                      >
                        <option value="">None</option>
                        {roster.map((m) => (
                          <option key={m.userID} value={m.userID}>
                            {m.displayName || m.email} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex md:col-span-5 justify-end mt-1">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Add item'}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Ledger items */}
                <section className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm">Ledger items</h2>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishing || !ledgerItems.some((i) => i.status === 'draft')}
                      className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
                    >
                      {publishing ? 'Publishing...' : 'Publish settlement'}
                    </button>
                  </div>

                  {ledgerItems.length === 0 ? (
                    <div className="text-sm text-[var(--text-muted)]">No ledger items yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                            <th className="text-left py-2 pr-3">Category</th>
                            <th className="text-left py-2 pr-3">Label</th>
                            <th className="text-right py-2 pr-3">Amount</th>
                            <th className="text-left py-2 pr-3">Member</th>
                            <th className="text-left py-2 pr-3">Status</th>
                            <th className="text-left py-2 pr-3">Settlement</th>
                            <th className="py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerItems.map((item) => (
                            <tr
                              key={item.ledgerID}
                              className="border-b border-[var(--border-subtle)] last:border-b-0"
                            >
                              <td className="py-1.5 pr-3 capitalize">
                                {item.category.replace('_', ' ')}
                              </td>
                              <td className="py-1.5 pr-3">{item.label}</td>
                              <td className="py-1.5 pr-3 text-right">
                                {Number(item.amount || 0).toFixed(2)}
                              </td>
                              <td className="py-1.5 pr-3">
                                {item.targetUserName || item.targetUserID || '—'}
                              </td>
                              <td className="py-1.5 pr-3 capitalize">
                                {item.status}
                              </td>
                              <td className="py-1.5 pr-3">
                                {item.settlementID || '—'}
                              </td>
                              <td className="py-1.5 text-right">
                                {item.status !== 'paid' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.ledgerID)}
                                    className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </SingleColumnLayout>

      <Modal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="Finance Worksheet"
      >
        <p className="mb-3 text-sm">
          This private administrative tool is used to reconcile the finances for this specific event.
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
          <li>Allocate Revenue: Distribute the Event Gross into Expenses and Personnel Payouts.</li>
          <li>Balance Validation: Ensure the settlement reaches a net-zero balance (Gross = Expenses + Payouts).</li>
          <li>Finalize: Publish the worksheet to lock the ledger and notify personnel of their specific earnings.</li>
          <li>Audit Trail: Paid entries are immutable to ensure a permanent, untampered financial history.</li>
        </ul>
      </Modal>
    </PageWrapper>
  );
};

export default FinanceWorksheetView;

