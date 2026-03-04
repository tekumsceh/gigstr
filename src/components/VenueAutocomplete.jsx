import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchFromApi } from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

function VenueAutocomplete({ value, onChange, onBlur, onSelect, placeholder, error, className = '', id }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Sync external value when it changes (e.g. form reset)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const searchVenues = useCallback(async (term) => {
    if (!term || term.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchFromApi('venues/search', { q: term });
      setSuggestions(Array.isArray(data) ? data : []);
      setHighlightedIndex(-1);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchVenues(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchVenues]);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setIsOpen(true);
  };

  const handleSelect = (venue) => {
    const name = venue.venueName || '';
    setQuery(name);
    onChange(name);
    setSuggestions([]);
    setIsOpen(false);
    onSelect?.(venue);
  };

  const handleBlur = () => {
    // Delay so click on suggestion registers
    setTimeout(() => setIsOpen(false), 150);
    onBlur?.();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const inputClass = `bg-slate-950 border rounded px-3 py-2 text-sm sm:text-base text-white font-bold outline-none focus:border-orange-500/50 w-full transition-colors duration-200 ${
    error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5' : 'border-slate-700 focus:border-orange-500/50'
  } ${className}`;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {error && (
        <p className="text-[9px] font-black uppercase tracking-widest text-red-500 ml-1 mt-1">{error.message}</p>
      )}
      {isOpen && (query.length >= MIN_SEARCH_LENGTH || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="px-3 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">{t('venue.searching')}</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
              {t('venue.noMatches')}
            </div>
          ) : (
            suggestions.map((venue, i) => (
              <button
                key={venue.venueID}
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors ${
                  i === highlightedIndex ? 'bg-orange-500/20 text-orange-400' : 'text-slate-300 hover:bg-slate-800'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(venue);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <span className="font-bold text-white">{venue.venueName}</span>
                {(venue.venueCity || venue.venueCountry) && (
                  <span className="text-slate-500 text-[11px] ml-2">
                    {[venue.venueCity, venue.venueCountry].filter(Boolean).join(', ')}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default VenueAutocomplete;
