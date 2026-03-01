import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Avatar = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 150);
  };

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };

  return (
    <div 
      className="relative ml-6"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        className="flex items-center gap-3 focus:outline-none transition-all group"
      >
          <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
            {user?.displayName || 'Musician'}
          </span>
        </div>
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 p-[2px] border border-slate-700 group-hover:border-orange-500 transition-colors shadow-lg">
          <img 
            src={user?.picture || `https://ui-avatars.com/api/?name=${user?.displayName || 'M'}&background=1e293b&color=fff`}
            alt="User Avatar" 
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </button>

      {isMenuOpen && (
        <div className="card absolute right-0 mt-2 w-48 p-0 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link 
            to="/profile" 
            onClick={() => setIsMenuOpen(false)}
            className="block px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800 hover:text-white transition-all border-b border-slate-800"
          >
            View Profile
          </Link>
          <button 
            onClick={handleLogout}
            className="block w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Avatar;