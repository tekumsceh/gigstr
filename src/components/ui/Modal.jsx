import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function Modal({ isOpen, onClose, title, children, variant = 'default' }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${variant !== 'default' ? `modal-${variant}` : ''}`} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-text">
          {children}
        </div>
        <button 
          onClick={onClose} 
          className="btn btn-secondary mt-4 w-full uppercase tracking-widest text-[10px]"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}