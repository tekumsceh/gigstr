import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Listings from '../components/Listings';
import Calendar from '../components/Calendar';
import CreateBandButton from '../components/CreateBandButton';
import Modal from '../components/Modal'; // Import your new Modal!

function HomeView() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  // This is likely where line 9 was - we keep hooks at the very top
  const [noteModal, setNoteModal] = useState({ isOpen: false, content: '' });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/calendar-dates")
      .then(res => res.json())
      .then(data => {
        setRawData(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, []);

  const upcomingGigs = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    return rawData
      .filter(g => new Date(g.dateDate) >= today)
      .sort((a,b) => new Date(a.dateDate) - new Date(b.dateDate))
      .slice(0, 3);
  }, [rawData]);

  // Handle Note opening
  const handleViewNote = (note) => {
    setNoteModal({ isOpen: true, content: note });
  };

  return (
    <div className="w-[90%] max-w-[1400px] mx-auto py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <Listings 
            title="Upcoming Schedule"
            fields={['dateDate', 'dateCity', 'dateVenue', 'dateDescription']}
            manualData={upcomingGigs}
            loading={loading}
            mode="home"
            onViewNote={handleViewNote} // Pass the function here!
          />
        </div>

        <div className="lg:col-span-1 relative pb-20">
          <Calendar 
            title="Availability" 
            gigs={rawData} 
            onSelectDate={(item) => navigate(`/date/${item.dateID}`)}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <CreateBandButton />
          </div>
        </div>
      </div>

      {/* THE MODAL */}
      <Modal 
        isOpen={noteModal.isOpen} 
        onClose={() => setNoteModal({ isOpen: false, content: '' })}
        title="Event Intelligence"
      >
        <p className="whitespace-pre-wrap italic font-medium text-slate-300">
          {noteModal.content}
        </p>
      </Modal>
    </div>
  );
}

export default HomeView;