// src/components/layouts/PageBanner.jsx
import React from 'react';

const PageBanner = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-8 shrink-0 gap-6 w-full">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-[0.4em] text-white leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-500/60 mt-4 leading-none">
            {subtitle}
          </p>
        )}
      </div>
      
      {/* This is where ValetStats will be injected later */}
      {actions && (
        <div className="w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageBanner;