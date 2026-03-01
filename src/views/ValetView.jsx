import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Listings from '../components/Listings';
import Modal from '../components/Modal';
import PageWrapper from '../components/layouts/PageWrapper';
import PageBanner from '../components/layouts/PageBanner';
import TwoColumnLayout from '../components/layouts/TwoColumnLayout';
import Filtering from '../components/Filtering';

const ValetView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyView, setCurrencyView] = useState('EUR');
  const [eurToRsd] = useState(117.2);
  
  const [bulkAmount, setBulkAmount] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showLimit, setShowLimit] = useState(20);
  const [payModalItem, setPayModalItem] = useState(null);
  const [payModalLoading, setPayModalLoading] = useState(false);

  // Initialize master filters
  const [activeFilters, setActiveFilters] = useState({
    year: 'all',
    bandID: 'all'
  });

  const valetFields = ['dateDate', 'dateCity', 'dateVenue', 'remainingBalance'];

  const loadValetData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dates?view=valet');
      setRawData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValetData();
  }, []);

  // Prepare dynamic options for the Filtering component
  const filterOptions = useMemo(() => {
    const years = [...new Set(rawData.map(item => 
      new Date(item.dateDate).getFullYear().toString()
    ))].sort((a, b) => b - a);

    const bands = [...new Map(rawData.map(item => [
      item.bandID, 
      { typeID: item.bandID, bandName: item.bandName }
    ])).values()].filter(b => b.bandName);

    return { years, bandID: bands };
  }, [rawData]);

  const processedData = useMemo(() => {
    return rawData.filter(gig => {
      const gigDate = new Date(gig.dateDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const balance = gig.datePrice - (gig.datePaidAmount || 0);
      
      const matchesYear = activeFilters.year === 'all' || gigDate.getFullYear().toString() === activeFilters.year;
      const matchesType = activeFilters.bandID === 'all' || gig.bandID?.toString() === activeFilters.bandID;
      const isUnpaid = balance > 0.01;
      const isPast = gigDate < today;
      
      return matchesYear && matchesType && isUnpaid && isPast;
    }).map(gig => {
      const balance = gig.datePrice - (gig.datePaidAmount || 0);
      const isWhole = Number.isInteger(balance) || Math.abs(balance % 1) < 0.001;
      const numStr = isWhole ? String(Math.round(balance)) : balance.toFixed(2);
      const displayBalance = currencyView === 'RSD'
        ? `${Math.round(balance * eurToRsd).toLocaleString()} RSD`
        : `${numStr} €`;

      return {
        ...gig,
        remainingBalance: displayBalance,
        id: gig.dateID || gig.id,
        rawBalance: balance,
        dateDescription: gig.bandName === 'Trosak' ? gig.dateDescription : ''
      };
    }).slice(0, showLimit); // Apply the row limit from Filtering
  }, [rawData, activeFilters, currencyView, eurToRsd, showLimit]);

  const totalBalance = useMemo(() => 
    processedData.reduce((acc, curr) => acc + curr.rawBalance, 0)
  , [processedData]);

  const handlePaySingleConfirm = async () => {
    if (!payModalItem) return;
    setPayModalLoading(true);
    try {
      await axios.post(`/api/dates/pay-single/${payModalItem.dateID || payModalItem.id}`);
      loadValetData();
      setPayModalItem(null);
    } catch (err) {
      alert('Payment failed. Please try again.');
    } finally {
      setPayModalLoading(false);
    }
  };

  const handleWaterfall = async () => {
    const strictRegex = /^\d+(\.\d{1,2})?$/;
    if (!strictRegex.test(bulkAmount)) {
      return alert("Please enter a valid amount (numbers only).");
    }

    const inputVal = parseFloat(bulkAmount);
    if (processedData.length === 0) {
      return alert("No pending items found to pay.");
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

    const summary = `PAYMENT SUMMARY:\nTotal Amount: ${inputVal} ${currencyView}\nItems affected: ${payments.length}\nProceed with bulk payment?`;

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
        alert("Payment failed. Please try again.");
      }
    }
  };

  return (
    <PageWrapper>
      <PageBanner 
        title="Valet"
        value={totalBalance}
        currency={currencyView}
        onCurrencyChange={setCurrencyView}
        eurToRsd={eurToRsd}
      />

      <TwoColumnLayout 
            mainContent={
              <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-900/10">
                
                {/* 1. THE TITLE - Our custom high-contrast header */}
                  <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-[15px] font-black uppercase tracking-[0.3em] text-white leading-none">
                      Outstanding <span className="text-orange-500">({processedData.length})</span>
                    </h2>
                  </div>

                {/* 2. THE FILTER - The "Toolbar" clamped to the table */}
                <Filtering 
                  options={filterOptions}
                  activeFilters={activeFilters}
                  onFilterChange={setActiveFilters}
                  showLimit={showLimit}
                  onLimitChange={setShowLimit}
                  viewMode={viewMode}
                  onViewChange={setViewMode}
                />

                {/* 3. THE LISTINGS */}
                <Listings 
                  title="" 
                  fields={valetFields}
                  manualData={processedData}
                  loading={loading}
                  isValetMode={true}
                  hideHeader={true}
                  viewMode={viewMode}
                  onValetItemClick={(item) => setPayModalItem(item)}
                  currencyView={currencyView}
                  eurToRsd={eurToRsd}
                  renderActions={viewMode === 'list' ? (item) => (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPayModalItem(item);
                      }}
                      className="px-4 py-1.5 border border-orange-500/50 text-orange-500 text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all rounded"
                    >
                      Pay
                    </button>
                  ) : undefined}
                />
              </div>
            }
        sideContent={
          <div className="flex flex-col gap-6">
            <div className="card p-6 border-orange-500/10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 border-b border-slate-800 pb-4">Bulk Payment</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Payment Amount ({currencyView})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={bulkAmount}
                    onKeyDown={(e) => { if (["+", "-", "e", "E"].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-field w-full text-xl font-mono text-white"
                  />
                </div>
                <button 
                  onClick={handleWaterfall} 
                  className="btn btn-primary w-full py-4 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/5"
                >
                  Distribute Funds
                </button>
                <div className="p-3 bg-slate-950 rounded border border-slate-800/50">
                  <p className="text-[8px] text-slate-500 uppercase font-black leading-relaxed text-center italic">
                    Funds will automatically settle the oldest debts first.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <Modal
        isOpen={!!payModalItem}
        onClose={() => !payModalLoading && setPayModalItem(null)}
        title="Pay this date?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-slate-200 text-sm leading-relaxed">
            {payModalItem && (
              <>Pay the full remaining balance for this date?</>
            )}
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => !payModalLoading && setPayModalItem(null)}
              className="px-4 py-2 text-slate-400 hover:text-white text-[11px] font-black uppercase transition-colors"
            >
              No
            </button>
            <button
              type="button"
              onClick={handlePaySingleConfirm}
              disabled={payModalLoading}
              className="px-6 py-2 rounded bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest shadow-lg"
            >
              {payModalLoading ? 'Processing...' : 'Yes'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default ValetView;