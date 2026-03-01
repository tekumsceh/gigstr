import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { fetchFromApi, postToApi, deleteFromApi } from '../services/dataService';
import PageWrapper from '../components/layouts/PageWrapper';
import SingleColumnLayout from '../components/layouts/SingleColumnLayout';

function DateDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm();

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

  const onDelete = async (targetId) => {
    const finalId = typeof targetId === 'object' ? targetId.dateID : targetId;
    if (!finalId) return;
    if (window.confirm('Are you sure you want to expunge this entry?')) {
      try {
        const response = await deleteFromApi(`delete-date/${finalId}`);
        if (response.success) navigate('/');
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 uppercase font-black text-sm">Loading Ledger...</div>;
  if (!event) return <div className="p-8 text-center text-red-500 uppercase font-black text-sm">Event not found.</div>;

  const rawDate = event.dateDate ? event.dateDate.substring(0, 10) : null;
  const displayDate = rawDate
    ? (() => {
        const [y, m, d] = rawDate.split('-');
        return `${d}-${m}-${y.slice(-2)}`;
      })()
    : '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(rawDate || 0);
  const isPast = eventDate < today;
  const accentColor = event.bandColor || '#ff5f00';
  const paid = parseFloat(event.datePaidAmount || 0);
  const price = parseFloat(event.datePrice || 0);
  const balance = price - paid;
  const sym = { EUR: '€', USD: '$', GBP: '£', RSD: ' RSD' }[event.dateCurrency] || '€';

  const timeVal = (v) => (v && String(v).length >= 5 ? String(v).substring(0, 5) : null);

  return (
    <PageWrapper className="pt-0 pb-4 flex-1 min-h-0 flex flex-col overflow-hidden">
      <SingleColumnLayout maxWidth="max-w-[900px]" className="pt-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-900/20 border border-slate-800 rounded-lg overflow-visible">
          {/* Compact header */}
          <div
            className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ borderLeft: `6px solid ${accentColor}` }}
          >
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider" style={{ color: accentColor }}>
                {event.bandName}
                {isPast && <span className="text-slate-600 opacity-60 ml-2">// ARCHIVED</span>}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight truncate mt-0.5">
                {displayDate} · {event.dateCity || '—'}
              </h1>
            </div>
            <div className="flex gap-3 shrink-0">
              <button type="button" onClick={() => navigate(-1)} className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors py-2">
                Back
              </button>
              {!isPast && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-black uppercase tracking-wider bg-white text-black px-4 py-2 sm:px-5 sm:py-2.5 hover:bg-orange-500 hover:text-white transition-all rounded"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
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
              <Section title="Location">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <DetailRow label="Date" value={rawDate} field="dateDate" type="date" isEditing={isEditing} register={register} displayValue={displayDate} />
                  <DetailRow label="City" value={event.dateCity} field="dateCity" isEditing={isEditing} register={register} />
                  <DetailRow label="Venue" value={event.dateVenue} field="dateVenue" isEditing={isEditing} register={register} />
                  <DetailRow label="Country" value={event.dateCountry} field="dateCountry" isEditing={isEditing} register={register} />
                </div>
              </Section>

              {/* Schedule */}
              <Section title="Schedule">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <DetailRow label="Show" value={timeVal(event.dateStart)} field="dateStart" type="time" isEditing={isEditing} register={register} />
                  <DetailRow label="Load-in" value={timeVal(event.dateLoadin)} field="dateLoadin" type="time" isEditing={isEditing} register={register} />
                  <DetailRow label="Soundcheck" value={timeVal(event.dateSoundcheck)} field="dateSoundcheck" type="time" isEditing={isEditing} register={register} />
                  <DetailRow label="Doors" value={timeVal(event.dateDoors)} field="dateDoors" type="time" isEditing={isEditing} register={register} />
                  <DetailRow label="Curfew" value={timeVal(event.dateCurfew)} field="dateCurfew" type="time" isEditing={isEditing} register={register} />
                </div>
              </Section>

              {/* Money */}
              <Section title="Money">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <DetailRow label="Price" value={price != null ? `${price}${sym}` : null} field="datePrice" type="number" isEditing={isEditing} register={register} />
                  <DetailRow
                    label="Currency"
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
                  {!isEditing && paid > 0 && <DetailRow label="Paid" value={`${paid}${sym}`} readOnly />}
                  {!isEditing && balance > 0.01 && <DetailRow label="Balance" value={`${balance.toFixed(2)}${sym}`} readOnly />}
                </div>
              </Section>

              {/* Contacts */}
              <Section title="Contacts">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <DetailRow label="Organizer" value={event.dateContactOrganizer} field="dateContactOrganizer" isEditing={isEditing} register={register} />
                  <DetailRow label="Tech" value={event.dateContactTech} field="dateContactTech" isEditing={isEditing} register={register} />
                </div>
              </Section>

              {/* Status & Category */}
              <Section title="Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <DetailRow label="Category" value={event.dateCategory} field="dateCategory" isEditing={isEditing} register={register} />
                  <DetailRow
                    label="Status"
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
              <Section title="Notes">
                {isEditing ? (
                  <textarea
                    {...register('dateDescription')}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 sm:p-4 text-sm sm:text-base text-slate-300 font-medium min-h-[100px] outline-none focus:border-orange-500/50 resize-y"
                    placeholder="Add notes..."
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
              onClick={() => onDelete(event.dateID)}
              className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-500 border border-red-800/50 rounded hover:bg-red-900/30 transition-colors"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-orange-500 text-white rounded hover:bg-orange-400 transition-colors"
            >
              Save
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
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
      {readOnly ? (
        <span className="text-sm sm:text-base font-bold text-slate-200 truncate border border-slate-700 rounded px-3 py-2 bg-slate-950/50">{showVal ?? '—'}</span>
      ) : isEditing && register ? (
        options ? (
          <select
            {...register(field, { valueAsNumber })}
            className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm sm:text-base text-white font-bold outline-none focus:border-orange-500/50"
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
            className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm sm:text-base text-white font-bold outline-none focus:border-orange-500/50"
          />
        )
      ) : (
        <span className="text-sm sm:text-base font-bold text-slate-200 truncate border border-slate-700 rounded px-3 py-2 bg-slate-950/50">{showVal ?? '—'}</span>
      )}
    </div>
  );
}

export default DateDetailView;
