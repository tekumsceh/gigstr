// src/components/layouts/PageBanner.jsx
import React from 'react';

function formatAmount(num, currency, eurToRsd) {
  if (currency === 'RSD') {
    const n = Math.round(num * (eurToRsd || 117.2));
    return `${n.toLocaleString()} RSD`;
  }
  const isWhole = Number.isInteger(num) || Math.abs(num % 1) < 0.001;
  const str = isWhole ? String(Math.round(num)) : num.toFixed(2);
  return `${str} €`;
}

const PageBanner = ({ title, subtitle, actions, value, currency, onCurrencyChange, eurToRsd = 117.2 }) => {
  const showValetRight = value != null && onCurrencyChange;
  return (
    <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-800 pb-8 shrink-0 gap-6 w-full">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-[0.4em] text-white leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-500/60 mt-4 leading-none">
            {subtitle}
          </p>
        )}
      </div>

      {showValetRight && (
        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <span className="text-2xl font-black text-orange-500 tabular-nums leading-none">
            {formatAmount(value, currency, eurToRsd)}
          </span>
          <div className="flex rounded border border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => onCurrencyChange('EUR')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                currency === 'EUR' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              EUR
            </button>
            <button
              type="button"
              onClick={() => onCurrencyChange('RSD')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                currency === 'RSD' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              RSD
            </button>
          </div>
        </div>
      )}
      
      {actions && !showValetRight && (
        <div className="w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageBanner;
export { formatAmount };