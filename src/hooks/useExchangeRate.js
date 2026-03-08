import { useState, useEffect, useCallback } from 'react';

const FALLBACK_EUR_TO_RSD = 117.3;

/**
 * Fetches exchange rates from /api/rates (exrate table, synced daily).
 * Returns eurToRsd and other rates; falls back to defaults if API fails.
 */
export function useExchangeRate() {
  const [rates, setRates] = useState({
    eurToRsd: FALLBACK_EUR_TO_RSD,
    eurToUsd: null,
    eurToGbp: null,
    eurToJpy: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rates', { credentials: 'include' });
      const data = await res.json();
      setRates({
        eurToRsd: Number(data.exrateEurToRsd) || FALLBACK_EUR_TO_RSD,
        eurToUsd: data.exrateEurToUsd != null ? Number(data.exrateEurToUsd) : null,
        eurToGbp: data.exrateEurToGbp != null ? Number(data.exrateEurToGbp) : null,
        eurToJpy: data.exrateEurToJpy != null ? Number(data.exrateEurToJpy) : null
      });
    } catch (err) {
      setError(err.message);
      setRates((prev) => ({ ...prev, eurToRsd: prev.eurToRsd || FALLBACK_EUR_TO_RSD }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    eurToRsd: rates.eurToRsd,
    eurToUsd: rates.eurToUsd,
    eurToGbp: rates.eurToGbp,
    eurToJpy: rates.eurToJpy,
    loading,
    error,
    refresh: fetchRates
  };
}
