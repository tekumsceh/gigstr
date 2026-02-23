import React from 'react';

function Filtering({ options = {}, activeFilters, onFilterChange, showLimit, onLimitChange }) {
  
  const update = (field, value) => {
    onFilterChange({ ...activeFilters, [field]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-6 bg-slate-900/80 p-3 rounded-md border border-slate-700 mb-4">
      
      {/* 1. YEAR FILTER */}
      <div className="flex flex-col">
        <span className="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-tighter">Year</span>
        <select 
          className="bg-transparent border-none text-slate-300 text-[11px] font-bold focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 outline-none uppercase"
          onChange={(e) => update('year', e.target.value)}
          value={activeFilters.year || 'all'}
        >
          <option value="all">ALL YEARS</option>
          {options.years?.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* 2. GIG TYPE */}
      <div className="flex flex-col">
        <span className="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-tighter">Category</span>
        <select 
          className="bg-transparent border-none text-slate-300 text-[11px] font-bold focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 outline-none uppercase"
          onChange={(e) => update('bandID', e.target.value)}
          value={activeFilters.bandID || 'all'}
        >
          <option value="all">ALL TYPES</option>
          {options.bandID?.map(opt => (
            <option key={opt.typeID} value={opt.typeID}>{opt.bandName}</option>
          ))}
        </select>
      </div>

      <div className="flex-grow" />
      
      {/* 3. VISIBILITY */}
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span>Display:</span>
        <div className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden">
          {[20, 40].map(num => (
            <button
              key={num}
              onClick={() => onLimitChange && onLimitChange(num)}
              className={`px-3 py-1 transition-colors ${showLimit === num ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Filtering;