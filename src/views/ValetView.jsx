import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Listings from '../components/Listings';

const ValetView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyView, setCurrencyView] = useState('EUR');
  const [eurToRsd, setEurToRsd] = useState(117.2);
  
  const [bulkAmount, setBulkAmount] = useState('');
  
  const [filterYear, setFilterYear] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const valetFields = ['dateDate', 'dateCity', 'dateVenue', 'dateDescription', 'remainingBalance'];

  useEffect(() => {
    loadValetData();
  }, []);

  const loadValetData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dates?view=valet');
      setRawData(response.data);
    } catch (err) {
      console.error("Error loading valet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const uniquebandNames = [...new Set(rawData.map(item => item.bandName))].filter(Boolean);

  const filteredData = rawData.filter(gig => {
    const gigDate = new Date(gig.dateDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const balance = gig.datePrice - (gig.datePaidAmount || 0);
    
    const matchesYear = filterYear === 'all' || gigDate.getFullYear().toString() === filterYear;
    const matchesType = filterType === 'all' || gig.bandName === filterType;
    const isUnpaid = balance > 0;
    const isPast = gigDate < today;
    
    return matchesYear && matchesType && isUnpaid && isPast;
  });

  const processedData = filteredData.map(gig => {
    const balance = gig.datePrice - (gig.datePaidAmount || 0);
    const displayBalance = currencyView === 'RSD' 
      ? `${Math.round(balance * eurToRsd)} RSD` 
      : `${balance} ${gig.dateCurrency || 'EUR'}`;

    return { 
      ...gig, 
      remainingBalance: displayBalance, 
      id: gig.dateID || gig.id, 
      rawBalance: balance,
      dateDescription: gig.bandName === 'Trosak' ? gig.dateDescription : ''
    };
  });

  const totalBalance = processedData.reduce((acc, curr) => acc + curr.rawBalance, 0);

  const handleWaterfall = async () => {
    const strictRegex = /^\d+(\.\d{1,2})?$/;
    if (!strictRegex.test(bulkAmount)) {
      return alert("VALIDATION ERROR: Please enter a clean number. Symbols (+, -) are blocked.");
    }

    const inputVal = parseFloat(bulkAmount);
    if (processedData.length === 0) {
      return alert("PROCESS ERROR: No pending gigs in the current filtered view.");
    }

    let remainingPool = inputVal;
    if (currencyView === 'RSD') remainingPool = remainingPool / eurToRsd;

    const payments = [];
    const sortedGigs = [...processedData].sort((a, b) => new Date(a.dateDate) - new Date(b.dateDate));

    for (const gig of sortedGigs) {
      if (remainingPool <= 0.009) break; 
      let payAmount = Math.min(remainingPool, gig.rawBalance);
      payAmount = Math.round(payAmount * 100) / 100;
      if (payAmount > 0) {
        payments.push({ id: gig.id, amount: payAmount });
        remainingPool -= payAmount;
      }
    }

    const summary = `VALET WATERFALL PRE-FLIGHT:\n                  Total Input: ${inputVal} ${currencyView}\n                  Gigs Impacted: ${payments.length}\n                  Execute bulk payment?`;

    if (window.confirm(summary)) {
      try {
        await axios.post('/api/dates/pay-bulk', { 
          payments,
          originalAmount: inputVal,
          currency: currencyView,
          exchangeRate: eurToRsd 
        });
        setBulkAmount('');
        loadValetData();
      } catch (err) {
        alert("EXECUTION ERROR: Server rejected the transaction.");
      }
    }
  };

  return (
    <div className="w-[90%] max-w-[1400px] mx-auto h-full flex flex-col py-6 gap-6">
      
      <header className="flex justify-between items-center border-b border-slate-900 pb-6 pt-2 shrink-0">
        <div>
          <h1 className="text-[36px] font-black uppercase tracking-tighter text-orange-500 leading-none">Valet Terminal</h1>
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-[0.5em] mt-3 text-white/40">Debt Distribution Engine</p>
        </div>
        
        <div className="flex gap-12 items-center">            
          <div className="text-right pr-10 border-r border-slate-900">
            <span className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Total Debt</span>
            <span className="text-4xl font-black text-white leading-none tabular-nums block">
              {currencyView === 'RSD' ? Math.round(totalBalance * eurToRsd).toLocaleString() : totalBalance.toLocaleString()}
            </span>
            <div className="flex justify-end gap-1 mt-4">
              <button onClick={() => setCurrencyView('EUR')} className={`px-3 py-1 text-[9px] font-black rounded-sm border ${currencyView === 'EUR' ? 'bg-white text-black border-white' : 'border-slate-800 text-slate-500 hover:text-white'}`}>EUR</button>
              <button onClick={() => setCurrencyView('RSD')} className={`px-3 py-1 text-[9px] font-black rounded-sm border ${currencyView === 'RSD' ? 'bg-white text-black border-white' : 'border-slate-800 text-slate-500 hover:text-white'}`}>RSD</button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-x-6 p-4 h-auto bg-slate-900/20 border border-slate-900 rounded-sm shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Year</label>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-slate-950 border border-slate-800 text-slate-300 p-2 text-[12px] font-black uppercase focus:border-orange-500 outline-none">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-950 border border-slate-800 text-slate-300 p-2 text-[12px] font-black uppercase focus:border-orange-500 outline-none">
            <option value="all">All Types</option>
            {uniquebandNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-8 gap-8 flex-grow overflow-hidden">
        <div className="lg:col-span-6 h-full overflow-y-auto custom-scrollbar">
          <Listings 
            title={`Unpaid & Held (${processedData.length})`}
            fields={valetFields}
            manualData={processedData}
            loading={loading}
            isValetMode={true}
            renderActions={(item) => (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const amt = prompt("Amount:", item.rawBalance);
                  if (amt) axios.post(`/api/dates/pay-single/${item.id}`, { amount: amt }).then(loadValetData);
                }}
                className="px-6 py-2 border border-orange-600 text-orange-600 text-[10px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all tracking-widest"
              >Pay</button>
            )}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-2 bg-slate-900/20 border border-slate-900 rounded-sm p-6">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pay In Bulk ({currencyView})</label>
            <div className="flex flex-col gap-4">
              <input 
                type="number" 
                step="0.01"
                value={bulkAmount}
                onKeyDown={(e) => { if (["+", "-", "e", "E"].includes(e.key)) e.preventDefault(); }}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="0.00"
                className="bg-slate-950 border border-slate-800 text-white p-4 w-full outline-none font-black text-[18px] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={handleWaterfall} className="bg-orange-500 text-black px-8 py-4 text-[12px] font-black uppercase hover:bg-orange-400 transition-colors w-full">PAY BULK</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ValetView;
