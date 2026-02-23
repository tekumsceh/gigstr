import React from 'react';
import { useNavigate } from 'react-router-dom';

function Listings({ title, fields, manualData, loading, renderActions, onViewNote, hideHeader }) {
  const navigate = useNavigate();

  const formatHeader = (key) => {
    if (!key || typeof key !== 'string') return '';
    if (key === 'dateDescription') return 'NOTES';
    if (key === 'remainingBalance') return 'BALANCE';
    return key.replace('date', '').toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-[12px] font-black uppercase tracking-[0.4em] text-slate-600 animate-pulse">
        Scanning Ledger...
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
                            /* The container now has no extra margins */
                            <div className="flex flex-col items-center justify-center leading-[0.8] py-1 w-fit">
                              <span className="text-[16px] font-black text-white">
                                {new Date(rawValue).getDate()}
                              </span>
                              <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest mt-0.5">
                                {new Date(rawValue).toLocaleString('en-GB', { month: 'short' })}
                              </span>
                            </div>
                          ) : 
                  /* 2. NOTES LOGIC (ONLY IF IN FIELDS ARRAY) */
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
                        ) : (
                          /* 3. DEFAULT COLUMN LOGIC */
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