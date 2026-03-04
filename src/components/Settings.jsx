import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const { theme, setTheme, palettes } = useTheme();
  const { locale, setLocale, t, locales } = useLanguage();

  const categories = [
    { id: 'appearance', labelKey: 'settings.appearance' },
    { id: 'language', labelKey: 'settings.language' },
    { id: 'account', labelKey: 'settings.account' },
    { id: 'privacy', labelKey: 'settings.privacy' },
  ];

  const darkPalettes = palettes.filter(p => p.type === 'dark');
  const lightPalettes = palettes.filter(p => p.type === 'light');

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col md:flex-row gap-8">
      
      {/* LEFT: Category Navigation */}
      <div className="w-full md:w-48 shrink-0">
        <h1 className="text-[18px] font-black uppercase tracking-tighter text-white mb-6">
          {t('settings.title')}
        </h1>
        <nav className="flex md:flex-col gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-2 text-left rounded transition-all ${
                activeTab === cat.id 
                ? 'bg-orange-500 text-white' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* RIGHT: Content Area */}
      <div className="flex-1 min-h-[400px] border-l border-slate-800 pl-0 md:pl-8">
        
        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <header>
              <h2 className="text-[14px] font-black uppercase text-white">{t('settings.appearance')}</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t('settings.choosePalette')}</p>
            </header>
            
            {/* Dark Palettes */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-400">{t('settings.dark')}</h3>
              <div className="grid grid-cols-3 gap-3">
                {darkPalettes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTheme(p.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      theme === p.id
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: p.preview }}
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Light Palettes */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-400">{t('settings.light')}</h3>
              <div className="grid grid-cols-3 gap-3">
                {lightPalettes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTheme(p.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      theme === p.id
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: p.preview }}
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {t('settings.paletteSaved')}
            </p>
          </div>
        )}

        {activeTab === 'language' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header>
              <h2 className="text-[14px] font-black uppercase text-white">{t('settings.language')}</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t('settings.languageDescription')}</p>
            </header>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                {t('settings.language')}
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full max-w-xs bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500/50"
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900">
                    {t(l.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest italic">
            {t('settings.accountPhase2')}
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest italic">
            {t('settings.privacyPhase2')}
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;