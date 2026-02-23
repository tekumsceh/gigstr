import React, { useState } from 'react';
import { simulateWaterfall } from '../services/accountingService'; 

function BulkPay({ unpaidGigs = [], currentRate, onConfirm }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [showModal, setShowModal] = useState(false);

  const exchangeRate = currentRate?.exrateEurToRsd || 117.3;

  const baseAmountEur = currency === 'EUR' 
    ? parseFloat(amount || 0) 
    : parseFloat(amount || 0) / exchangeRate;

  const simulation = showModal ? simulateWaterfall(unpaidGigs, baseAmountEur) : null;

  const handleReview = () => {
    // 1. Scrub everything except digits and one decimal point
    let sanitized = amount.toString().replace(/[^0-9.]/g, '');
    
    // 2. Handle multiple dots and force 2 decimal places max
    const parts = sanitized.split('.');
    if (parts.length > 1) {
      sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    }

    const finalNum = parseFloat(sanitized);

    // 3. The "Zero/Empty" Guard
    if (!finalNum || finalNum <= 0) {
      alert("Please enter a valid positive amount.");
      setAmount('');
      return;
    }

    // 4. The 10,000 EUR "Are You Sure?" Guard
    if (baseAmountEur > 10000) {
      const doubleCheck = window.confirm(
        `Warning: You are recording a payment of ${baseAmountEur.toLocaleString()} EUR. Is this correct?`
      );
      if (!doubleCheck) {
        setAmount('');
        return;
    }
  }

    setAmount(sanitized);
    setShowModal(true);
  };

  const handleExecute = () => {
    onConfirm({
      totalAmountEur: baseAmountEur,
      originalAmountRec: parseFloat(amount),
      currency: currency,
      rate: exchangeRate
    });
    setShowModal(false);
    setAmount('');
  };

  return (
    <div className="bg-slate-900 border border-slate-700 p-4 rounded-md mb-4 shadow-xl">
      <h2 className="text-slate-300 text-[11px] font-black uppercase tracking-widest mb-3">
        Bulk Payment Cashier
      </h2>

      <div className="flex items-center gap-4">
        <input
          type="text" 
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            if (val.includes('.') && val.split('.')[1].length > 2) return;
            setAmount(val);
          }}
          onKeyDown={(e) => {
            const isControlKey = ['Backspace', 'Tab', 'Enter', 'Delete', 'Escape', '.'].includes(e.key);
            const isNumber = /[0-9]/.test(e.key);
            if (!isNumber && !isControlKey) {
              e.preventDefault();
            }
          }}
          placeholder="0.00"
          className="bg-slate-800 border border-slate-600 text-white p-2 rounded w-32 focus:outline-none focus:border-emerald-500 font-mono"
        />

        <div className="flex bg-slate-800 rounded border border-slate-600 overflow-hidden">
          <button
            onClick={() => setCurrency('EUR')}
            className={`px-3 py-2 text-[10px] font-black tracking-widest uppercase transition-colors ${
              currency === 'EUR' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            EUR
          </button>
          <button
            onClick={() => setCurrency('RSD')}
            className={`px-3 py-2 text-[10px] font-black tracking-widest uppercase transition-colors ${
              currency === 'RSD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            RSD
          </button>
        </div>

        <div className="flex-grow" />

        <button
          disabled={!amount || parseFloat(amount) <= 0}
          onClick={handleReview}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-[11px] font-black uppercase tracking-widest transition-colors shadow-lg"
        >
          Review Payment
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Confirm Distribution</h3>
            
            <div className="bg-slate-800 p-3 rounded border border-slate-700 mb-4 text-center">
              <p className="text-slate-300 text-xs uppercase font-bold tracking-widest">Processing Payment:</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {amount} {currency}
              </p>
              {currency === 'RSD' && (
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                  (Converted to approx {(baseAmountEur).toFixed(2)} EUR at rate {exchangeRate})
                </p>
              )}
            </div>

            <div className="mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">
                Waterfall Preview:
              </h4>
              {simulation?.updates.map((gig, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800 py-2">
                  <span className="text-slate-300 truncate pr-4 uppercase text-[11px] font-bold">
                    {gig.city} - {gig.venue}
                  </span>
                  <span className={`font-mono font-bold ${gig.isFullyPaid ? 'text-emerald-500' : 'text-orange-400'}`}>
                    +{gig.applied.toFixed(2)} EUR
                  </span>
                </div>
              ))}
              {simulation?.leftover > 0.01 && (
                <div className="flex justify-between items-center text-sm border-b border-slate-800 py-2 bg-slate-800/50 px-1 mt-1">
                  <span className="text-slate-500 italic text-[11px]">Unapplied leftover:</span>
                  <span className="font-mono font-bold text-slate-500">{simulation.leftover.toFixed(2)} EUR</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-[11px] font-black uppercase transition-colors">Cancel</button>
              <button onClick={handleExecute} className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg">Execute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkPay;