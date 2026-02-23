import React, { useState, useMemo } from 'react';

function Calendar({ title = "Schedule", gigs = [], onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const gigMap = useMemo(() => {
    const map = {};
    gigs.forEach(gig => {
      const d = new Date(gig.dateDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map[dateKey] = gig;
    });
    return map;
  }, [gigs]);

  const startCol = new Date(year, month, 1).getDay() || 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const now = new Date();
  const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const changeMonth = (newMonth) => setViewDate(new Date(year, newMonth, 1));
  const changeYear = (newYear) => setViewDate(new Date(newYear, month, 1));

  return (
    <div className="w-full max-w-sm p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl font-sans">
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="text-white font-black uppercase tracking-tight text-lg pl-1">{title}</h3>
        
        <div className="flex justify-between items-center bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
          <select 
            value={month} 
            onChange={(e) => changeMonth(parseInt(e.target.value))}
            className="bg-transparent text-slate-200 font-bold text-xs uppercase outline-none cursor-pointer px-2 py-1"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={`month-${i}`} value={i} className="bg-slate-800 text-slate-200">
                {new Date(0, i).toLocaleString('en-GB', { month: 'long' })}
              </option>
            ))}
          </select>

          <select 
            value={year} 
            onChange={(e) => changeYear(parseInt(e.target.value))}
            className="bg-transparent text-slate-400 font-bold text-xs outline-none cursor-pointer px-2 py-1"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={`year-${y}`} value={y} className="bg-slate-800 text-slate-200">{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {/* FIX 1: Unique keys for Day Labels */}
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l, i) => (
          <b key={`label-${i}`} className="text-center text-[9px] font-black text-white/90 uppercase tracking-widest mb-2">{l}</b>
        ))}
        
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const currentIterationDate = new Date(year, month, d);
          const gig = gigMap[dateStr];
          const isToday = dateStr === todayStr;
          const isPast = currentIterationDate < todayObj;

          let bgColor = 'rgba(51, 65, 85, 0.4)'; 
          let textColor = '#f8fafc'; 
          let opacity = '1';

          if (isToday) {
            bgColor = '#1d4ed8'; 
            textColor = '#ffffff';
          } 
          
          if (gig) {
            bgColor = gig.bandColor || '#fb923c'; 
            textColor = '#ffffff';
            if (isPast && !isToday) opacity = '0.4';
          }

          return (
            <button
              /* FIX 2: Specific date string as key for the grid */
              key={`day-${dateStr}`}
              onClick={() => gig && onSelectDate ? onSelectDate(gig) : null}
              style={{ 
                gridColumnStart: d === 1 ? startCol : 'auto',
                backgroundColor: bgColor, 
                color: textColor,
                opacity: opacity
              }}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-bold transition-all relative
                ${gig ? 'cursor-pointer hover:opacity-100 hover:scale-105 shadow-md ring-1 ring-white/10' : 'cursor-default'}
                ${!gig && !isToday ? 'hover:bg-slate-700/60' : ''}
              `}
            >
              {d}
              {gig && !isPast && <span className="absolute bottom-1 w-1 h-1 bg-white/60 rounded-full"></span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-3">
        {Array.from(new Set(gigs.map(g => g.bandName))).map((typeValue, idx) => {
          const color = gigs.find(g => g.bandName === typeValue)?.bandColor;
          return (
            /* FIX 3: Combine name and index for the legend key */
            <div key={`legend-${typeValue}-${idx}`} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.1)]" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{typeValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;