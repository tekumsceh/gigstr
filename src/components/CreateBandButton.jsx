import React from 'react';
import { Link } from 'react-router-dom';

const CreateBandButton = () => {
  return (
    <Link to="/create-band">
      <button className="btn btn-primary uppercase tracking-widest text-[12px] shadow-lg active:scale-[0.98]">
        Create New Band
      </button>
    </Link>
  );
};

export default CreateBandButton;
