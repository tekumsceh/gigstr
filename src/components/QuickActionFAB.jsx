import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

function QuickActionFAB() {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleOption = (path) => {
    setModalOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Floating Action Button - fixed above footer */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label={t('quickAction.quickActions')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal with two options */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-orange-500">
                {t('quickAction.quickAction')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleOption('/add')}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-800 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-white font-black uppercase tracking-wider text-sm">{t('quickAction.addDate')}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{t('quickAction.addDateDesc')}</span>
                </div>
              </button>
              <button
                onClick={() => handleOption('/create-band')}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-800 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <span className="block text-white font-black uppercase tracking-wider text-sm">{t('quickAction.createBand')}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{t('quickAction.createBandDesc')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuickActionFAB;
