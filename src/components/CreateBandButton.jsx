import React from 'react';
import { Link } from 'react-router-dom';

const CreateBandButton = () => {
  return (
    <Link to="/create-band">
      <button className="bg-orange-500 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 transition-colors">
        Create New Band
      </button>
    </Link>
  );
};

export default CreateBandButton;
