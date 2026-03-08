import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [globalData, setGlobalData] = useState({
    calendarDates: [],
    bands: [],
    invites: []
  });
  const [loading, setLoading] = useState(true);

  const fetchGlobalData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const res = await axios.get("/api/dashboard-data");
      setGlobalData({
        calendarDates: Array.isArray(res.data.calendarDates) ? res.data.calendarDates : [],
        bands: Array.isArray(res.data.bands) ? res.data.bands : [],
        invites: Array.isArray(res.data.invites) ? res.data.invites : []
      });
    } catch (err) {
      console.error("Global fetch error:", err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalData(true);
    const pollingInterval = setInterval(() => fetchGlobalData(false), 60000);
    return () => clearInterval(pollingInterval);
  }, [fetchGlobalData]);

  return (
    <DataContext.Provider value={{ ...globalData, loading, refreshData: fetchGlobalData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
