import React from 'react';
import { useNavigate } from 'react-router-dom';

function Listings({ title, fields, manualData, loading, mode, renderActions, onViewNote }) {
  const navigate = useNavigate();

  // Standardizes headers by removing 'date' prefix
  const formatHeader = (key) => {
    if (!key || typeof key !== 'string') return '';
    if (key === 'dateDescription') return 'NOTES';
    return key.replace('date', '').toUpperCase();
  };

  // Helper for HomeView notes excerpt
  const getExcerpt = (text) => {
    if (!text || typeof text !== 'string' || text.trim() === "") return '...';
    const words = text.split(' ');
    return words.slice(0, 2).join(' ') + (words.length > 2 ? '...' : '');
  };

  if (loading) {
    return (
      <div className="p-10 text-slate-500 font-black uppercase tracking-widest text-[14px]">
        Scanning Ledger...
      </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-6 flex justify-between items-center shrink-0">
        <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">
          {title}
        </h2>
      </div>

      {/* Header Row */}
      <div className="flex px-6 mb-2 shrink-0">
        {fields.map((field, index) => (
          <div key={`h-${index}`} className="flex-1 text-[11px] font-black text-slate-600 uppercase tracking-[0.3em]">
            {formatHeader(field)}
          </div>
          ))}
        {renderActions && <div className="w-32 shrink-0"></div>}
      </div>

      {/* Scrollable Data Rows */}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-[10px]">
          {manualData.map((item, rowIndex) => {
            const accentColor = item.bandColor || '#334155';
            const statusColor = item.statusColor || '#1e293b';
            const rowKey = item.dateID || item.id || `row-${rowIndex}`;

            return (
              <div
                key={rowKey}
                onClick={() => navigate(`/date/${rowKey}`)}
                className="flex items-center bg-slate-950/40 hover:bg-slate-800/20 transition-all cursor-pointer border-y border-slate-800/50"
                style={{
                  borderLeft: `4px solid ${accentColor}`,
                  borderRight: `4px solid ${statusColor}`,
                  boxShadow: `inset 2px 0 20px ${statusColor}1A`
                }}
              >
                {fields.map((field, colIndex) => {
                  const rawValue = item[field];

                  return (
                    <div key={`c-${rowKey}-${colIndex}`} className="flex-1 p-6 overflow-hidden">
                      <div className="flex flex-col justify-center h-full">
                        {field === 'dateDescription' ? (
                          item.dateDescription && 
                          item.dateDescription.toString().trim() !== "0" && 
                          item.dateDescription.toString().trim().length > 3 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); 
                                onViewNote(item.dateDescription);
                              }}
                              /* cursor-default: keeps the mouse from changing to a hand 
                                 transition-all: makes the scale and color move smoothly
                                 hover:scale-110: grows the text/dot by 10%
                                 hover:text-orange-400: brightens the text
                              */
                              className="w-fit group/note flex items-center gap-2 cursor-default transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                              <span className="text-[10px] font-black text-orange-500/60 group-hover/note:text-orange-400 transition-colors uppercase tracking-widest">
                                [ View Notes ]
                              </span>
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)] group-hover/note:bg-white transition-colors"></div>
                            </button>
                            ) : (
                            <span className="text-slate-700 text-[10px] uppercase font-black">—</span>
                            )
                            ) : (
                            <span className="text-[18px] font-black text-slate-200 uppercase tracking-tight truncate">
                              {field === 'dateDate' && typeof rawValue === 'string' 
                              ? rawValue.substring(0, 10) 
                              : (rawValue || '—')}
                            </span>
                            )}
                          </div>
                        </div>
                        );
                })}

                {/* Action Column */}
                {renderActions && (
                  <div className="px-6 flex justify-end items-center w-32 shrink-0">
                    {renderActions(item)}
                  </div>
                  )}
              </div>
              );
          })}
        </div>
      </div>
    </div>
    );
}

export default Listings;
