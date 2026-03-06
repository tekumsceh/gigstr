import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { fetchFromApi, postToApi } from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';
import FormInput from '../components/FormInput';
import VenueAutocomplete from './VenueAutocomplete';

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function AddDate() {
  const [searchParams] = useSearchParams();
  const [statuses, setStatuses] = useState([]);
  const [bands, setBands] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const urlDate = searchParams.get('date');
  const urlBandID = searchParams.get('bandID');

  const { register, handleSubmit, watch, reset, setValue, control, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: {
      dateDate: urlDate || '',
      bandID: urlBandID || '',
      dateCurrency: 'EUR',
      dateStatus: ''
    }
  });

  const selectedDate = watch("dateDate");
  const selectedVenue = watch("dateVenue");
  const selectedCity = watch("dateCity");
  const selectedCountry = watch("dateCountry");
  const currentBandID = watch("bandID");

  useEffect(() => {
    fetchFromApi("statuses").then(data => {
      const fetchedStatuses = data || [];
      setStatuses(fetchedStatuses);
      if (fetchedStatuses.length > 0) {
        const confirmedStatus = fetchedStatuses.find(s => s.statusName.toLowerCase() === 'confirmed');
        if (confirmedStatus) setValue("dateStatus", confirmedStatus.statusID);
      }
    });

    fetchFromApi("my-bands").then(data => {
      const bandList = data || [];
      setBands(bandList);
      if (urlBandID) setValue("bandID", urlBandID);
      else if (bandList.length === 1) setValue("bandID", bandList[0].bandID.toString());
    });
  }, [urlBandID, setValue]);

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

  const inputClass = "bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm sm:text-base text-white font-bold outline-none focus:border-orange-500/50 w-full";

  return (
    <div className="w-full min-h-[500px]">
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-success">
            <h2 className="modal-title text-white">{t('addDate.success')}</h2>
            <p className="modal-text text-slate-300">{t('addDate.eventAdded')}</p>
          </div>
        </div>
      )}

      <h3 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8 text-center">
        {currentBandID ? t('addDate.dateDetails') : t('addDate.chooseBand')}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-8 flex flex-col gap-8">
        {/* Band selection */}
        <div className="flex flex-wrap justify-center gap-4">
          {bands
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
                  className={`group flex items-center gap-4 px-8 py-4 border-2 rounded-2xl transition-all duration-200 ${isSelected ? 'cursor-default scale-105 shadow-xl' : 'hover:border-slate-500 hover:bg-slate-800/40 active:scale-95 cursor-pointer'}`}
                >
                  <div className={`w-3 h-3 rounded-full ${isSelected ? 'animate-pulse' : ''}`} style={{ backgroundColor: b.bandColor, boxShadow: isSelected ? `0 0 10px ${b.bandColor}` : 'none' }} />
                  <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{b.bandName}</span>
                  {isSelected && !urlBandID && (
                    <span onClick={(e) => { e.stopPropagation(); setValue("bandID", ""); }} className="ml-4 text-[9px] bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 px-3 py-1 rounded-full transition-all uppercase font-black">{t('addDate.change')}</span>
                  )}
                </button>
              );
            })}
        </div>

        <input type="hidden" {...register("bandID", { required: t('addDate.selectIdentity') })} />
        {errors.bandID && <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest">{errors.bandID.message}</p>}

        {currentBandID && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
            {/* Location */}
            <Section title={t('addDate.location')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <FormInput label={t('addDate.date')} id="dateDate" type="date" error={errors.dateDate} {...register("dateDate", { required: t('addDate.dateRequired') })} />
                  {conflictWarning && <div className="text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 p-2 rounded mt-2">{conflictWarning}</div>}
                </div>
                <FormInput label={t('addDate.city')} id="dateCity" placeholder={t('addDate.cityPlaceholder')} error={errors.dateCity} {...register("dateCity", { required: t('addDate.cityRequired') })} />
                <div className="space-y-2">
                  <label htmlFor="dateVenue" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 block">{t('addDate.venue')}</label>
                  <Controller
                    name="dateVenue"
                    control={control}
                    rules={{ required: t('addDate.venueRequired') }}
                    render={({ field }) => (
                      <VenueAutocomplete
                        id="dateVenue"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        onSelect={(venue) => {
                          setValue("dateVenue", venue.venueName || '');
                          setValue("dateCity", venue.venueCity || '');
                          setValue("dateCountry", venue.venueCountry || '');
                        }}
                        placeholder={t('addDate.venuePlaceholder')}
                        error={errors.dateVenue}
                      />
                    )}
                  />
                </div>
                <FormInput label={t('addDate.country')} id="dateCountry" placeholder={t('addDate.countryPlaceholder')} {...register("dateCountry")} />
              </div>
            </Section>

            {/* Schedule */}
            <Section title={t('addDate.schedule')}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <FormInput label={t('addDate.show')} id="dateStart" type="time" {...register("dateStart")} />
                <FormInput label={t('addDate.loadIn')} id="dateLoadin" type="time" {...register("dateLoadin")} />
                <FormInput label={t('addDate.soundcheck')} id="dateSoundcheck" type="time" {...register("dateSoundcheck")} />
                <FormInput label={t('addDate.doors')} id="dateDoors" type="time" {...register("dateDoors")} />
                <FormInput label={t('addDate.curfew')} id="dateCurfew" type="time" {...register("dateCurfew")} />
              </div>
            </Section>

            {/* Money */}
            <Section title={t('addDate.money')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormInput label={t('addDate.price')} id="datePrice" type="number" step="0.01" placeholder={t('addDate.pricePlaceholder')} {...register("datePrice")} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('addDate.currency')}</span>
                  <select {...register("dateCurrency")} className={inputClass}>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="RSD">RSD</option>
                  </select>
                </div>
              </div>
            </Section>

            {/* Contacts */}
            <Section title={t('addDate.contacts')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormInput label={t('addDate.organizer')} id="dateContactOrganizer" placeholder={t('addDate.organizerPlaceholder')} {...register("dateContactOrganizer")} />
                <FormInput label={t('addDate.tech')} id="dateContactTech" placeholder={t('addDate.techPlaceholder')} {...register("dateContactTech")} />
              </div>
            </Section>

            {/* Details */}
            <Section title={t('addDate.details')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormInput label={t('addDate.category')} id="dateCategory" placeholder={t('addDate.categoryPlaceholder')} {...register("dateCategory")} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('addDate.status')}</span>
                  <select {...register("dateStatus", { valueAsNumber: true })} className={inputClass}>
                    {statuses?.length ? statuses.filter(s => s.statusName.toLowerCase() !== 'done').map((s) => <option key={s.statusID} value={s.statusID}>{s.statusName}</option>) : <option value="">{t('common.loading')}</option>}
                  </select>
                </div>
              </div>
            </Section>

            {/* Notes */}
            <Section title={t('addDate.notes')}>
              <textarea
                {...register("dateDescription")}
                className={inputClass + " min-h-[100px] resize-y"}
                placeholder={t('addDate.notesPlaceholder')}
              />
            </Section>

            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button type="submit" className="btn-primary flex-grow py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.2em] rounded-sm transition-colors">
                {t('common.add')}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 px-8 font-black uppercase tracking-[0.2em] rounded-sm transition-colors">
                {t('common.back')}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default AddDate;