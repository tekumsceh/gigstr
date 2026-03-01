import React, { useState, useMemo } from 'react';

function Calendar({ gigs = [], onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const gigMap = useMemo(() => {
    const map = {};
    gigs.forEach(gig => {
      const d = new Date(gig.dateDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(gig);
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
    <div className="w-full bg-slate-900/40 shadow-2xl rounded-xl">
      <div className="flex flex-col gap-2 mb-2 px-2 pt-2">        
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
          
          const dayGigs = item.isCurrentMonth ? (gigMap[dateStr] || []) : [];
          const hasGigs = dayGigs.length > 0;
          const isToday = dateStr === todayStr;
          const isPast = d < todayObj;

          // Default styles for an empty day
          let cellStyle = {
            backgroundColor: item.isCurrentMonth ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.4)',
            color: item.isCurrentMonth ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
            outline: isToday ? '2px solid #ffffff' : 'none',
            outlineOffset: '-2px',
            opacity: (isPast && hasGigs && !isToday) ? 0.5 : 1,
            zIndex: isToday ? 10 : 1
          };

          // Update styles if gigs exist
          if (hasGigs) {
            cellStyle.color = '#ffffff';
            
            if (dayGigs.length === 1) {
              // Single event: solid color
              cellStyle.backgroundColor = dayGigs[0].bandColor || '#fb923c';
            } else {
              // Multiple events: create a diagonal stripe pattern
              // This maps through the gigs and creates a CSS linear-gradient
              const gradientStops = dayGigs.map((gig, index) => {
                const percentage = (100 / dayGigs.length) * (index + 1);
                const prevPercentage = (100 / dayGigs.length) * index;
                const color = gig.bandColor || '#fb923c';
                return `${color} ${prevPercentage}%, ${color} ${percentage}%`;
              }).join(', ');
              
              cellStyle.background = `linear-gradient(135deg, ${gradientStops})`;
              cellStyle.backgroundColor = 'transparent'; // Override default bg
            }
          }

          return (
    <button
      key={idx}
      draggable={item.isCurrentMonth} // Only allow dragging days from the current month
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", dateStr);
        e.dataTransfer.effectAllowed = "copy";
        e.currentTarget.style.opacity = '0.5';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onClick={() => onSelectDate && onSelectDate(dayGigs, d)}
      className="aspect-square flex flex-col items-center justify-center text-[11px] font-black transition-all relative group cursor-grab active:cursor-grabbing"
      style={cellStyle}
    >
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <span className="relative z-10 drop-shadow-md">{item.day}</span>
      
      {/* Visual cues for gigs */}
      {dayGigs.length > 1 && (
        <div className="absolute top-1 right-1 flex gap-0.5">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse shadow-sm" />
            <div className="w-1 h-1 bg-white/50 rounded-full shadow-sm" />
        </div>
      )}

      {hasGigs && isToday && (
        <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full shadow-sm"></span>
      )}
    </button>
  );
})}
      </div>
    </div>
  );
}

export default Calendar;