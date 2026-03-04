import React, { useState, useEffect, useMemo } from 'react';
import ValetView from '../views/ValetView'; 
import { fetchFromApi, postToApi, convertToEur } from '../services/dataService';

function Valet() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(null);  
  const [filters, setFilters] = useState({ 
    dateDate: { operator: 'Year', value: new Date().getFullYear().toString() }, 
    timeline: { operator: 'Timeline', value: 'past' },
    sort: { operator: 'Sort', value: 'newest' }
  });


  useEffect(() => {
    fetchFromApi("current-rate")
      .then(rateData => setRate(rateData))
      .catch(err => console.error("Rate fetch error:", err));
  }, []);

  useEffect(() => {
    const loadDates = async () => {
      setLoading(true);
      try {
        const json = await postToApi("query/dates", { filters });
        setRawData(Array.isArray(json) ? json : []);
      } catch (error) {
        console.error("Valet Load Error:", error);
        setRawData([]);
      } finally {
        setLoading(false);
      }
    };

    loadDates();
  }, [filters]);

  const totalDue = useMemo(() => {
    if (!rawData.length) return 0;
    return rawData.reduce((acc, item) => {
      const paid = parseFloat(item.datePaidAmount || 0);
      const price = parseFloat(item.datePrice || 0);
      return acc + (price - paid);
    }, 0);
  }, [rawData]);

  const handleSinglePay = async (id, debt) => {
    if (debt <= 0.01) return;
    // Note for later: We can upgrade this window.confirm to a custom Modal!
    if (!window.confirm(`Pay off remaining €${debt.toFixed(2)} for this event?`)) return;

    try {
      const result = await postToApi(`pay-single/${id}`, {});
      if (result?.success) {
        // Trigger a re-fetch by technically not changing the filters, 
        // but since we need fresh data, we can re-call the API.
        // A simple trick to force a re-fetch is spreading the existing filters:
        setFilters(prev => ({ ...prev })); 
      }
    } catch (err) {
      console.error("Single Pay Error:", err);
    }
  };

  const handleBulkPay = async (amount, currency) => {
    const eurValue = convertToEur(amount, rate?.exrateEurToRsd || 117);

    try {
      await postToApi("pay-bulk", { 
        amountEur: eurValue,
        originalAmount: parseFloat(amount),
        currency,
        exchangeRate: rate?.exrateEurToRsd
      });
      // Force refresh
      setFilters(prev => ({ ...prev }));
    } catch (err) {
      console.error("Bulk Pay Error:", err);
    }
  };

  return (
    <ValetView 
      data={rawData}
      loading={loading}
      rate={rate}
      totalDue={totalDue}
      onFilterChange={setFilters} 
      onSinglePay={handleSinglePay}
      onBulkPay={handleBulkPay}
    />
  );
}

export default Valet;