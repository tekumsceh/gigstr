// components/layouts/SingleColumnLayout.jsx
import React from 'react';

export default function SingleColumnLayout({ children, maxWidth = "max-w-3xl" }) {
  return (
    <div className={`w-full ${maxWidth} mx-auto py-8 px-4 md:px-8 flex flex-col items-center`}>
      {children}
    </div>
  );
}