import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Filtering from '../components/Filtering';
import PageWrapper from '../components/layouts/PageWrapper';
import { useLanguage } from '../context/LanguageContext';
import { formatDateUniform } from '../utils/dateFormat';

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 320;

function AllEventsView() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({ years: [], bandID: [], statuses: [] });
  const [filters, setFilters] = useState({ year: 'all', bandID: 'all', status: 'all', timeline: 'all', paid: 'all', order: 'desc' });
  const [showLimit, setShowLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef(null);
  const prevFetchKeyRef = useRef('');

  const limit = useMemo(() => {
    if (showLimit === 'all') return PAGE_SIZE;
    return typeof showLimit === 'number' ? showLimit : 20;
  }, [showLimit]);
  const offset = showLimit === 'all' ? (currentPage - 1) * PAGE_SIZE : 0;
  const totalPages = useMemo(() => {
    if (showLimit === 'all' && total > 0) return Math.max(1, Math.ceil(total / PAGE_SIZE));
    return 1;
  }, [showLimit, total]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      searchDebounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dates/filter-options`);
        const data = await res.json();
        if (!cancelled) setFilterOptions({ years: [], bandID: [], statuses: [], ...data });
      } catch (e) {
        if (!cancelled) setFilterOptions({ years: [], bandID: [], statuses: [] });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const filterKey = JSON.stringify({ ...filters, limit, debouncedSearch });
    const filterKeyChanged = prevFetchKeyRef.current !== filterKey;
    if (filterKeyChanged) {
      prevFetchKeyRef.current = filterKey;
      setCurrentPage(1);
    }
    const effectiveOffset = filterKeyChanged ? 0 : offset;
    if (events.length === 0) setLoading(true);

    const params = new URLSearchParams();
    if (filters.year && filters.year !== 'all') params.set('year', String(filters.year));
    if (filters.bandID && filters.bandID !== 'all') params.set('bandID', String(filters.bandID));
    if (filters.status != null && filters.status !== 'all') params.set('status', String(filters.status));
    if (filters.timeline && filters.timeline !== 'all') params.set('timeline', String(filters.timeline));
    if (filters.paid && filters.paid !== 'all') params.set('paid', String(filters.paid));
    const orderVal = filters.order === 'desc' ? 'desc' : 'asc';
    params.set('order', orderVal);
    if (debouncedSearch) params.set('search', debouncedSearch);
    params.set('limit', String(limit));
    params.set('offset', String(effectiveOffset));

    const url = `/api/dates?${params.toString()}`;
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json && typeof json.total === 'number' && Array.isArray(json.dates)) {
          setEvents(json.dates);
          setTotal(json.total);
        } else if (Array.isArray(json)) {
          setEvents(json);
          setTotal(json.length);
        } else {
          setEvents([]);
          setTotal(0);
        }
      })
      .catch((err) => {
        if (!cancelled) setEvents([]), setTotal(0);
        console.error('Error loading events:', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, limit, offset, debouncedSearch]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getStatusBadge = (ev) => {
    const label = ev.statusLabel || ev.statusName || '';
    if (!label) return null;
    const dbColor = ev.statusColor || '#64748b';
    return (
      <span
        style={{ color: dbColor, borderColor: `${dbColor}44`, backgroundColor: `${dbColor}15` }}
        className="font-bold text-[10px] uppercase tracking-wider border px-2 py-1 rounded whitespace-nowrap"
      >
        {label}
      </span>
    );
  };

  const isPast = (dateStr) => {
    const d = new Date(String(dateStr).substring(0, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <PageWrapper className="flex flex-col flex-1 min-h-0 overflow-hidden py-0 gap-0 max-w-[1500px] mx-auto w-full px-4 md:px-6">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-950 text-slate-200" style={{ minHeight: 0, flex: '1 1 0%' }}>
        <header className="shrink-0 px-4 py-3 border-b border-slate-900 bg-slate-950 flex justify-between items-center">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-500">{t('allEvents.masterSchedule')}</h2>
          <div className="text-lg font-mono font-bold text-slate-400">
            {showLimit === 'all' ? total : events.length} <span className="text-[10px] uppercase">{t('allEvents.events')}</span>
          </div>
        </header>

        <div className="shrink-0 w-full border-b border-slate-900 bg-slate-950/50 px-4 py-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('allEvents.searchPlaceholder')}
            className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-500 text-sm font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 outline-none transition-colors"
            aria-label={t('allEvents.searchPlaceholder')}
          />
        </div>

        <div className="shrink-0 w-full border-b border-slate-900 bg-slate-950/50 p-4">
          <Filtering
            options={filterOptions}
            activeFilters={filters}
            onFilterChange={setFilters}
            showLimit={showLimit}
            onLimitChange={setShowLimit}
            showYearFilter={true}
            showBandFilter={true}
            showRowLimit={true}
          />
        </div>

        <div className="shrink-0 w-full border-b border-slate-800 bg-slate-950/30 px-4 py-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">{t('allEvents.status')}</span>
            <select
              value={filters.status || 'all'}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase px-2 py-1 rounded focus:border-orange-500 outline-none"
            >
              <option value="all" className="bg-slate-900">{t('filtering.allTypes')}</option>
              {(filterOptions.statuses || []).map((s) => (
                <option key={s.statusID} value={s.statusID} className="bg-slate-900">{s.statusName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">{t('allEvents.timeline')}</span>
            <select
              value={filters.timeline || 'all'}
              onChange={(e) => updateFilter('timeline', e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase px-2 py-1 rounded focus:border-orange-500 outline-none"
            >
              <option value="all" className="bg-slate-900">{t('allEvents.timelineAll')}</option>
              <option value="upcoming" className="bg-slate-900">{t('allEvents.timelineUpcoming')}</option>
              <option value="past" className="bg-slate-900">{t('allEvents.timelinePast')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">{t('allEvents.paid')}</span>
            <select
              value={filters.paid || 'all'}
              onChange={(e) => updateFilter('paid', e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase px-2 py-1 rounded focus:border-orange-500 outline-none"
            >
              <option value="all" className="bg-slate-900">{t('filtering.allTypes')}</option>
              <option value="paid" className="bg-slate-900">{t('allEvents.paidYes')}</option>
              <option value="unpaid" className="bg-slate-900">{t('allEvents.paidNo')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">{t('allEvents.sort')}</span>
            <select
              value={filters.order || 'desc'}
              onChange={(e) => updateFilter('order', e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase px-2 py-1 rounded focus:border-orange-500 outline-none"
            >
              <option value="asc" className="bg-slate-900">{t('allEvents.sortAsc')}</option>
              <option value="desc" className="bg-slate-900">{t('allEvents.sortDesc')}</option>
            </select>
          </div>
        </div>

<div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4" style={{ minHeight: 0, flex: '1 1 0%' }}>
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '6.5rem' }} />
              <col />
              <col />
              <col style={{ width: '6rem' }} />
            </colgroup>
            <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-900">
              <tr>
                <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-wider w-[6.5rem] shrink-0">{t('allEvents.date')}</th>
                <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-wider">{t('allEvents.city')}</th>
                <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-wider">{t('allEvents.venue')}</th>
                <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-wider">{t('allEvents.status')}</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 text-[12px] font-black uppercase tracking-wider">
                  {t('common.loading')}
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr
                  key={ev.dateID}
                  onClick={(e) => { e.stopPropagation(); navigate(`/date/${ev.dateID}`); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigate(`/date/${ev.dateID}`); } }}
                  className={`border-b border-slate-900 hover:bg-slate-900/40 cursor-pointer ${isPast(ev.dateDate) ? 'bg-slate-900/50 text-slate-500' : ''}`}
                >
                  <td
                    className={`py-3 font-bold tabular-nums w-[6.5rem] shrink-0 ${isPast(ev.dateDate) ? 'opacity-60' : ''}`}
                    style={{ color: ev.bandColor || (isPast(ev.dateDate) ? '#64748b' : '#cbd5e1') }}
                  >
                    {formatDateUniform(ev.dateDate)}
                  </td>
                  <td className={`py-3 truncate ${isPast(ev.dateDate) ? 'text-slate-600' : 'text-slate-400'}`}>{ev.dateCity}</td>
                  <td className={`py-3 truncate ${isPast(ev.dateDate) ? 'text-slate-600' : 'text-slate-200'}`}>{ev.dateVenue}</td>
                  <td className="py-3 text-right">{getStatusBadge(ev)}</td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>

        {showLimit === 'all' && totalPages > 1 && !loading && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-950/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {t('filtering.page')} {currentPage} {t('filtering.of')} {totalPages}
            </span>
            <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-[10px] font-black uppercase px-2 py-1 rounded border border-slate-600 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              {t('filtering.prev')}
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-[10px] font-black uppercase px-2 py-1 rounded border border-slate-600 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              {t('filtering.next')}
            </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default AllEventsView;
