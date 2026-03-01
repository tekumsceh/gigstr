import React, { useState, useEffect } from 'react';
import Filtering from '../components/Filtering';

function AllEventsView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({}); // Stores the standardized { field: { op, val } }

  const loadData = async () => {
    setLoading(true);
    try {
      // We use POST now to send the filter object easily in the body
      const response = await fetch(`/api/query/dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      });
      
      const json = await response.json();
      setEvents(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // The badge logic remains the same (trusting the DB labels)
  const getStatusBadge = (ev) => {
    const label = ev.statusLabel || "";
    if (!label) return null;
    const dbColor = ev.statusColor || "#64748b"; 
    return (
      <span 
        style={{ color: dbColor, borderColor: `${dbColor}44`, backgroundColor: `${dbColor}15` }}
        className="font-bold text-[10px] uppercase tracking-wider border px-2 py-1 rounded whitespace-nowrap"
      >
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      <header className="px-6 py-4 border-b border-slate-900 bg-slate-950 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500">Master Schedule</h2>
        <div className="text-xl font-mono font-bold text-slate-400">{events.length} <span className="text-[10px] uppercase">Events</span></div>
      </header>

      {/* NEW SMART FILTER BAR */}
      <div className="w-full border-b border-slate-900 bg-slate-950/50 p-4">
         <Filtering 
            targetTable="dates" 
            onFilterChange={(newFilters) => setFilters(newFilters)} 
         />
      </div>

      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-10">
          <table className="w-full text-left border-collapse mt-2">
              <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-900">
                  <tr>
                      {['Date', 'City', 'Venue', 'Status'].map(h => (
                          <th key={h} className="py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">{h}</th>
                      ))}
                  </tr>
              </thead>
              <tbody className="font-mono text-sm">
                  {events.map((ev) => (
                      <tr key={ev.dateID} className="border-b border-slate-900 hover:bg-slate-900/40">
                          <td className="py-3 font-bold text-slate-300">
                            {new Date(ev.dateDate).toLocaleDateString('sr-RS')}
                          </td>
                          <td className="py-3 text-slate-400">{ev.dateCity}</td>
                          <td className="py-3 text-slate-200">{ev.dateVenue}</td>
                          <td className="py-3 text-right">{getStatusBadge(ev)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
}

export default AllEventsView;