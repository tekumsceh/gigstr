import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { getMessages, DEFAULT_LOCALE, LOCALES } from '../translations';

const STORAGE_KEY = 'gigstr-locale';
const SUPPORTED_CODES = LOCALES.map((l) => l.code);

const LanguageContext = createContext();

function getDeviceLocale() {
  try {
    const browser = typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage);
    if (!browser) return DEFAULT_LOCALE;
    const code = browser.split('-')[0].toLowerCase();
    return SUPPORTED_CODES.includes(code) ? code : DEFAULT_LOCALE;
  } catch (_) {
    return DEFAULT_LOCALE;
  }
}

function getStoredLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_CODES.includes(saved)) return saved;
  } catch (_) {}
  return getDeviceLocale();
}

function tFromMessages(messages, overrides, key, params = {}) {
  if (overrides && typeof overrides[key] === 'string') {
    let str = overrides[key];
    Object.keys(params).forEach((k) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return str;
  }
  const parts = key.split('.');
  let value = messages;
  for (const part of parts) {
    value = value?.[part];
  }
  let str = typeof value === 'string' ? value : key;
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
  });
  return str;
}

export const LanguageProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(getStoredLocale);
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    } catch (_) {}
  }, [locale]);

  useEffect(() => {
    if (locale === 'en') {
      setOverrides({});
      return;
    }
    let cancelled = false;
    axios
      .get('/api/translate/overrides', { params: { lang: locale }, withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        const map = {};
        (res.data?.list ?? []).forEach((o) => {
          map[o.key] = o.value ?? '';
        });
        setOverrides(map);
      })
      .catch(() => {
        if (!cancelled) setOverrides({});
      });
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = (code) => {
    if (LOCALES.some((l) => l.code === code)) setLocaleState(code);
  };

  const messages = useMemo(() => getMessages(locale), [locale]);

  const t = useMemo(
    () => (key, params) => tFromMessages(messages, overrides, key, params),
    [messages, overrides]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, locales: LOCALES, messages }),
    [locale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
