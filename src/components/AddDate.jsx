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
          setConflictWarning(`Conflict: Event already booked at ${data.event.dateVenue} on this day.`);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        console.error("Failed to check conflicts");
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
      alert("Submission failed. Check your network connection.");
    }
  };

  return (
  <div className="w-full">
    {/* SUCCESS MODAL */}
    {showModal && (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-md shadow-2xl text-center max-w-sm w-full">
          <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest mb-2">Success</h2>
          <p className="text-slate-400 text-sm mb-6">Event added to ledger.</p>
        </div>
      </div>
    )}

    {/* DYNAMIC PAGE TITLE */}
    <h3 className="text-2xl font-black uppercase tracking-widest text-slate-200 mb-6 transition-all duration-300">
      {currentBandID ? "Fill in the date details" : "Choose a band to add date for"}
    </h3>

    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-900/50 border border-slate-800 p-4 md:p-6 rounded-md shadow-xl flex flex-col gap-6">
      
      {/* --- STEP 1: IDENTITY SELECTION --- */}
      <div>
        <div className="flex flex-wrap gap-3 mb-2">
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
                    borderColor: isSelected ? b.bandColor : 'transparent',
                    backgroundColor: isSelected ? `${b.bandColor}20` : '#0f172a',
                    cursor: isSelected ? 'default' : 'pointer'
                  }}
                  className={`
                    group relative flex items-center gap-3 px-4 py-3 border-2 rounded-md transition-all duration-300
                    ${isSelected ? 'shadow-[0_0_15px_-3px_rgba(0,0,0,0.2)]' : 'border-slate-800 hover:border-slate-700'}
                  `}
                >
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: b.bandColor }}></span>
                  <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {b.isSolo ? `👤 ${b.bandName}` : b.bandName}
                  </span>
                  
                  {/* CHANGE identity button */}
                  {isSelected && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setValue("bandID", "");
                      }}
                      className="ml-3 text-[9px] bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-500 px-2 py-1 rounded-sm cursor-pointer transition-all uppercase font-black"
                    >
                      Change
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        <input type="hidden" {...register("bandID", { required: true })} />
        {errors.bandID && <p className="text-[9px] text-red-500 font-black uppercase mt-1">Please select an identity</p>}
      </div>

      {/* --- STEP 2: DETAILS (Visible only after selection) --- */}
      {currentBandID && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date *</label>
              <input 
                {...register("dateDate", { required: true })} 
                type="date" 
                className={`w-full h-[46px] bg-slate-950 border ${errors.dateDate ? 'border-red-500' : 'border-slate-700'} text-white px-3 text-sm focus:outline-none focus:border-orange-500 transition-colors`} 
              />
              {conflictWarning && <div className="mt-2 text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 border border-orange-500/30 p-2 rounded-sm">{conflictWarning}</div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">City</label>
                <input {...register("dateCity")} type="text" className="w-full h-[46px] bg-slate-950 border border-slate-700 text-white px-3 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Venue</label>
                <input {...register("dateVenue")} type="text" className="w-full h-[46px] bg-slate-950 border border-slate-700 text-white px-3 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="col-span-1 md:col-span-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Price</label>
              <input {...register("datePrice")} type="number" step="0.01" className="w-full h-[46px] bg-slate-950 border border-slate-700 text-white px-3 text-sm font-mono" />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cur</label>
              <select {...register("dateCurrency")} className="w-full h-[46px] bg-slate-950 border border-slate-700 text-white px-3 text-sm focus:outline-none">
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
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-500 w-full text-center py-2 transition-colors"
          >
            {showAdvanced ? "- Basic View" : "+ Detailed View (Logistics & Contacts)"}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {["dateLoadin", "dateSoundcheck", "dateDoors", "dateStart", "dateCurfew"].map((timeField) => (
                <div key={timeField}>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {timeField.replace('date', '').replace('time', '')}
                  </label>
                  <input {...register(timeField)} type="time" className="w-full h-[40px] bg-slate-950 border border-slate-700 text-slate-300 px-2 text-xs" />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-800">
            <button 
              type="submit" 
              className="flex-[2] bg-orange-600 text-white py-4 rounded-sm text-[12px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg active:scale-[0.98]"
            >
              Add Event
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="flex-[1] bg-slate-800 text-slate-400 py-4 rounded-sm text-[12px] font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  </div>
);
}

export default AddDate;