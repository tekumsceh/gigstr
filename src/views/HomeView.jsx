import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Listings from '../components/Listings';
import Calendar from '../components/Calendar';
import Modal from '../components/Modal';
import Filtering from '../components/Filtering';
import PageWrapper from "../components/layouts/PageWrapper";
import TwoColumnLayout from "../components/layouts/TwoColumnLayout";
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

function HomeView() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const { calendarDates: rawData, bands, invites, loading, refreshData } = useData();

  const [noteModal, setNoteModal] = useState({ isOpen: false, content: '' });
  const [activeFilters, setActiveFilters] = useState({ year: 'all', bandID: 'all' });
  const [viewMode, setViewMode] = useState('list');
  const listLimit = 3;
  const gridLimit = 12;

  const filterOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingRawData = rawData.filter(gig => new Date(gig.dateDate) >= today);

    const years = [...new Set(upcomingRawData.map(item =>
      new Date(item.dateDate).getFullYear().toString()
    ))].sort((a, b) => b - a);

    const activeBandIDs = new Set(upcomingRawData.map(gig => String(gig.bandID)));

    const bandOptions = bands
      .filter(b => activeBandIDs.has(String(b.bandID)))
      .map(b => ({
        bandID: String(b.bandID),
        typeID: String(b.bandID),
        bandName: b.bandName || 'Personal / Solo',
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

  // STABILIZED FUNCTIONS
  const handleInvite = useCallback(async (bandID, response) => {
    try {
      await axios.post("/api/invites/respond", { bandID, status: response });
      refreshData();
    } catch (err) {
      console.error("Failed to respond to invite:", err);
    }
  }, [refreshData]);

  const handleViewNote = useCallback((note) => {
    setNoteModal({ isOpen: true, content: note });
  }, []);

  const handleSelectDate = useCallback((dayGigs, dateObj) => {
    if (dayGigs.length === 1) {
      navigate(`/date/${dayGigs[0].dateID}`);
    } else {
      const formattedDate = dateObj.toLocaleDateString('en-CA');
      navigate(`/add?date=${formattedDate}`);
    }
  }, [navigate]);

  return (
    <PageWrapper>
      <TwoColumnLayout 
        mainContent={
          <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-900/10">
            <Filtering 
              title={t('home.upcomingSchedule')}
              options={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              viewMode={viewMode}
              onViewChange={setViewMode}
              yearLabel={t('home.year')}
              bandLabel={t('home.band')}
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
            <div className="card p-0 border-none bg-slate-900/10 overflow-hidden">
              <Calendar 
                gigs={rawData} 
                onSelectDate={handleSelectDate} 
              />
            </div> 
            {invites.length > 0 && (
              <div className="card p-4 border-orange-500 bg-orange-500/5 mb-4 animate-pulse">
                <p className="text-[10px] font-black uppercase text-orange-500 mb-2">{t('home.newInvitations')}</p>
                {invites.map(invite => (
                  <div key={invite.bandID} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-xs font-bold text-white uppercase">{invite.bandName}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleInvite(invite.bandID, 'active')} className="text-[9px] font-black bg-orange-600 px-2 py-1 rounded">{t('home.join')}</button>
                      <button onClick={() => handleInvite(invite.bandID, 'declined')} className="text-[9px] font-black bg-slate-800 px-2 py-1 rounded">{t('home.no')}</button>
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
        title={t('home.eventIntelligence')}
      >
        <p className="whitespace-pre-wrap italic text-slate-300">
          {noteModal.content}
        </p>
      </Modal>
    </PageWrapper>
  );
}

export default HomeView;