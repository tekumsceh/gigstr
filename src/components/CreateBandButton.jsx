import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const CreateBandButton = () => {
  const { t } = useLanguage();
  return (
    <Link to="/create-band">
      <button className="btn btn-primary uppercase tracking-widest text-[12px] shadow-lg active:scale-[0.98]">
        {t('createBand.createNewBand')}
      </button>
    </Link>
  );
};

export default CreateBandButton;
