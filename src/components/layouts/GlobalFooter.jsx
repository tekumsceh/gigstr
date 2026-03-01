import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const GlobalFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bandsModalOpen, setBandsModalOpen] = useState(false);
  const [bands, setBands] = useState([]);
  const [bandsLoading, setBandsLoading] = useState(false);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    if (bandsModalOpen) {
      setBandsLoading(true);
      axios.get('/api/my-bands')
        .then(res => setBands(res.data.filter(b => !b.isSolo)))
        .catch(() => setBands([]))
        .finally(() => setBandsLoading(false));
    }
  }, [bandsModalOpen]);

  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/add', label: 'Add Date', icon: CalendarIcon },
    { path: '/valet', label: 'Valet', icon: ValetIcon },
    { type: 'bands', label: 'My Bands', icon: BandsIcon },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      <footer className="fixed bottom-0 left-0 w-full h-16 bg-slate-950 border-t border-slate-800 flex justify-around items-center px-4 z-40">
        {navItems.map((item) => {
          if (item.type === 'bands') {
            return (
              <button
                key="bands"
                onClick={() => setBandsModalOpen(true)}
                className="flex flex-col items-center justify-center gap-1 transition-all min-w-[64px] text-slate-500 hover:text-white"
              >
                <item.icon className="w-6 h-6" />
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-all min-w-[64px] ${
                isActive(item.path) ? 'text-orange-500' : 'text-slate-500 hover:text-white'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          );
        })}
      </footer>

      {/* My Bands Modal */}
      {bandsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setBandsModalOpen(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-sm max-h-[80vh] overflow-hidden rounded-lg shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-orange-500">
                My Bands
              </h3>
              <button
                onClick={() => setBandsModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
              {bandsLoading ? (
                <div className="p-8 text-center text-[10px] font-black uppercase text-slate-600 animate-pulse">
                  Loading...
                </div>
              ) : bands.length === 0 ? (
                <div className="p-8 text-center text-[10px] font-black uppercase text-slate-500 italic">
                  No bands found.
                </div>
              ) : (
                <div className="space-y-1">
                  {bands.map((band) => (
                    <button
                      key={band.bandID}
                      onClick={() => {
                        setBandsModalOpen(false);
                        navigate(`/band/${band.bandID}/manage`);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/50 transition-all text-left"
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: band.bandColor }} />
                      <span className="text-sm font-black uppercase text-white tracking-tight truncate">
                        {band.bandName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function BandsIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function HomeIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ValetIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default GlobalFooter;