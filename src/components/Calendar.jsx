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

  const allDays = useMemo(() => {
    const days = [];
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const prefixDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    for (let i = prefixDays - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: month - 1, year, isCurrentMonth: false });
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month, year, isCurrentMonth: true });
    }
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const changeMonth = (newMonth) => setViewDate(new Date(year, newMonth, 1));
  const changeYear = (newYear) => setViewDate(new Date(newYear, month, 1));

  return (
    <div className="card w-full p-6 bg-slate-900/40 border border-slate-800 shadow-2xl">
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">
          {title}
        </h3>
        
        <div className="flex justify-between items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800/50">
          <select 
            value={month} 
            onChange={(e) => changeMonth(parseInt(e.target.value))}
            className="bg-transparent text-slate-200 font-bold text-[10px] uppercase outline-none cursor-pointer px-2 py-1"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i} className="bg-slate-900 text-slate-200">
                {new Date(0, i).toLocaleString('en-GB', { month: 'long' })}
              </option>
            ))}
          </select>

          <select 
            value={year} 
            onChange={(e) => changeYear(parseInt(e.target.value))}
            className="bg-transparent text-slate-400 font-bold text-[10px] outline-none cursor-pointer px-2 py-1"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} className="bg-slate-900 text-slate-200">{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-800 border border-slate-800 overflow-hidden rounded-md shadow-inner">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l, i) => (
          <div key={i} className="bg-slate-900/90 py-3 border-b border-slate-800">
            <b className="block text-center text-[9px] font-black text-slate-100 uppercase tracking-[0.2em]">
              {l}
            </b>
          </div>
        ))}
        
        {allDays.map((item, idx) => {
          const d = new Date(item.year, item.month, item.day);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          const gig = item.isCurrentMonth ? gigMap[dateStr] : null;
          const isToday = dateStr === todayStr;
          const isPast = d < todayObj;

          // 1. Text Whiteness Logic
          // Active month: Bright (90%), Ghost days: Muted (30%)
          let textColor = item.isCurrentMonth ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)';
          
          // 2. Cell Background Logic
          let cellBg = item.isCurrentMonth ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.4)';

          if (gig) {
            cellBg = gig.bandColor || '#fb923c';
            textColor = '#ffffff';
          }

          return (
            <button
              key={idx}
              onClick={() => gig && onSelectDate ? onSelectDate(gig) : null}
              className={`
                aspect-square flex flex-col items-center justify-center text-[11px] font-black transition-all relative group
                ${gig ? 'cursor-pointer' : 'cursor-default'}
              `}
              style={{ 
                backgroundColor: cellBg, 
                color: textColor,
                outline: isToday ? '2px solid #ffffff' : 'none',
                outlineOffset: '-2px',
                opacity: (isPast && gig && !isToday) ? 0.5 : 1,
                zIndex: isToday ? 10 : 1
              }}
            >
              {/* Hover Overlay Layer */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <span className="relative z-10">{item.day}</span>
              
              {/* Optional: subtle dot for gigs on Today so it's extra clear */}
              {gig && isToday && (
                <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
        {Array.from(new Set(gigs.map(g => g.bandName))).map((typeValue, idx) => {
          const color = gigs.find(g => g.bandName === typeValue)?.bandColor;
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{typeValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;