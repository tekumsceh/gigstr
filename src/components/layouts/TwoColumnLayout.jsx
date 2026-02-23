// components/layouts/TwoColumnLayout.jsx
import React from 'react';

export default function TwoColumnLayout({ mainContent, sideContent, reverse = false }) {
  return (
    /* We removed max-w, mx-auto, py, and px. 
       This component now fills whatever container it is dropped into. */
    <div className="grid grid-cols-1 lg:grid-cols-8 gap-8 w-full">
      
      {/* Main Content (6/8) */}
      <div className={`lg:col-span-6 min-w-0 ${reverse ? 'lg:order-2' : 'lg:order-1'}`}>
        {mainContent}
      </div>

      {/* Side Content (2/8) */}
      <div className={`lg:col-span-2 min-w-0 ${reverse ? 'lg:order-1' : 'lg:order-2'}`}>
        {sideContent}
      </div>

    </div>
  );
}