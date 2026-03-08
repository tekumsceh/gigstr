import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import Listings from '../components/Listings';
import Modal from '../components/Modal';
import PageWrapper from '../components/layouts/PageWrapper';
import TwoColumnLayout from '../components/layouts/TwoColumnLayout';
import Filtering from '../components/Filtering';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatDateUniform } from '../utils/dateFormat';

const ValetView = () => {
  const { t } = useLanguage();
  const { eurToRsd } = useExchangeRate();

  const { calendarDates: rawData, bands, loading, refreshData } = useData();

  const [currencyView, setCurrencyView] = useState('EUR');

  const [bulkAmount, setBulkAmount] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showLimit, setShowLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [payModalItem, setPayModalItem] = useState(null);
  const [payModalLoading, setPayModalLoading] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    year: 'all',
    bandID: 'all'
  });

  const valetFields = ['dateDate', 'dateCity', 'dateVenue', 'remainingBalance'];

  // 2. Filter options (Ensuring we only look at PAST, UNPAID gigs for the Valet dropdowns)
  const filterOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Isolate only the gigs that actually owe money
    const eligibleGigs = rawData.filter(gig => {
      const gigDate = new Date(gig.dateDate);
      const balance = gig.datePrice - (gig.datePaidAmount || 0);
      return gigDate < today && balance > 0.01;
    });

    const years = [...new Set(eligibleGigs.map(item =>
      new Date(item.dateDate).getFullYear().toString()
    ))].sort((a, b) => b - a);

    // Create a fast lookup map from the global bands array
    const bandMap = new Map(bands.map(b => [String(b.bandID), b]));

    // Find every unique bandID that actually has an unpaid gig
    const activeBandIDs = new Set(eligibleGigs.map(gig => String(gig.bandID)));

    // Build the dropdown options, ensuring NO active gig is left behind
    const bandOptions = Array.from(activeBandIDs).map(id => {
      const matchedBand = bandMap.get(id);
      
      // If the backend hid the band, grab the name attached to the gig itself
      const gigNameFallback = eligibleGigs.find(g => String(g.bandID) === id)?.bandName;

      return {
        bandID: id,
        typeID: id,
        bandName: matchedBand?.bandName || gigNameFallback || 'Personal / Solo'
      };
    });

    return { years, bandID: bandOptions };
  }, [rawData, bands]);

  const PAGE_SIZE = 40;

  // 3. Full filtered list (no slice)
  const fullProcessedData = useMemo(() => {
    return rawData.filter(gig => {
      const gigDate = new Date(gig.dateDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const balance = gig.datePrice - (gig.datePaidAmount || 0);

      const matchesYear = activeFilters.year === 'all' || gigDate.getFullYear().toString() === activeFilters.year;
      const matchesType = activeFilters.bandID === 'all' || String(gig.bandID) === activeFilters.bandID;
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
    });
  }, [rawData, activeFilters, currencyView, eurToRsd]);

  const totalPages = useMemo(() => {
    if (showLimit === 'all') return Math.max(1, Math.ceil(fullProcessedData.length / PAGE_SIZE));
    return 1;
  }, [showLimit, fullProcessedData.length]);

  const processedData = useMemo(() => {
    if (showLimit === 'all') {
      const start = (currentPage - 1) * PAGE_SIZE;
      return fullProcessedData.slice(start, start + PAGE_SIZE);
    }
    const limit = typeof showLimit === 'number' ? showLimit : 20;
    return fullProcessedData.slice(0, limit);
  }, [fullProcessedData, showLimit, currentPage]);

  const totalBalance = useMemo(() =>
    fullProcessedData.reduce((acc, curr) => acc + curr.rawBalance, 0)
  , [fullProcessedData]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters.year, activeFilters.bandID, showLimit]);

  // 4. Update payment functions to use refreshData(), memoized with useCallback
  const handlePaySingleConfirm = useCallback(async () => {
    if (!payModalItem) return;
    setPayModalLoading(true);
    try {
      await axios.post(`/api/dates/pay-single/${payModalItem.dateID || payModalItem.id}`);
      refreshData();
      setPayModalItem(null);
    } catch (err) {
      alert(t('valet.paymentFailed'));
    } finally {
      setPayModalLoading(false);
    }
  }, [payModalItem, refreshData, t]);

  const handleWaterfall = useCallback(async () => {
    const strictRegex = /^\d+(\.\d{1,2})?$/;
    if (!strictRegex.test(bulkAmount)) {
      return alert(t('valet.enterValidAmount'));
    }

    const inputVal = parseFloat(bulkAmount);
    if (processedData.length === 0) {
      return alert(t('valet.noPendingItems'));
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
        refreshData();
      } catch (err) {
        alert("Payment failed. Please try again.");
      }
    }
  }, [bulkAmount, processedData, currencyView, eurToRsd, refreshData, t]);

  return (
    <PageWrapper>
      <TwoColumnLayout
        mainContent={
          <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-900/10">
            <Filtering
              title={t('valet.unpaidPast')}
              options={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              showLimit={showLimit}
              onLimitChange={setShowLimit}
              viewMode={viewMode}
              onViewChange={setViewMode}
              showRowLimit={true}
            />
            <Listings
              title=""
              fields={valetFields}
              manualData={processedData}
              loading={loading}
              isValetMode={true}
              onValetItemClick={setPayModalItem}
              currencyView={currencyView}
              eurToRsd={eurToRsd}
              viewMode={viewMode}
              renderActions={(item) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPayModalItem(item); }}
                  className="text-[9px] font-black bg-orange-600 px-2 py-1 rounded text-white"
                >
                  {t('valet.pay')}
                </button>
              )}
            />
            {showLimit === 'all' && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-900/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {t('filtering.page')} {currentPage} {t('filtering.of')} {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="text-[10px] font-black uppercase px-2 py-1 rounded border border-slate-600 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
                  >
                    {t('filtering.prev')}
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="text-[10px] font-black uppercase px-2 py-1 rounded border border-slate-600 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
                  >
                    {t('filtering.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        }
        sideContent={
          <div className="flex flex-col gap-8">
            <ValetStats
              totalBalance={totalBalance}
              currencyView={currencyView}
              eurToRsd={eurToRsd}
              onCurrencyChange={setCurrencyView}
            />
            <BulkPay
              bulkAmount={bulkAmount}
              setBulkAmount={setBulkAmount}
              onWaterfall={handleWaterfall}
              currencyView={currencyView}
            />
          </div>
        }
      />

      {payModalItem && (
        <Modal
          isOpen={!!payModalItem}
          onClose={() => setPayModalItem(null)}
          title={t('valet.paySingle')}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {payModalItem.dateVenue} – {formatDateUniform(payModalItem.dateDate)} – {payModalItem.rawBalance?.toFixed(2)} €
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePaySingleConfirm}
                disabled={payModalLoading}
                className="px-4 py-2 bg-orange-600 text-white font-black uppercase tracking-wider rounded hover:bg-orange-500 disabled:opacity-50 transition-colors"
              >
                {payModalLoading ? t('common.loading') : t('valet.confirmPay')}
              </button>
              <button
                type="button"
                onClick={() => setPayModalItem(null)}
                className="px-4 py-2 border border-slate-600 text-slate-300 font-black uppercase tracking-wider rounded hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

// Wrap the components in React.memo
const ValetStats = React.memo(({ totalBalance, currencyView, eurToRsd }) => {
  const display = currencyView === 'RSD'
    ? `${Math.round(totalBalance * eurToRsd).toLocaleString()} RSD`
    : `${totalBalance.toFixed(2)} €`;
  return (
    <div className="card p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total unpaid</p>
      <p className="text-2xl font-black text-white tabular-nums">{display}</p>
    </div>
  );
});

const BulkPay = React.memo(({ bulkAmount, setBulkAmount, onWaterfall, currencyView }) => {
  const { t } = useLanguage();
  return (
    <div className="card p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('valet.bulkPay')}</p>
      <input
        type="text"
        value={bulkAmount}
        onChange={(e) => setBulkAmount(e.target.value)}
        placeholder={currencyView === 'RSD' ? 'RSD' : 'EUR'}
        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono mb-2"
      />
      <button
        type="button"
        onClick={onWaterfall}
        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded text-sm"
      >
        {t('valet.apply')}
      </button>
    </div>
  );
});

export default ValetView;