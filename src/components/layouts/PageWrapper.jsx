import React from 'react';

const PageWrapper = ({ children, className = "" }) => {
  return (
    /* THE TRAY:
       - Centered (mx-auto)
       - Max Width (1500px)
       - Responsive Padding (4 on mobile, 10 on desktop)
    */
    <main className={`w-full max-w-[1500px] mx-auto px-4 md:px-10 py-8 flex flex-col gap-8 ${className}`}>
      {children}
    </main>
  );
};

export default PageWrapper;