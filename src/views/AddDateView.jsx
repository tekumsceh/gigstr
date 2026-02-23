// views/AddDateView.jsx
import React from 'react';
import AddDate from '../components/AddDate';
import SingleColumnLayout from '../components/layouts/SingleColumnLayout';

function AddDateView() {
  return (
    <SingleColumnLayout maxWidth="max-w-4xl">
      <AddDate />
    </SingleColumnLayout>
  );
}

export default AddDateView;
