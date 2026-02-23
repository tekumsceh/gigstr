import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { fetchFromApi, postToApi } from '../services/dataService'; 

function AddDate() {
  const [statuses, setStatuses] = useState([]);
  const [bands, setBands] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { dateCurrency: 'EUR', bandID: '' }
  });

  const selectedDate = watch("dateDate");
  const currentBandID = watch("bandID");

  useEffect(() => {
    fetchFromApi("statuses").then(data => setStatuses(data || []));
    fetchFromApi("my-bands").then(data => {
      setBands(data || []);
      if (data && data.length === 1) {
        setValue("bandID", data[0].bandID);
      }
    });
  }, [setValue]);

  useEffect(() => {
    const checkDateConflict = async () => {
      if (!selectedDate) {
        setConflictWarning(null);
        return;
      }
      try {
        const data = await fetchFromApi("check-conflict", { date: selectedDate });
        if (data.conflict) {
          setConflictWarning(`Conflict: Event booked at ${data.event.dateVenue}`);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        console.error("Conflict check failed");
      }
    };
    checkDateConflict();
  }, [selectedDate]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, bandID: parseInt(data.bandID) };
      const result = await postToApi("add-date", payload);
      if (result) {
        setShowModal(true);
        reset(); 
        setTimeout(() => navigate('/'), 2500);
      }
    } catch (err) {
      alert("Submission failed.");
    }
  };

  return (
    <div className="w-full">
      {/* SUCCESS MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-success">
            <h2 className="modal-title text-white">Success</h2>
            <p className="modal-text text-slate-300">Event added to ledger.</p>
          </div>
        </div>
      )}

      <h3 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8 text-center">
        {currentBandID ? "Date Details" : "Select Identity"}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-8 flex flex-col gap-8">
        
{/* --- STEP 1: IDENTITY SELECTION (Button Style) --- */}
<div className="flex flex-wrap justify-center gap-4">
  {bands
    .filter(b => !currentBandID || parseInt(currentBandID) === b.bandID)
    .map((b) => {
      const isSelected = parseInt(currentBandID) === b.bandID;
      return (
        <button
          key={b.bandID}
          type="button"
          onClick={() => !currentBandID && setValue("bandID", b.bandID)}
          style={{ 
            /* We use a specific slate-800 hex for the border so it's visible */
            borderColor: isSelected ? b.bandColor : '#1e293b', 
            backgroundColor: isSelected ? `${b.bandColor}15` : '#0f172a',
            boxShadow: isSelected ? `0 0 20px ${b.bandColor}30` : 'none'
          }}
          className={`
            group flex items-center gap-4 px-8 py-4 border-2 rounded-2xl transition-all duration-200
            ${isSelected 
              ? 'cursor-default scale-105 shadow-xl' 
              : 'hover:border-slate-500 hover:bg-slate-800/40 active:scale-95 cursor-pointer'
            }
          `}
        >
          {/* Glowing Indicator Dot */}
          <div 
            className={`w-3 h-3 rounded-full transition-shadow duration-300 ${isSelected ? 'animate-pulse' : ''}`} 
            style={{ 
              backgroundColor: b.bandColor,
              boxShadow: isSelected ? `0 0 10px ${b.bandColor}` : 'none'
            }}
          ></div>

          <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
            {b.bandName}
          </span>
          
          {isSelected && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setValue("bandID", "");
              }}
              className="ml-4 text-[9px] bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 px-3 py-1 rounded-full transition-all uppercase font-black"
            >
              Change
            </span>
          )}
        </button>
      );
    })}
</div>
        <input type="hidden" {...register("bandID", { required: true })} />
        {errors.bandID && <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest">Please select an identity</p>}

        {/* --- STEP 2: FORM DETAILS --- */}
        {currentBandID && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Event Date</label>
                <input 
                  {...register("dateDate", { required: true })} 
                  type="date" 
                  className={`input-field w-full ${errors.dateDate ? 'border-red-500' : ''}`} 
                />
                {conflictWarning && (
                  <div className="text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 p-2 rounded">
                    {conflictWarning}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">City</label>
                  <input {...register("dateCity")} type="text" className="input-field w-full" placeholder="e.g. London" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Venue</label>
                  <input {...register("dateVenue")} type="text" className="input-field w-full" placeholder="e.g. O2 Arena" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end">
              <div className="col-span-1 md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Guarantee / Price</label>
                <input {...register("datePrice")} type="number" step="0.01" className="input-field w-full font-mono" placeholder="0.00" />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Currency</label>
                <select {...register("dateCurrency")} className="input-field w-full cursor-pointer">
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="RSD">RSD</option>
                </select>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              className="w-full py-2 border-y border-slate-800 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-colors"
            >
              {showAdvanced ? "Hide Logistics" : "Show Logistics (Times & Notes)"}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {["dateLoadin", "dateSoundcheck", "dateDoors", "dateStart", "dateCurfew"].map((timeField) => (
                  <div key={timeField} className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block text-center">
                      {timeField.replace('date', '')}
                    </label>
                    <input {...register(timeField)} type="time" className="input-field w-full text-center" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button 
                type="submit" 
                className="btn btn-primary flex-grow py-4 text-[11px] uppercase tracking-[0.2em]"
              >
                Add this event to your calendar
              </button>
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 text-[11px] uppercase tracking-[0.2em] px-8"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default AddDate;