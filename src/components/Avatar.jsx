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
    window.location.href = 'http://localhost:5000/auth/logout';
  };

  return (
    <div 
      className="relative ml-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        className="flex items-center gap-3 focus:outline-none transition-transform hover:scale-105"
      >
        <div 
          className="flex items-center justify-center w-11 h-11 rounded-full shadow-lg shrink-0"
          style={{ background: 'conic-gradient(#ea4335 0deg 90deg, #4285f4 90deg 180deg, #34a853 180deg 270deg, #fbbc05 270deg 360deg)' }}
        >
          <img 
            src={user?.picture || `https://ui-avatars.com/api/?name=${user?.displayName || 'M'}&background=1e293b&color=fff`}
            alt="User Avatar" 
            referrerPolicy="no-referrer"
            className="w-[38px] h-[38px] rounded-full object-cover border-2 border-slate-950 bg-slate-800"
          />
        </div>

        <span className="text-white font-bold text-sm tracking-wide">
          {user?.displayName || 'Musician'}
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-3 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
          <Link 
            to="/profile" 
            onClick={() => setIsMenuOpen(false)}
            className="block px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all border-b border-slate-800"
          >
            View Profile
          </Link>
          <button 
            onClick={handleLogout}
            className="block w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Avatar;
