import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const UserSearch = ({ onSelect, error }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown if user clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.length > 1) {
        try {
          const res = await axios.get(`/api/users/search?q=${query}`);
          setResults(res.data);
          setIsOpen(true);
        } catch (err) {
          console.error(err);
        }
      } else {
        setResults([]);
      }
    }, 300); // Debounce: wait 300ms after typing stops

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (user) => {
    setQuery(user.email);
    setIsOpen(false);
    onSelect(user.email); // Pass the email back to the form
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
        {t('userSearch.findUser')}
      </label>
      <input
        type="text"
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onSelect(e.target.value);
        }}
        placeholder={t('userSearch.typeToSearch')}
        className={`w-full bg-slate-950 border ${error ? 'border-red-500' : 'border-slate-800'} p-4 text-white font-bold outline-none focus:border-orange-500 rounded-sm transition-all`}
      />
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 shadow-2xl rounded-sm overflow-hidden">
          {results.map((user) => (
            <div
              key={user.userID}
              onClick={() => handleSelect(user)}
              className="flex items-center gap-3 p-3 hover:bg-orange-500/10 cursor-pointer border-b border-slate-800 last:border-0"
            >
              {user.picture ? (
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-slate-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black">?</div>
              )}
              <div className="flex flex-col">
                <span className="text-white text-sm font-bold">{user.displayName}</span>
                <span className="text-slate-500 text-[10px] uppercase font-black">{user.email}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;