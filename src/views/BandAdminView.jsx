import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/layouts/PageWrapper';
import TwoColumnLayout from '../components/layouts/TwoColumnLayout';
import { formatDateUniform } from '../utils/dateFormat';

const MENU_ITEMS = [
  { id: 'finances', label: 'Finances' },
  { id: 'band-options', label: 'Band options' }
];

function BandAdminView() {
  const { id: bandID } = useParams();
  const navigate = useNavigate();
  const { getBandRole, loading: authLoading } = useAuth();

  const [band, setBand] = useState(null);
  const [activeMenu, setActiveMenu] = useState('finances');
  const [dates, setDates] = useState([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [worksheet, setWorksheet] = useState(null);
  const [worksheetDateID, setWorksheetDateID] = useState(null);
  const [worksheetLoading, setWorksheetLoading] = useState(false);
  const [error, setError] = useState('');

  const userRole = getBandRole(bandID);
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (!bandID || authLoading) return;
    if (!isAdmin) {
      setError('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const bandRes = await axios.get(`/api/bands/${bandID}`);
        if (!cancelled) setBand(bandRes.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || 'Failed to load band');
      }
    })();
    return () => { cancelled = true; };
  }, [bandID, authLoading, isAdmin]);

  useEffect(() => {
    if (activeMenu !== 'finances' || !bandID || !isAdmin) return;
    setDatesLoading(true);
    setError('');
    axios
      .get(`/api/band/${bandID}/admin/dates`, { withCredentials: true })
      .then((res) => setDates(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.error || err.message || 'Failed to load dates';
        if (!err.response) {
          setError('Cannot reach the API (fetch failed). Start the backend: cd backend && npm run start. Use the app at http://localhost:5173 so requests proxy to port 5000.');
        } else if (status === 404) {
          setError('API route not found. Restart the Gigstr backend (cd backend && npm run start).');
        } else {
          setError(msg);
        }
      })
      .finally(() => setDatesLoading(false));
  }, [activeMenu, bandID, isAdmin]);

  const openWorksheet = (dateID) => {
    setWorksheetDateID(dateID);
    setWorksheet(null);
    setWorksheetLoading(true);
    setError('');
    axios
      .get(`/api/band/${bandID}/admin/worksheet/${dateID}`, { withCredentials: true })
      .then((res) => setWorksheet(res.data))
      .catch((err) => {
        if (!err.response) {
          setError('Cannot reach the API. Is the backend running on port 5000?');
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to load worksheet');
        }
      })
      .finally(() => setWorksheetLoading(false));
  };

  const closeWorksheet = () => {
    setWorksheetDateID(null);
    setWorksheet(null);
  };

  if (authLoading) {
    return (
      <div className="p-20 text-center font-black uppercase text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <h2 className="text-red-500 font-black uppercase tracking-widest text-2xl">Access denied</h2>
        <p className="text-slate-400">Only band owners and admins can access this area.</p>
        <button
          onClick={() => navigate(`/band/${bandID}/manage`)}
          className="px-6 py-2 bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest mt-4 hover:bg-slate-700 transition-colors"
        >
          Back to band
        </button>
      </div>
    );
  }

  const sideContent = (
    <nav className="flex flex-col gap-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        Admin
      </div>
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActiveMenu(item.id)}
          className={`text-left px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
            activeMenu === item.id
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          {item.label}
        </button>
      ))}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => navigate(`/band/${bandID}/manage`)}
          className="text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300"
        >
          ← Back to roster
        </button>
      </div>
    </nav>
  );

  const financesOverview = () => {
    const totalGross = dates.reduce((s, d) => s + (Number(d.gross) || 0), 0);
    const totalPaid = dates.reduce((s, d) => s + (Number(d.totalPaid) || 0), 0);
    const totalExpenses = dates.reduce((s, d) => s + (Number(d.totalExpenses) || 0), 0);
    const totalPayouts = dates.reduce((s, d) => s + (Number(d.totalPayouts) || 0), 0);
    const currency = dates[0]?.currency || 'EUR';
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gross (all events)</div>
          <div className="text-lg font-bold text-white">{totalGross.toFixed(2)} {currency}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total paid in</div>
          <div className="text-lg font-bold text-emerald-400">{totalPaid.toFixed(2)} {currency}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Expenses</div>
          <div className="text-lg font-bold text-amber-400">{totalExpenses.toFixed(2)} {currency}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payouts (ledger)</div>
          <div className="text-lg font-bold text-sky-400">{totalPayouts.toFixed(2)} {currency}</div>
        </div>
      </div>
    );
  };

  const financesWorkspace = (
    <div className="flex flex-col gap-4">
      <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-4">
        Finances workspace
      </h2>
      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
          {error}
        </div>
      )}
      {datesLoading ? (
        <div className="text-sm text-slate-500">Loading dates…</div>
      ) : (
        <>
          {dates.length > 0 && financesOverview()}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Events — pricing / billing / expenses
            </div>
            {dates.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No events for this band.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800 bg-slate-900/60">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Venue</th>
                      <th className="text-right py-3 px-4">Gross</th>
                      <th className="text-right py-3 px-4">Paid in</th>
                      <th className="text-right py-3 px-4">Expenses</th>
                      <th className="text-right py-3 px-4">Payouts</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="py-3 px-4 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((d) => {
                      const gross = Number(d.gross) || 0;
                      const paid = Number(d.totalPaid) || 0;
                      const balance = gross - paid;
                      return (
                        <tr
                          key={d.dateID}
                          className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30 cursor-pointer"
                          onClick={() => openWorksheet(d.dateID)}
                        >
                          <td className="py-3 px-4 text-white">{formatDateUniform(d.dateDateFormatted || d.dateDate)}</td>
                          <td className="py-3 px-4 text-slate-300">{d.dateVenue || '—'}</td>
                          <td className="py-3 px-4 text-right text-white">{gross.toFixed(2)} {d.currency}</td>
                          <td className="py-3 px-4 text-right text-emerald-400">{paid.toFixed(2)} {d.currency}</td>
                          <td className="py-3 px-4 text-right text-amber-400">{(Number(d.totalExpenses) || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-sky-400">{(Number(d.totalPayouts) || 0).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs ${balance <= 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                              {balance <= 0 ? 'Settled' : 'Open'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Detail</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const bandOptionsWorkspace = (
    <div className="flex flex-col gap-4">
      <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-4">
        Band options
      </h2>
      <p className="text-slate-500 text-sm">More options will be added here later.</p>
    </div>
  );

  const workspaceContent = activeMenu === 'finances' ? financesWorkspace : bandOptionsWorkspace;

  return (
    <PageWrapper>
      <TwoColumnLayout
        reverse={true}
        sideContent={sideContent}
        mainContent={
          <div className="flex flex-col gap-4">
            {band && (
              <h1 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-2">
                {band.bandName} — Admin
              </h1>
            )}
            {workspaceContent}
          </div>
        }
      />

      {/* Detail panel (modal) for selected event worksheet */}
      {(worksheetDateID || worksheetLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60"
          onClick={closeWorksheet}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl h-full overflow-y-auto bg-slate-900 border-l border-slate-700 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Event finance detail"
          >
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Event finance detail
              </h3>
              <button
                type="button"
                onClick={closeWorksheet}
                className="p-2 text-slate-400 hover:text-white rounded"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex-1">
              {worksheetLoading ? (
                <div className="text-sm text-slate-500">Loading worksheet…</div>
              ) : worksheet ? (
                <BandAdminWorksheetDetail data={worksheet} />
              ) : (
                <div className="text-sm text-slate-500">No data.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function BandAdminWorksheetDetail({ data }) {
  const date = data?.date || {};
  const summary = data?.summary;
  const ledgerItems = data?.ledgerItems || [];
  const roster = data?.roster || [];

  const payoutsByUser = ledgerItems
    .filter((i) => i.category === 'payout' && i.targetUserID)
    .reduce((acc, i) => {
      const uid = i.targetUserID;
      if (!acc[uid]) acc[uid] = { amount: 0, items: [] };
      acc[uid].amount += Number(i.amount) || 0;
      acc[uid].items.push(i);
      return acc;
    }, {});

  const userName = (userID) => {
    const u = roster.find((r) => Number(r.userID) === Number(userID));
    return u?.displayName || u?.email || `User ${userID}`;
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-1 text-sm">
        <div className="font-semibold text-base text-white">
          {date.bandName || '—'} @ {date.venueName || '—'}
        </div>
        <div className="text-slate-400">
          {formatDateUniform(date.dateDate)} • {date.venueCity || '—'}, {date.venueCountry || '—'}
        </div>
        <div className="mt-2 text-sm">
          <span className="font-semibold text-slate-300">Gross:</span>{' '}
          <span className="text-white">{summary ? `${Number(summary.gross).toFixed(2)} ${date.dateCurrency || 'EUR'}` : '—'}</span>
        </div>
        {summary && (
          <div className="text-xs text-slate-400 space-y-1 mt-2">
            <div>Expenses: {Number(summary.totalExpenses).toFixed(2)} {date.dateCurrency}</div>
            <div>Payouts: {Number(summary.totalPayouts).toFixed(2)} {date.dateCurrency}</div>
            <div>Net after expenses: {Number(summary.netAfterExpenses).toFixed(2)} {date.dateCurrency}</div>
            <div>
              Balance:{' '}
              <span className={summary.balanced ? 'text-emerald-400' : 'text-amber-300'}>
                {summary.balanced ? 'Balanced' : 'Not balanced'}
              </span>
            </div>
          </div>
        )}
      </section>

      {Object.keys(payoutsByUser).length > 0 && (
        <section className="bg-slate-800/40 border border-slate-700 rounded-lg p-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Who is owed what</h4>
          <ul className="space-y-2">
            {Object.entries(payoutsByUser).map(([userID, { amount }]) => (
              <li key={userID} className="flex justify-between items-center text-sm">
                <span className="text-slate-300">{userName(userID)}</span>
                <span className="font-semibold text-white">{Number(amount).toFixed(2)} {date.dateCurrency}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-slate-800/40 border border-slate-700 rounded-lg p-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Ledger items</h4>
        {ledgerItems.length === 0 ? (
          <p className="text-sm text-slate-500">No ledger items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-700">
                  <th className="text-left py-2 pr-3">Category</th>
                  <th className="text-left py-2 pr-3">Label</th>
                  <th className="text-right py-2 pr-3">Amount</th>
                  <th className="text-left py-2 pr-3">Member</th>
                  <th className="text-left py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledgerItems.map((item) => (
                  <tr key={item.ledgerID} className="border-b border-slate-700/50 last:border-b-0">
                    <td className="py-1.5 pr-3 capitalize text-slate-300">{item.category.replace('_', ' ')}</td>
                    <td className="py-1.5 pr-3 text-slate-300">{item.label}</td>
                    <td className="py-1.5 pr-3 text-right text-white">{Number(item.amount || 0).toFixed(2)}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{item.targetUserName || (item.targetUserID ? userName(item.targetUserID) : '—')}</td>
                    <td className="py-1.5 pr-3 capitalize text-slate-400">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default BandAdminView;
