import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const GlobalFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [bandsModalOpen, setBandsModalOpen] = useState(false);
  const [bands, setBands] = useState([]);
  const [bandsLoading, setBandsLoading] = useState(false);
  const bandsTimeoutRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const startBandsAutoCloseTimer = () => {
    if (bandsTimeoutRef.current) clearTimeout(bandsTimeoutRef.current);
    bandsTimeoutRef.current = setTimeout(() => {
      setBandsModalOpen(false);
    }, 2000);
  };

  useEffect(() => {
    // Clean up timer on unmount or when modal closes
    return () => {
      if (bandsTimeoutRef.current) clearTimeout(bandsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (bandsModalOpen) {
      setBandsLoading(true);
      axios.get('/api/my-bands')
        .then(res => setBands(res.data || []))
        .catch(() => setBands([]))
        .finally(() => setBandsLoading(false));

      startBandsAutoCloseTimer();
    } else {
      if (bandsTimeoutRef.current) clearTimeout(bandsTimeoutRef.current);
    }
  }, [bandsModalOpen]);

  const navItems = [
    { path: '/', labelKey: 'footer.home', icon: HomeIcon },
    { path: '/events', labelKey: 'footer.allEvents', icon: CalendarIcon },
    { path: '/valet', labelKey: 'footer.valet', icon: ValetIcon },
    { type: 'bands', labelKey: 'footer.myBands', icon: BandsIcon },
    { path: '/settings', labelKey: 'footer.settings', icon: SettingsIcon },
  ];

  return (
    <>
      <footer className="w-full h-16 flex-shrink-0 bg-slate-950 border-t border-slate-800 flex justify-around items-center px-4 z-40">
        {navItems.map((item) => {
          if (item.type === 'bands') {
            return (
              <div
                key="bands"
                className="relative"
                onMouseEnter={() => {
                  if (bandsTimeoutRef.current) clearTimeout(bandsTimeoutRef.current);
                }}
                onMouseLeave={() => {
                  if (bandsModalOpen) startBandsAutoCloseTimer();
                }}
              >
                <button
                  onClick={() => setBandsModalOpen((prev) => !prev)}
                  className="flex flex-col items-center justify-center gap-1 transition-all min-w-[64px] text-slate-500 hover:text-white"
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">
                    {t(item.labelKey)}
                  </span>
                </button>

                {bandsModalOpen && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden inline-block">
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-800 bg-slate-950/80">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
                        {t('footer.myBandsModalTitle')}
                      </h3>
                      <button
                        onClick={() => setBandsModalOpen(false)}
                        className="text-slate-500 hover:text-white transition-colors text-sm font-bold leading-none"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                      {bandsLoading ? (
                        <div className="py-4 text-center text-[10px] font-black uppercase text-slate-600 animate-pulse">
                          {t('footer.loading')}
                        </div>
                      ) : bands.length === 0 ? (
                        <div className="py-4 text-center text-[10px] font-black uppercase text-slate-500 italic">
                          {t('footer.noBandsFound')}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {bands.map((band) => (
                            <button
                              key={band.bandID}
                              type="button"
                              onClick={() => {
                                setBandsModalOpen(false);
                                navigate(`/band/${band.bandID}/manage`);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-slate-950/50 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/60 transition-all text-left"
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: band.bandColor }}
                              />
                              <span className="text-[11px] font-black uppercase text-white tracking-tight truncate">
                                {band.bandName}
                                {band.isSolo ? ' (Solo)' : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              <span className="text-[9px] font-black uppercase tracking-tighter">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </footer>
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