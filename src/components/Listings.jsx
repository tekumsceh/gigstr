import React from 'react';
import { useNavigate } from 'react-router-dom';

function getCurrencySymbol(currency) {
  const c = (currency || 'EUR').toUpperCase();
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  if (c === 'RSD') return ' RSD';
  return ` ${c}`;
}

function formatMoney(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return '0';
  const isWhole = Number.isInteger(n) || Math.abs(n % 1) < 0.001;
  return isWhole ? String(Math.round(n)) : n.toFixed(2);
}

function Listings({ title, fields, manualData, loading, renderActions, onViewNote, hideHeader, viewMode = 'list', isValetMode = false, onValetItemClick, currencyView, eurToRsd = 117.2 }) {
  const navigate = useNavigate();

  const formatHeader = (key) => {
    if (!key || typeof key !== 'string') return '';
    if (key === 'dateDescription') return 'NOTES';
    if (key === 'remainingBalance') return 'BALANCE';
    if (key === 'statusName' || key === 'dateStatus') return 'STATUS';
    return key.replace('date', '').toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-[12px] font-black uppercase tracking-[0.4em] text-slate-600 animate-pulse">
        Scanning Ledger...
      </div>
    );
  }

  // Grid view: home (date, city, venue) or valet (date, price/balance)
  if (viewMode === 'grid') {
    const isValetGrid = isValetMode && typeof onValetItemClick === 'function';
    return (
      <div className="w-full flex flex-col overflow-hidden">
        {!hideHeader && title && (
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">
              {title}
            </h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 flex-grow custom-scrollbar overflow-y-auto">
          {manualData.map((item, rowIndex) => {
            const rowKey = item.dateID || item.id || `row-${rowIndex}`;
            const bgColor = item.bandColor || '#334155';
            const dateObj = new Date(item.dateDate);
            if (isValetGrid) {
              const paid = parseFloat(item.datePaidAmount || 0);
              const price = parseFloat(item.datePrice || 0);
              const owed = item.rawBalance != null ? item.rawBalance : (price - paid);
              const useRsd = currencyView === 'RSD';
              const rate = eurToRsd || 117.2;
              const displayPrice = useRsd ? Math.round(price * rate) : price;
              const displayOwed = useRsd ? Math.round(owed * rate) : owed;
              const sym = useRsd ? ' RSD' : getCurrencySymbol(item.dateCurrency);
              const fmt = useRsd ? (n) => n.toLocaleString() : formatMoney;
              const priceText = paid < 0.01
                ? `${fmt(displayPrice)}${sym}`
                : `${fmt(displayPrice)} / ${fmt(displayOwed)}${sym}`;
              return (
                <button
                  key={rowKey}
                  onClick={(e) => { e.stopPropagation(); onValetItemClick(item); }}
                  className="flex flex-col p-4 rounded-lg text-left transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] min-h-[100px]"
                  style={{ backgroundColor: bgColor }}
                >
                  <span className="text-[24px] font-black text-white tabular-nums leading-none">
                    {dateObj.getDate()}
                  </span>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest mt-1">
                    {dateObj.toLocaleString('en-GB', { month: 'short' })}
                  </span>
                  <span className="text-sm font-bold text-white tabular-nums mt-2">
                    {priceText}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={rowKey}
                onClick={() => navigate(`/date/${rowKey}`)}
                className="flex flex-col p-4 rounded-lg text-left transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] min-h-[100px]"
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-[24px] font-black text-white tabular-nums leading-none">
                  {dateObj.getDate()}
                </span>
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest mt-1">
                  {dateObj.toLocaleString('en-GB', { month: 'short' })}
                </span>
                <span className="text-sm font-bold text-white uppercase tracking-tight mt-2 truncate">
                  {item.dateCity || '—'}
                </span>
                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider truncate">
                  {item.dateVenue || '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col overflow-hidden">
      {!hideHeader && title && (
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">
            {title}
          </h2>
        </div>
      )}

      <div className="table-wrapper flex-grow custom-scrollbar">
        <table className="data-table w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-[0_1px_0_rgba(30,41,59,1)]">
            <tr>
              {fields.map((field, index) => (
                <th key={`h-${index}`} className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-100 border-b border-slate-800">
                  {formatHeader(field)}
                </th>
              ))}
              {renderActions && <th className="w-32 border-b border-slate-800"></th>}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-800/50">
            {manualData.map((item, rowIndex) => {
              const accentColor = item.bandColor || '#334155';
              const rowKey = item.dateID || item.id || `row-${rowIndex}`;

              // --- NEW: DYNAMIC STATUS CALCULATION ---
              const today = new Date().setHours(0,0,0,0);
              const gigDate = new Date(item.dateDate).setHours(0,0,0,0);
              const isPast = gigDate < today;

              return (
                <tr
                  key={rowKey}
                  onClick={() => navigate(`/date/${rowKey}`)}
                  className="group cursor-pointer hover:bg-slate-800/30 transition-colors"
                  style={{ borderLeft: `3px solid ${accentColor}` }}
                >
                  {fields.map((field, colIndex) => {
                    const rawValue = item[field];

                    return (
                        <td 
                          key={`c-${rowKey}-${colIndex}`} 
                          /* We reduce the left padding specifically for the date column */
                          className={`py-3 ${field === 'dateDate' ? 'pl-2 pr-4' : 'px-4'}`}
                        >
                          {field === 'dateDate' ? (
                            <div className="flex flex-col items-center justify-center leading-tight py-1 w-fit">
                              <span className="text-[28px] font-black text-white tabular-nums">
                                {new Date(rawValue).getDate()}
                              </span>
                              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1">
                                {new Date(rawValue).toLocaleString('en-GB', { month: 'short' })}
                              </span>
                            </div>
                          ) : 
                  /* NOTES LOGIC */
                        field === 'dateDescription' ? (
                          item.dateDescription && 
                          item.dateDescription.toString().trim() !== "0" && 
                          item.dateDescription.toString().trim().length > 3 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); 
                                onViewNote(item.dateDescription);
                              }}
                              className="group flex items-center gap-2"
                            >
                              <span className="text-[9px] font-black text-orange-500/60 group-hover:text-orange-400 uppercase tracking-widest transition-colors">
                                [ View Notes ]
                              </span>
                              <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse"></div>
                            </button>
                          ) : (
                            <span className="text-slate-800 text-[10px] font-black">—</span>
                          )
                        ) :
                  /* --- NEW: STATUS LOGIC --- */
                        (field === 'statusName' || field === 'dateStatus') ? (
                          <span 
                            className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-sm border whitespace-nowrap"
                            style={{ 
                              color: isPast ? "#64748b" : (item.statusColor || "#ffffff"), 
                              borderColor: isPast ? "#64748b40" : `${item.statusColor || "#ffffff"}40`, 
                              backgroundColor: isPast ? "#64748b10" : `${item.statusColor || "#ffffff"}10` 
                            }}
                          >
                            {isPast ? "DONE" : (item.statusName || rawValue || "UNKNOWN")}
                          </span>
                        ) : (
                          /* DEFAULT COLUMN LOGIC */
                          <span className={`text-[12px] font-bold uppercase tracking-tight ${field === 'remainingBalance' ? 'text-white tabular-nums' : 'text-slate-300'}`}>
                            {rawValue || '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  
                  {renderActions && (
                    <td className="w-32 text-right py-3 pr-6" onClick={(e) => e.stopPropagation()}>
                      {renderActions(item)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Listings;