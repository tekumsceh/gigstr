import React from 'react';

// Zero-dependency icons
const ListIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const GridIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

function Filtering({ 
  options = {}, 
  activeFilters = {}, // Default to empty object to prevent undefined errors
  onFilterChange, 
  showLimit, 
  onLimitChange,
  viewMode = 'list',
  onViewChange,
  yearLabel = 'Timeline',
  bandLabel = 'Category',
  showYearFilter = true,
  showBandFilter = true,
  showRowLimit = true,
  title, // Optional: renders on the left (e.g. "Upcoming Schedule")
}) {
  
  const update = (field, value) => {
    if (onFilterChange) {
      onFilterChange({ ...activeFilters, [field]: value });
    }
  };

  return (
    <div className="flex items-center bg-[#0f172a] border-y border-slate-800 w-full py-1 px-2 gap-4">
      
      {title && (
        <div className="pr-4 border-r border-slate-800">
          <span className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">
            {title}
          </span>
        </div>
      )}
      
      {/* 1. YEAR FILTER */}
      {showYearFilter && (
      <div className="flex items-center gap-2 px-3 border-r border-slate-800">
        <span className="text-[9px] text-slate-100 font-black uppercase tracking-widest">
          {yearLabel}
        </span>
        <select 
          className="bg-transparent border-none text-slate-400 text-[10px] font-bold focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 outline-none uppercase"
          onChange={(e) => update('year', e.target.value)}
          value={activeFilters?.year || 'all'}
        >
          <option value="all" className="bg-slate-900 text-white">All Years</option>
          {options.years?.map(year => (
            <option key={year} value={year} className="bg-slate-900 text-white">{year}</option>
          ))}
        </select>
      </div>
      )}

      {/* 2. BAND FILTER */}
      {showBandFilter && (
      <div className="flex items-center gap-2 px-3 border-r border-slate-800">
        <span className="text-[9px] text-slate-100 font-black uppercase tracking-widest">
          {bandLabel}
        </span>
        <select 
          className="bg-transparent border-none text-slate-400 text-[10px] font-bold focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 outline-none uppercase"
          onChange={(e) => update('bandID', e.target.value)}
          value={activeFilters?.bandID || 'all'}
        >
          <option value="all" className="bg-slate-900 text-white">All Types</option>
          {options.bandID?.map(opt => (
            // FIX: Using opt.bandID for the key and value instead of opt.typeID, 
            // assuming your data structure uses bandID for bands.
            <option key={opt.bandID || opt.typeID} value={opt.bandID || opt.typeID} className="bg-slate-900 text-white">
              {opt.bandName}
            </option>
          ))}
        </select>
      </div>
      )}

      <div className="flex-grow" />
      
      {/* 3. SETTINGS & VIEW */}
      <div className="flex items-center gap-4">
        
        {/* Row Limit Toggles */}
        {showRowLimit && onLimitChange && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Rows</span>
            <div className="flex items-center gap-1">
              {[20, 40].map(num => (
                <button
                  key={num}
                  type="button" // Important so it doesn't trigger form submissions if used inside one
                  onClick={() => onLimitChange(num)}
                  className={`text-[9px] font-black px-2 py-0.5 rounded transition-all ${
                    showLimit === num ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Switches */}
        {onViewChange && (
          <div className="flex items-center border-l border-slate-800 pl-4 py-1">
            <button
              type="button"
              onClick={() => onViewChange('list')}
              className={`px-2 py-1 transition-all ${viewMode === 'list' ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
              aria-label="List View"
            >
              <ListIcon />
            </button>
            <button
              type="button"
              onClick={() => onViewChange('grid')}
              className={`px-2 py-1 transition-all ${viewMode === 'grid' ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
              aria-label="Grid View"
            >
              <GridIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Filtering;