import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { fetchFromApi, postToApi, deleteFromApi } from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import VenueAutocomplete from '../components/VenueAutocomplete';
import PageWrapper from '../components/layouts/PageWrapper';
import SingleColumnLayout from '../components/layouts/SingleColumnLayout';
import { formatDateUniform } from '../utils/dateFormat';

function DateDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const { register, handleSubmit, reset, control, setValue } = useForm();

  useEffect(() => {
    Promise.all([
      fetchFromApi(`date/${id}`),
      fetchFromApi('statuses'),
    ])
      .then(([data, statusData]) => {
        const eventData = Array.isArray(data) ? data[0] : data;
        if (eventData?.dateDate?.includes('T')) {
          eventData.dateDate = eventData.dateDate.split('T')[0];
        }
        setEvent(eventData);
        setStatuses(statusData || []);
        reset(eventData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load details', err);
        setLoading(false);
      });
  }, [id, reset]);

  const onSubmit = async (formData) => {
    try {
      if (formData.dateStatus) formData.dateStatus = parseInt(formData.dateStatus);
      const result = await postToApi(`update-date/${id}`, formData);
      if (result) {
        const updatedStatus = statuses.find((s) => s.statusID === formData.dateStatus);
        setEvent({
          ...event,
          ...formData,
          statusName: updatedStatus ? updatedStatus.statusName : event.statusName,
        });
        setIsEditing(false);
      }
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  };

  const onDeleteClick = (targetId) => {
    const finalId = typeof targetId === 'object' ? targetId.dateID : targetId;
    if (finalId) setShowDeleteModal(finalId);
  };

  const onDeleteConfirm = async () => {
    if (!showDeleteModal) return;
    const finalId = showDeleteModal;
    setShowDeleteModal(false);
    const rawDate = event?.dateDate ? String(event.dateDate).substring(0, 10) : null;
    const eventDay = rawDate ? new Date(rawDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDay) {
      eventDay.setHours(0, 0, 0, 0);
      if (eventDay < today) {
        alert(t('dateDetail.cannotDeletePast') || 'Past dates cannot be deleted.');
        return;
      }
    }
    try {
      const response = await deleteFromApi(`delete-date/${finalId}`);
      if (response.success) navigate('/');
    } catch (err) {
      alert(err?.response?.data?.error || 'Delete failed: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 uppercase font-black text-sm">{t('dateDetail.loadingLedger')}</div>;
  if (!event) return <div className="p-8 text-center text-red-500 uppercase font-black text-sm">{t('dateDetail.eventNotFound')}</div>;

  const rawDate = event.dateDate ? event.dateDate.substring(0, 10) : null;
  const displayDate = formatDateUniform(event.dateDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(rawDate || 0);
  const isPast = eventDate < today;
  const paid = parseFloat(event.datePaidAmount || 0);
  const price = parseFloat(event.datePrice || 0);
  const balance = price - paid;
  const sym = { EUR: '€', USD: '$', GBP: '£', RSD: ' RSD' }[event.dateCurrency] || '€';

  const timeVal = (v) => (v && String(v).length >= 5 ? String(v).substring(0, 5) : null);

  return (
    <PageWrapper className="pt-0 pb-4 flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-error" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('dateDetail.deleteTitle')}</h2>
            <p className="modal-text text-slate-300">{t('dateDetail.deleteConfirm')}</p>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider border border-slate-600 text-slate-300 rounded hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={onDeleteConfirm}
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <SingleColumnLayout maxWidth="max-w-[900px]" className="pt-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Back button row */}
        <div className="w-full flex justify-start mb-3 px-4 sm:px-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors py-2"
          >
            {t('common.back')}
          </button>
        </div>

        {isPast && (
          <p className="mb-3 px-4 sm:px-0 text-[11px] text-slate-500 uppercase tracking-wider">
            {t('dateDetail.pastDisclaimer')}
          </p>
        )}

        <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-900/20 border border-slate-800 rounded-lg overflow-visible">
          {/* Band row with edit icon */}
          <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {t('home.band')}:
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-200">
                  {event.bandName || '—'}
                  {isPast && (
                    <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {t('dateDetail.archived')}
                    </span>
                  )}
                </span>
              </div>
              {!isPast && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-200 hover:bg-orange-500 hover:border-orange-500 hover:text-white transition-colors flex items-center justify-center"
                  aria-label={isEditing ? t('common.cancel') : t('dateDetail.edit')}
                >
                  {/* Pen icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      d="M4 13.5V16h2.5L14 8.5l-2.5-2.5L4 13.5z"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.5 6l2-2a1.414 1.414 0 012 2l-2 2"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Form container: only this scrolls, height = viewport - header - title - footer */}
          <div className="relative flex-1 min-h-0">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className={`h-full max-h-[calc(100vh-14rem)] overflow-y-auto p-4 sm:p-6 pb-4 custom-scrollbar ${isEditing ? 'bg-slate-800/30' : ''}`}
            >
            <div className="space-y-6">
              {/* Location */}
              <Section title={t('addDate.location')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <DetailRow label={t('addDate.date')} value={rawDate} field="dateDate" type="date" isEditing={isEditing} register={register} displayValue={displayDate} />
                  <DetailRow label={t('addDate.city')} value={event.dateCity} field="dateCity" isEditing={isEditing} register={register} />
                  {isEditing ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('addDate.venue')}</span>
                      <Controller
                        name="dateVenue"
                        control={control}
                        render={({ field }) => (
                          <VenueAutocomplete
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            onSelect={(venue) => {
                              setValue("dateVenue", venue.venueName || '');
                              setValue("dateCity", venue.venueCity || '');
                              setValue("dateCountry", venue.venueCountry || '');
                            }}
                            placeholder={t('addDate.venuePlaceholder')}
                          />
                        )}
                      />
                    </div>
                  ) : (
                    <DetailRow label={t('addDate.venue')} value={event.dateVenue} readOnly />
                  )}
                  <DetailRow label={t('addDate.country')} value={event.dateCountry} field="dateCountry" isEditing={isEditing} register={register} />
                </div>
              </Section>

              {/* Schedule */}
              <Section title={t('addDate.schedule')}>
                {isEditing ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <DetailRow
                      label={t('addDate.loadIn')}
                      value={timeVal(event.dateLoadin)}
                      field="dateLoadin"
                      type="time"
                      isEditing={isEditing}
                      register={register}
                    />
                    <DetailRow
                      label={t('addDate.soundcheck')}
                      value={timeVal(event.dateSoundcheck)}
                      field="dateSoundcheck"
                      type="time"
                      isEditing={isEditing}
                      register={register}
                    />
                    <DetailRow
                      label={t('addDate.doors')}
                      value={timeVal(event.dateDoors)}
                      field="dateDoors"
                      type="time"
                      isEditing={isEditing}
                      register={register}
                    />
                    <DetailRow
                      label={t('addDate.show')}
                      value={timeVal(event.dateStart)}
                      field="dateStart"
                      type="time"
                      isEditing={isEditing}
                      register={register}
                    />
                    <DetailRow
                      label={t('addDate.curfew')}
                      value={timeVal(event.dateCurfew)}
                      field="dateCurfew"
                      type="time"
                      isEditing={isEditing}
                      register={register}
                    />
                  </div>
                ) : (
                  <div className="space-y-1 text-sm sm:text-base text-slate-200">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        {t('addDate.loadIn')}: {timeVal(event.dateLoadin) || '—'}
                      </span>
                      <span>
                        {t('addDate.soundcheck')}: {timeVal(event.dateSoundcheck) || '—'}
                      </span>
                      <span>
                        {t('addDate.doors')}: {timeVal(event.dateDoors) || '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        {t('addDate.show')}: {timeVal(event.dateStart) || '—'}
                      </span>
                      <span>
                        {t('addDate.curfew')}: {timeVal(event.dateCurfew) || '—'}
                      </span>
                    </div>
                  </div>
                )}
              </Section>

              {/* Money */}
              <Section title={t('addDate.money')}>
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <DetailRow
                      label={t('addDate.price')}
                      value={price != null ? `${price}${sym}` : null}
                      field="datePrice"
                      type="number"
                      isEditing={isEditing}
                      register={register}
                    />
                    <DetailRow
                      label={t('addDate.currency')}
                      value={event.dateCurrency}
                      field="dateCurrency"
                      isEditing={isEditing}
                      register={register}
                      options={[
                        { id: 'EUR', name: 'EUR' },
                        { id: 'USD', name: 'USD' },
                        { id: 'GBP', name: 'GBP' },
                        { id: 'RSD', name: 'RSD' },
                      ]}
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col items-start gap-3">
                    {user?.role === 'GOD' && (
                      <>
                        {!showPrice && (
                          <button
                            type="button"
                            onClick={() => setShowPrice(true)}
                            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                          >
                            Show price
                          </button>
                        )}
                        {showPrice && (
                          <span className="text-sm sm:text-base font-bold text-slate-200">
                            {t('addDate.price')}: {price != null ? `${price}${sym}` : '—'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/date/${id}/finance`)}
                          className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 transition-colors"
                        >
                          Open finance worksheet
                        </button>
                      </>
                    )}
                    {user?.role !== 'GOD' && (
                      <span className="text-xs text-slate-500">
                        Price and settlement details are managed by the band admin.
                      </span>
                    )}
                  </div>
                )}
              </Section>

              {/* Contacts */}
              <Section title={t('addDate.contacts')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <DetailRow label={t('addDate.organizer')} value={event.dateContactOrganizer} field="dateContactOrganizer" isEditing={isEditing} register={register} />
                  <DetailRow label={t('addDate.tech')} value={event.dateContactTech} field="dateContactTech" isEditing={isEditing} register={register} />
                </div>
              </Section>

              {/* Status & Category */}
              <Section title={t('addDate.details')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <DetailRow label={t('addDate.category')} value={event.dateCategory} field="dateCategory" isEditing={isEditing} register={register} />
                  <DetailRow
                    label={t('addDate.status')}
                    value={isPast ? 'DONE' : event.statusName}
                    field="dateStatus"
                    isEditing={isEditing && !isPast}
                    register={register}
                    options={statuses.filter((s) => s.statusName.toLowerCase() !== 'done').map((s) => ({ id: s.statusID, name: s.statusName }))}
                    valueAsNumber
                  />
                </div>
              </Section>

              {/* Notes */}
              <Section title={t('addDate.notes')}>
                {isEditing ? (
                  <textarea
                    {...register('dateDescription')}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 sm:p-4 text-sm sm:text-base text-slate-300 font-medium min-h-[100px] outline-none focus:border-orange-500/50 resize-y"
                    placeholder={t('addDate.notesPlaceholder')}
                  />
                ) : (
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed whitespace-pre-wrap border border-slate-700 rounded px-3 py-3 sm:px-4 sm:py-4 bg-slate-950/50 min-h-[100px]">{event.dateDescription || '—'}</p>
                )}
              </Section>
            </div>
          </form>
          </div>
        </div>

        {/* Save/Delete: in flow, never overlap inputs */}
        {!isPast && isEditing && (
          <div className="flex items-center justify-end gap-2 p-4 mt-4 pb-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onDeleteClick(event.dateID)}
              className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-500 border border-red-800/50 rounded hover:bg-red-900/30 transition-colors"
            >
              {t('common.delete')}
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-orange-500 text-white rounded hover:bg-orange-400 transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        )}
      </SingleColumnLayout>
    </PageWrapper>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value, field, isEditing, register, type = 'text', options, valueAsNumber = false, readOnly, displayValue }) {
  const showVal = displayValue ?? value;
  const isEditable = isEditing && register && !readOnly;

  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 w-full">
      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {label}:
      </span>
      {readOnly || !isEditable ? (
        <span className="text-sm sm:text-base font-bold text-slate-200">
          {showVal ?? '—'}
        </span>
      ) : options ? (
        <select
          {...register(field, { valueAsNumber })}
          className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm sm:text-base text-white font-bold outline-none focus:border-orange-500/50"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-slate-900">
              {opt.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...register(field)}
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm sm:text-base text-white font-bold outline-none focus:border-orange-500/50"
        />
      )}
    </div>
  );
}

export default DateDetailView;
