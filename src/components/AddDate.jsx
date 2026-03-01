import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { fetchFromApi, postToApi } from '../services/dataService'; 
import FormInput from '../components/FormInput'; 

function AddDate() {
  const [searchParams] = useSearchParams();
  const [statuses, setStatuses] = useState([]);
  const [bands, setBands] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  const navigate = useNavigate();

  // 1. Grab URL params immediately
  const urlDate = searchParams.get('date');
  const urlBandID = searchParams.get('bandID');

  // 2. We MUST destructure setValue here to use it in useEffect
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: { 
      dateDate: urlDate || '', 
      bandID: urlBandID || '',
      dateCurrency: 'EUR',
      dateStatus: '' // Start empty, useEffect will populate this with the integer ID
    }
  });

  const selectedDate = watch("dateDate");
  const selectedVenue = watch("dateVenue");
  const selectedCity = watch("dateCity");
  const selectedCountry = watch("dateCountry");
  const currentBandID = watch("bandID");

  // 3. Load bands, statuses, and handle the "Auto-Select" logic
  useEffect(() => {
    // Fetch and auto-select Status
    fetchFromApi("statuses").then(data => {
      const fetchedStatuses = data || [];
      setStatuses(fetchedStatuses);
      
      if (fetchedStatuses.length > 0) {
        const confirmedStatus = fetchedStatuses.find(s => s.statusName.toLowerCase() === 'confirmed');
        if (confirmedStatus) {
          setValue("dateStatus", confirmedStatus.statusID);
        }
      }
    });

    // Fetch and auto-select Bands
    fetchFromApi("my-bands").then(data => {
      const bandList = data || [];
      setBands(bandList);

      // Force selection if parameters exist in URL
      if (urlBandID) {
        setValue("bandID", urlBandID);
      } else if (bandList.length === 1) {
        setValue("bandID", bandList[0].bandID.toString());
      }
    });
  }, [urlBandID, setValue]);

  // 4. Conflict Check Logic
  useEffect(() => {
    const checkDateConflict = async () => {
      if (!selectedDate || !selectedVenue) {
        setConflictWarning(null);
        return;
      }
      try {
        const data = await fetchFromApi("check-conflict", {
          date: selectedDate,
          venue: selectedVenue,
          city: selectedCity,
          country: selectedCountry
        });
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
  }, [selectedDate, selectedVenue, selectedCity, selectedCountry]);

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
    <div className="w-full min-h-[500px]">
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
        {currentBandID ? "Date Details" : "Choose a Band"}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-8 flex flex-col gap-8">
        
        {/* --- STEP 1: IDENTITY SELECTION --- */}
        <div className="flex flex-wrap justify-center gap-4">
          {bands
            // Use loose inequality (!=) to handle string vs number comparison from URL
            .filter(b => !currentBandID || currentBandID == b.bandID)
            .map((b) => {
              const isSelected = currentBandID == b.bandID;
              return (
                <button
                  key={b.bandID}
                  type="button"
                  onClick={() => !isSelected && setValue("bandID", b.bandID.toString())}
                  style={{ 
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
                  <div 
                    className={`w-3 h-3 rounded-full ${isSelected ? 'animate-pulse' : ''}`} 
                    style={{ 
                      backgroundColor: b.bandColor,
                      boxShadow: isSelected ? `0 0 10px ${b.bandColor}` : 'none'
                    }}
                  ></div>

                  <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {b.bandName}
                  </span>
                  
                  {isSelected && !urlBandID && (
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
        
        {/* Hidden input for validation */}
        <input type="hidden" {...register("bandID", { required: "Please select an identity" })} />
        {errors.bandID && <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest">{errors.bandID.message}</p>}

        {/* --- STEP 2:  DETAILS --- */}
        {currentBandID && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              <div className="space-y-2">
                {/* Changed from <Input> to <FormInput> to match your imports and prevent undefined errors */}
                <FormInput 
                  label="Event Date"
                  id="dateDate"
                  type="date"
                  error={errors.dateDate}
                  {...register("dateDate", { required: "Event date is required" })}
                />
                {conflictWarning && (
                  <div className="text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 p-2 rounded mt-2">
                    {conflictWarning}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormInput 
                  label="City"
                  id="dateCity"
                  placeholder="e.g. London"
                  error={errors.dateCity}
                  {...register("dateCity", { required: "City is required" })}
                />
                <FormInput 
                  label="Venue"
                  id="dateVenue"
                  placeholder="e.g. O2 Arena"
                  error={errors.dateVenue}
                  {...register("dateVenue", { required: "Venue is required" })}
                />
                <FormInput 
                  label="Country"
                  id="dateCountry"
                  placeholder="e.g. UK"
                  {...register("dateCountry")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end">
              <div className="col-span-2 md:col-span-2">
                <FormInput 
                  label="Guarantee / Price"
                  id="datePrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.datePrice}
                  {...register("datePrice")}
                />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Currency</label>
                <select {...register("dateCurrency")} className="w-full bg-slate-950 border border-slate-800 p-3 text-white rounded font-bold outline-none focus:border-slate-500 uppercase text-[12px]">
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="RSD">RSD</option>
                </select>
              </div>

              {/* NEW STATUS DROPDOWN */}
              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Status</label>
                <select {...register("dateStatus", { valueAsNumber: true })} className="w-full bg-slate-950 border border-slate-800 p-3 text-white rounded font-bold outline-none focus:border-orange-500 uppercase text-[12px]">
                  {statuses && statuses.length > 0 ? (
                    statuses
                      .filter(s => s.statusName.toLowerCase() !== 'done')
                      .map((s) => (
                        <option key={s.statusID} value={s.statusID}>
                          {s.statusName}
                        </option>
                      ))
                  ) : (
                    <option value="">Loading...</option>
                  )}
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
                  <FormInput
                    key={timeField}
                    label={timeField.replace('date', '')}
                    id={timeField}
                    type="time"
                    error={errors[timeField]}
                    {...register(timeField)}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button 
                type="submit" 
                className="btn-primary flex-grow py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.2em] rounded-sm transition-colors"
              >
                Add this event to your calendar
              </button>
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 px-8 font-black uppercase tracking-[0.2em] rounded-sm transition-colors"
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