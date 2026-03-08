import React from 'react';

/**
 * Wraps page content. Renders a div (not main – App.jsx has the single <main>).
 * Use className to override padding or add flex/height for fixed-height pages (e.g. All Events).
 */
const PageWrapper = ({ children, className = "" }) => {
  return (
    <div className={`w-full max-w-[1500px] mx-auto px-4 md:px-10 py-8 flex flex-col gap-8 ${className}`}>
      {children}
    </div>
  );
};

export default PageWrapper;