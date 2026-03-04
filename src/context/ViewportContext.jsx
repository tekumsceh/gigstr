import React, { createContext, useContext, useState, useEffect } from 'react';

const ViewportContext = createContext();

/** Breakpoint (px): viewport narrower than this is treated as mobile. Use same value in Tailwind (e.g. md:) if you want CSS and JS in sync. */
export const VIEWPORT_MOBILE_MAX = 768;
const MOBILE_MAX_WIDTH = VIEWPORT_MOBILE_MAX;

function getIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
}

export const ViewportProvider = ({ children }) => {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const handleChange = (e) => setIsMobile(e.matches);
    handleChange(mql);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const value = { isMobile };
  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
};

export const useViewport = () => useContext(ViewportContext);
