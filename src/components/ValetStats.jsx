// components/valet/ValetStats.jsx
export const ValetStats = ({ value, currency, onCurrencyChange, eurToRsd }) => (
  <div className="text-right">
    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 text-right">
      Portfolio Debt
    </span>
    <span className="text-4xl font-black text-white leading-none tabular-nums block">
      {currency === 'RSD' 
        ? Math.round(value * eurToRsd).toLocaleString() 
        : value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </span>
    <div className="flex justify-end gap-1 mt-4 bg-slate-950 p-1 rounded border border-slate-800 w-fit ml-auto">
      {['EUR', 'RSD'].map(curr => (
        <button 
          key={curr} 
          onClick={() => onCurrencyChange(curr)}
          className={`px-3 py-1 text-[9px] font-black rounded ${currency === curr ? 'bg-white text-black' : 'text-slate-500'}`}
        >
          {curr}
        </button>
      ))}
    </div>
  </div>
);