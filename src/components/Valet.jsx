import React, { useState, useEffect, useMemo } from 'react';
import ValetView from '../views/ValetView'; // Ensure this path is correct
import { fetchFromApi, postToApi, convertToEur } from '../services/dataService';

function Valet() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(null);
  
  // Initialize with the new Object-style filters for the Query Engine
  const [filters, setFilters] = useState({ 
    dateDate: { operator: 'Year', value: new Date().getFullYear().toString() }, 
    timeline: { operator: 'Timeline', value: 'past' },
    // We can add a default sort here
    sort: { operator: 'Sort', value: 'newest' }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Use the new POST route we built in the backend
      const json = await postToApi("query/dates", { filters });
      setRawData(Array.isArray(json) ? json : []);
      
      // Fetch rate only once if it doesn't exist
      if (!rate) {
        const rateData = await fetchFromApi("current-rate");
        setRate(rateData);
      }
    } catch (error) {
      console.error("Valet Load Error:", error);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-run whenever filters change
  useEffect(() => {
    loadData();
  }, [filters]);

  // Safe calculation of totalDue
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
    if (!window.confirm(`Pay off remaining €${debt.toFixed(2)} for this event?`)) return;

    try {
      const result = await postToApi(`pay-single/${id}`, {});
      if (result?.success) {
        loadData(); 
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
      loadData(); 
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