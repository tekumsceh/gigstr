// components/layouts/GlobalHeader.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar';

export default function GlobalHeader() {
  return (
    <header className="w-full bg-[var(--bg-surface)] border-b border-slate-800 z-50 sticky top-0 shadow-md shrink-0">
      {/* Container matches the TwoColumnLayout max-width and padding */}
      <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-4 flex items-center justify-between">
        
        {/* LEFT: Branding */}
        <Link to="/" className="text-2xl font-black italic uppercase tracking-tighter text-white hover:text-orange-500 transition-colors">
          Gigstr
        </Link>
        
        {/* RIGHT: Navigation Items */}
        <nav className="flex items-center gap-10"> 
          <Link to="/add" className="group flex flex-col items-center transition-all">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-white transition-colors">
              Add Date
            </span>
          </Link>

          <Link to="/valet" className="group flex flex-col items-center transition-all">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-white transition-colors">
              Valet
            </span>
          </Link>
          <Avatar />
        </nav>

      </div>
    </header>
  );
}