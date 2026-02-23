import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomeView from '../views/HomeView';
import Valet from './Valet';
import AddDateView from '../views/AddDateView'; 
import AllEventsView from '../views/AllEventsView';
import CreateBandView from '../views/CreateBandView'; // Import the new view

function Routing() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/valet" element={<Valet />} />
      <Route path="/add" element={<AddDateView />} />
      <Route path="/events" element={<AllEventsView />} />
      <Route path="/create-band" element={<CreateBandView />} /> {/* Add the new route */}
    </Routes>
  );
}

export default Routing;