import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Listings from '../components/Listings';
import Calendar from '../components/Calendar';
import Modal from '../components/Modal';
import Filtering from '../components/Filtering';
import PageWrapper from "../components/layouts/PageWrapper";
import TwoColumnLayout from "../components/layouts/TwoColumnLayout";
import axios from 'axios';

function HomeView() {
  const [rawData, setRawData] = useState([]);
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState({ isOpen: false, content: '' });
  const [activeFilters, setActiveFilters] = useState({ year: 'all', bandID: 'all' });
  const [viewMode, setViewMode] = useState('list');
  const listLimit = 3;
  const gridLimit = 12;

  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/api/calendar-dates")
    .then(res => {
      setRawData(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })
    .catch(err => {
      console.error("Fetch error:", err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    axios.get("/api/my-bands").then(res => setBands(res.data || []));
  }, []);

  const filterOptions = useMemo(() => {
    const years = [...new Set(rawData.map(item => 
      new Date(item.dateDate).getFullYear().toString()
    ))].sort((a, b) => b - a);
    const bandOptions = bands.map(b => ({
      bandID: b.bandID,
      typeID: b.bandID,
      bandName: b.bandName,
    }));
    return { years, bandID: bandOptions };
  }, [rawData, bands]);

  const upcomingGigs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rawData
    .filter(gig => {
      const gigDate = new Date(gig.dateDate);
      if (gigDate < today) return false;
      const matchesYear = activeFilters.year === 'all' || gigDate.getFullYear().toString() === activeFilters.year;
      const matchesBand = activeFilters.bandID === 'all' || String(gig.bandID) === activeFilters.bandID;
      return matchesYear && matchesBand;
    })
    .sort((a,b) => new Date(a.dateDate) - new Date(b.dateDate))
    .slice(0, viewMode === 'list' ? listLimit : gridLimit);
  }, [rawData, activeFilters, viewMode]);

  const [invites, setInvites] = useState([]);

useEffect(() => {
    axios.get("/api/my-invites").then(res => setInvites(res.data));
}, []);

const handleInvite = async (bandID, response) => {
    await axios.post("/api/invites/respond", { bandID, status: response });
    setInvites(invites.filter(i => i.bandID !== bandID));
    // Refresh your band list here too!
};

  const handleViewNote = (note) => {
    setNoteModal({ isOpen: true, content: note });
  };

  return (
    <PageWrapper>
      <TwoColumnLayout 
        mainContent={
          <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-900/10">
            <Filtering 
              title="Upcoming Schedule"
              options={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              viewMode={viewMode}
              onViewChange={setViewMode}
              yearLabel="Year"
              bandLabel="Band"
              showRowLimit={false}
            />
            <Listings 
              title=""
              fields={['dateDate', 'dateCity', 'dateVenue', 'dateDescription']}
              manualData={upcomingGigs}
              loading={loading}
              mode="home"
              onViewNote={handleViewNote}
              hideHeader={true}
              viewMode={viewMode}
            />
          </div>
        }
        sideContent={
            <div className="flex flex-col gap-8">
                        {/* CALENDAR CARD */}
              <div className="card p-0 border-none bg-slate-900/10 overflow-hidden">
                <Calendar 
                  gigs={rawData} 
                  onSelectDate={(dayGigs, dateObj) => {
                    if (dayGigs.length === 1) {
                      navigate(`/date/${dayGigs[0].dateID}`);
                    } else {
                      const formattedDate = dateObj.toLocaleDateString('en-CA');
                              // Change '/add-date' to '/add' here too
                      navigate(`/add?date=${formattedDate}`);
                    }
                  }}
                />
              </div> 
              {invites.length > 0 && (
                  <div className="card p-4 border-orange-500 bg-orange-500/5 mb-4 animate-pulse">
                      <p className="text-[10px] font-black uppercase text-orange-500 mb-2">New Invitations!</p>
                      {invites.map(invite => (
                          <div key={invite.bandID} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                              <span className="text-xs font-bold text-white uppercase">{invite.bandName}</span>
                              <div className="flex gap-2">
                                  <button onClick={() => handleInvite(invite.bandID, 'active')} className="text-[9px] font-black bg-orange-600 px-2 py-1 rounded">JOIN</button>
                                  <button onClick={() => handleInvite(invite.bandID, 'declined')} className="text-[9px] font-black bg-slate-800 px-2 py-1 rounded">NO</button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}           

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