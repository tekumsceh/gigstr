import React from 'react';

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* OVERLAY - Click to close */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* MODAL CONTENT */}
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-md p-6 rounded-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-orange-500">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors uppercase text-[10px] font-black"
          >
            Close ✕
          </button>
        </div>
        
        <div className="text-slate-200 text-sm leading-relaxed font-medium">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;