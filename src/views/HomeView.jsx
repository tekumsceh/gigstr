// views/HomeView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Listings from '../components/Listings';
import Calendar from '../components/Calendar';
import CreateBandButton from '../components/CreateBandButton';
import Modal from '../components/Modal';
import PageWrapper from "../components/layouts/PageWrapper";
import PageBanner from "../components/layouts/PageBanner";
import TwoColumnLayout from "../components/layouts/TwoColumnLayout";

function HomeView() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleViewNote = (note) => {
    setNoteModal({ isOpen: true, content: note });
  };

  return (
    <PageWrapper>
      {/* 1. The Banner - Purely informational for Home */}


      {/* 2. The Workspace - Using the stripped TwoColumnLayout */}
      <TwoColumnLayout 
        mainContent={
          <Listings 
            title="Upcoming Schedule"
            fields={['dateDate', 'dateCity', 'dateVenue', 'dateDescription']}
            manualData={upcomingGigs}
            loading={loading}
            mode="home"
            onViewNote={handleViewNote} 
          />
        }
        sideContent={
          <div className="flex flex-col gap-8">
            <div className="card p-4 border-slate-800 bg-slate-900/10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 border-b border-slate-800 pb-2">
                Availability
              </h4>
              <Calendar 
                gigs={rawData} 
                onSelectDate={(item) => navigate(`/date/${item.dateID}`)}
              />
            </div>
            
            <div className="flex justify-center">
              <CreateBandButton />
            </div>
          </div>
        }
      />

      <Modal 
        isOpen={noteModal.isOpen} 
        onClose={() => setNoteModal({ isOpen: false, content: '' })}
        title="Event Intelligence"
      >
        <p className="whitespace-pre-wrap italic text-slate-300">
          {noteModal.content}
        </p>
      </Modal>
    </PageWrapper>
  );
}

export default HomeView;