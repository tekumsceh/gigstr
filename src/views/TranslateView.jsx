import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getMessages } from '../translations';
import { flattenMessages } from '../utils/flattenMessages';
import { LOCALES } from '../translations';
import { useAuth } from '../context/AuthContext';

const TARGET_LOCALES = LOCALES.filter((l) => l.code !== 'en');
const DEBOUNCE_MS = 600;

function TranslateView() {
  const [lang, setLang] = useState(TARGET_LOCALES[0]?.code ?? 'de');
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [historyKey, setHistoryKey] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);
  const { user } = useAuth();
  const [mergeStatus, setMergeStatus] = useState(null);

  const enFlat = flattenMessages(getMessages('en'));
  const staticLangFlat = flattenMessages(getMessages(lang));
  const keys = Object.keys(enFlat).sort();

  const getOverride = useCallback(
    (key) => overrides[key] ?? { value: staticLangFlat[key] ?? '', plural1: '', plural2: '' },
    [overrides, staticLangFlat]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get('/api/translate/overrides', { params: { lang }, withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        const map = {};
        (res.data?.list ?? []).forEach((o) => {
          map[o.key] = { value: o.value ?? '', plural1: o.plural1 ?? '', plural2: o.plural2 ?? '' };
        });
        setOverrides(map);
      })
      .catch(() => {
        if (!cancelled) setOverrides({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const saveOne = useCallback(
    (key, value, plural1, plural2) => {
      setSaveStatus('saving');
      axios
        .patch(
          '/api/translate',
          { lang, key, value: value ?? '', plural1: plural1 || null, plural2: plural2 || null },
          { withCredentials: true }
        )
        .then(() => {
          setOverrides((prev) => ({
            ...prev,
            [key]: { value: value ?? '', plural1: plural1 ?? '', plural2: plural2 ?? '' },
          }));
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch(() => {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(null), 3000);
        });
    },
    [lang]
  );

  const scheduleSave = useCallback(
    (key, value, plural1, plural2) => {
      pendingRef.current[key] = { value, plural1, plural2 };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const p = pendingRef.current[key];
        if (p) {
          delete pendingRef.current[key];
          saveOne(key, p.value, p.plural1, p.plural2);
        }
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [saveOne]
  );

  const handleCellChange = useCallback(
    (key, field, newVal) => {
      const o = getOverride(key);
      const next = { ...o, [field]: newVal };
      setOverrides((prev) => ({ ...prev, [key]: next }));
      scheduleSave(key, next.value, next.plural1, next.plural2);
    },
    [getOverride, scheduleSave]
  );

  const mergeToMaster = useCallback(() => {
    setMergeStatus('merging');
    axios
      .post('/api/translate/merge', {}, { withCredentials: true })
      .then((res) => {
        setMergeStatus(res.data?.backup ? `Merged. Backup: ${res.data.backup}` : 'Merged.');
        setTimeout(() => setMergeStatus(null), 4000);
      })
      .catch(() => {
        setMergeStatus('Merge failed');
        setTimeout(() => setMergeStatus(null), 3000);
      });
  }, []);

  const openHistory = useCallback((key) => {
    setHistoryKey(key);
    setHistoryLoading(true);
    setHistory([]);
    axios
      .get('/api/translate/history', { params: { lang, key }, withCredentials: true })
      .then((res) => setHistory(res.data?.history ?? []))
      .finally(() => setHistoryLoading(false));
  }, [lang]);


  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400">
        Loading translations…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-white">Translate</h1>
        <label className="flex items-center gap-2 text-slate-300">
          <span>Language:</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white"
          >
            {TARGET_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code.toUpperCase()} — {enFlat[l.labelKey] ?? l.labelKey}
              </option>
            ))}
          </select>
        </label>
        {saveStatus && (
          <span
            className={`text-sm ${
              saveStatus === 'saved' ? 'text-green-400' : saveStatus === 'error' ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save failed'}
          </span>
        )}
        {user?.role === 'GOD' && (
          <>
            <button
              type="button"
              onClick={mergeToMaster}
              disabled={mergeStatus === 'merging'}
              className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              {mergeStatus === 'merging' ? 'Merging…' : 'Merge to master'}
            </button>
            {mergeStatus && mergeStatus !== 'merging' && (
              <span className="text-sm text-slate-400">{mergeStatus}</span>
            )}
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="p-2 text-slate-400 font-medium text-xs uppercase w-48">Key</th>
              <th className="p-2 text-slate-400 font-medium text-xs uppercase">Original (English)</th>
              <th className="p-2 text-slate-400 font-medium text-xs uppercase">Translation</th>
              <th className="p-2 text-slate-400 font-medium text-xs uppercase w-40">Plural 1</th>
              <th className="p-2 text-slate-400 font-medium text-xs uppercase w-40">Plural 2</th>
              <th className="p-2 text-slate-400 font-medium text-xs uppercase w-20">History</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const orig = enFlat[key] ?? '';
              const o = getOverride(key);
              return (
                <tr key={key} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="p-2 text-slate-500 text-xs font-mono align-top">{key}</td>
                  <td className="p-2 text-slate-300 text-sm align-top whitespace-pre-wrap">{orig}</td>
                  <td className="p-1 align-top">
                    <textarea
                      value={o.value}
                      onChange={(e) => handleCellChange(key, 'value', e.target.value)}
                      className="w-full min-h-[2.5rem] bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white resize-y"
                      rows={orig.length > 60 ? 2 : 1}
                    />
                  </td>
                  <td className="p-1 align-top">
                    <input
                      type="text"
                      value={o.plural1}
                      onChange={(e) => handleCellChange(key, 'plural1', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <input
                      type="text"
                      value={o.plural2}
                      onChange={(e) => handleCellChange(key, 'plural2', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="p-2 align-top">
                    <button
                      type="button"
                      onClick={() => openHistory(key)}
                      className="text-xs text-orange-500 hover:text-orange-400"
                    >
                      History
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {historyKey && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setHistoryKey(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700">
              <h3 className="font-semibold text-white">History: {historyKey}</h3>
              <button
                type="button"
                onClick={() => setHistoryKey(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              {historyLoading ? (
                <p className="text-slate-400">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-slate-500">No history yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((h, i) => (
                    <li key={i} className="border-b border-slate-800 pb-2">
                      <div className="text-slate-400 text-xs">
                        {h.changed_at ? new Date(h.changed_at).toLocaleString() : '—'}
                      </div>
                      <div className="text-white">{(h.value ?? '').slice(0, 200)}{(h.value?.length > 200 ? '…' : '')}</div>
                      {(h.plural1 || h.plural2) && (
                        <div className="text-slate-500 text-xs">
                          Plural1: {h.plural1 || '—'} | Plural2: {h.plural2 || '—'}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranslateView;
