import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'gigstr-theme';
const PALETTES = [
  { id: 'dark-slate', name: 'Slate', type: 'dark', preview: '#0f172a' },
  { id: 'dark-forest', name: 'Forest', type: 'dark', preview: '#0c1810' },
  { id: 'dark-ocean', name: 'Ocean', type: 'dark', preview: '#0c1222' },
  { id: 'light-mist', name: 'Mist', type: 'light', preview: '#f8fafc' },
  { id: 'light-sand', name: 'Sand', type: 'light', preview: '#fefce8' },
  { id: 'light-sky', name: 'Sky', type: 'light', preview: '#f0f9ff' },
];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PALETTES.some(p => p.id === saved)) return saved;
    if (saved === 'dark') return 'dark-slate';
    if (saved === 'light') return 'light-mist';
    return 'dark-slate';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (value) => {
    setThemeState(PALETTES.some(p => p.id === value) ? value : 'dark-slate');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, palettes: PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
