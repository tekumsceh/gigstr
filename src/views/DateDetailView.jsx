import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { fetchFromApi, postToApi, deleteFromApi } from '../services/dataService';

function DateDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const bottomRef = useRef(null);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchFromApi(`date/${id}`).then(data => {
      // In case data is an array, take the first element
      const eventData = Array.isArray(data) ? data[0] : data;
      setEvent(eventData);
      reset(eventData);
      setLoading(false);
    });
  }, [id, reset]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const onSubmit = async (formData) => {
    try {
      const result = await postToApi(`update-date/${id}`, formData);
      if (result) {
        setEvent({ ...event, ...formData });
        setIsEditing(false);
      }
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const onDelete = async (targetId) => {
    // Safety check: Ensure targetId is the actual ID and not the event object
    const finalId = typeof targetId === 'object' ? targetId.dateID : targetId;

    if (!finalId) {
      console.error("Delete failed: No ID provided");
      return;
    }

    if (window.confirm("Are you sure you want to expunge this entry?")) {
      try {
        const response = await deleteFromApi(`delete-date/${finalId}`);
        if (response.success) {
          navigate('/'); 
        }
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-500 uppercase font-black text-[14px]">Loading Ledger...</div>;
  if (!event) return <div className="p-20 text-center text-red-500 uppercase font-black text-[14px]">Event not found.</div>;

  const displayDate = event.dateDate ? event.dateDate.substring(0, 10) : '0000-00-00';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(displayDate);
  const isPast = eventDate < today;

  const accentColor = event.bandColor || '#ff5f00';

  return (
    <div className="w-[90%] max-w-[1400px] mx-auto py-12">
      
      {/* HEADER */}
      <div className="p-10 border-b border-slate-800 shrink-0 bg-slate-950/40" style={{ borderLeft: `10px solid ${accentColor}` }}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[12px] font-black uppercase tracking-[0.5em]" style={{ color: accentColor }}>
                {event.bandName} {isPast && <span className="text-slate-600 opacity-50 ml-4">// ARCHIVED</span>}
            </span>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none mt-2">
              {displayDate} <span className="text-slate-800">/</span> {event.dateCity}
            </h1>
          </div>
          <div className="flex gap-6">
            <button type="button" onClick={() => navigate(-1)} className="text-[14px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Back</button>
            {!isPast && (
              <button 
                type="button" 
                onClick={() => setIsEditing(!isEditing)} 
                className="text-[14px] font-black uppercase tracking-widest bg-white text-black px-8 py-3 hover:bg-[#ff5f00] hover:text-white transition-all shadow-lg"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FORM BODY */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-10 custom-scrollbar relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-12 mb-10">
          <DetailRow label="Event Date" value={displayDate} field="dateDate" type="date" isEditing={isEditing} register={register} />
          <DetailRow label="City" value={event.dateCity} field="dateCity" isEditing={isEditing} register={register} />
          <DetailRow label="Venue" value={event.dateVenue} field="dateVenue" isEditing={isEditing} register={register} />
          
          <div className="col-span-full border-t border-slate-800/50 my-4"></div>

          <DetailRow label="Country" value={event.dateCountry} field="dateCountry" isEditing={isEditing} register={register} />
          <DetailRow label="Category" value={event.dateCategory} field="dateCategory" isEditing={isEditing} register={register} />
          <DetailRow label="Organizer" value={event.dateContactOrganizer} field="dateContactOrganizer" isEditing={isEditing} register={register} />
          
          <div className="col-span-full border-t border-slate-800/50 my-4"></div>

          <DetailRow label="Show Time" value={event.dateStart?.substring(0,5)} field="dateStart" type="time" isEditing={isEditing} register={register} />
          <DetailRow label="Load-in" value={event.dateLoadin?.substring(0,5)} field="dateLoadin" type="time" isEditing={isEditing} register={register} />
          <DetailRow label="Soundcheck" value={event.dateSoundcheck?.substring(0,5)} field="dateSoundcheck" type="time" isEditing={isEditing} register={register} />
          
          <div className="col-span-full border-t border-slate-800/50 my-4"></div>

          <DetailRow label="Price" value={event.datePrice} field="datePrice" type="number" isEditing={isEditing} register={register} />
          <DetailRow label="Currency" value={event.dateCurrency} field="dateCurrency" isEditing={isEditing} register={register} />
          <DetailRow label="Status" value={event.statusName} field="dateStatus" isEditing={false} />
        </div>

        <div className="mt-16 mb-24">
          <span className="text-[12px] font-black text-slate-600 uppercase tracking-widest block mb-4">Notes & Description</span>
          {isEditing ? (
            <textarea {...register("dateDescription")} className="w-full bg-slate-950 border border-slate-800 p-6 text-[24px] text-slate-300 font-black uppercase h-64 outline-none focus:border-[#ff5f00]" />
          ) : (
            <p className="text-[24px] text-slate-400 font-black uppercase leading-tight tracking-tight">{event.dateDescription || '—'}</p>
          )}
        </div>

        <div ref={bottomRef} className="h-4" />
      </form>

      {/* CONTROL STRIP */}
      <div className="absolute bottom-6 right-6 flex items-center gap-[6px] z-50">
        <button
          type="button"
          onClick={scrollToBottom}
          className="bg-slate-900 border border-slate-700 text-white w-[50px] h-[50px] flex items-center justify-center rounded-sm shadow-xl hover:border-slate-400 transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-y-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {!isPast && isEditing && (
          <div className="flex gap-[6px]">
            <button 
              type="button" 
              // FIXED: Changed from 'data.dateID' to 'event.dateID'
              onClick={() => onDelete(event.dateID)} 
              className="h-[50px] bg-red-950/30 border border-red-900/50 text-red-500 font-black uppercase text-[12px] tracking-[0.3em] px-6 hover:bg-red-600 hover:text-white transition-all rounded-sm"
            >
              Delete this event
            </button>
            <button 
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="w-[100px] h-[50px] bg-[#ff5f00] text-white font-black uppercase text-[12px] tracking-widest shadow-[0_0_30px_rgba(255,95,0,0.3)] hover:bg-white hover:text-black transition-all border border-[#ff5f00] rounded-sm"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, field, isEditing, register, type="text" }) {
  return (
    <div className="flex flex-col border-b border-slate-800/40 pb-2">
      <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      {isEditing ? (
        <input {...register(field)} type={type} className="bg-transparent text-white text-[24px] focus:outline-none font-black uppercase" />
      ) : (
        <span className="text-[24px] font-black text-slate-200 uppercase truncate leading-none">{value || '—'}</span>
      )}
    </div>
  );
}

export default DateDetailView;
