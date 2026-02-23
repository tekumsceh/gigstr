import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function EditDateView() {
  const { id } = useParams();
  const navigate = useNavigate();
const [formData, setFormData] = useState(null); // EditDateView uses this
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`http://localhost:5000/api/dates/${id}`)
    .then(res => res.json())
    .then(data => {
      // 2. Map the incoming data to the expected state name
      setFormData(data); 
      setLoading(false);
    })
    .catch(err => console.error("Fetch error:", err));
}, [id]);

// 3. Safety check to prevent "undefined" errors before data arrives
if (loading || !formData) return <div>Loading...</div>;

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/dates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) navigate(`/date/${id}`);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  if (loading) return <div className="p-20 text-center font-black uppercase text-slate-700">Loading Editor...</div>;

  return (
    <div className="max-w-5xl mx-auto py-12 px-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Edit Gig</h1>
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-widest transition-colors">Cancel Changes</button>
      </div>
      
      <form onSubmit={handleUpdate} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em] ml-2">Venue Name</label>
            <input 
              type="text" 
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-4xl font-black text-white italic uppercase tracking-tighter outline-none focus:border-orange-600 transition-all placeholder:text-slate-800"
              placeholder="Venue"
              value={formData.dateVenue || ''}
              onChange={(e) => setFormData({...formData, dateVenue: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em] ml-2">Start Time</label>
            <input 
              type="time" 
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-4xl font-black text-white italic uppercase tracking-tighter outline-none focus:border-orange-600 transition-all [color-scheme:dark]"
              value={formData.dateStart || ''}
              onChange={(e) => setFormData({...formData, dateStart: e.target.value})}
            />
          </div>
        </div>

        {/* SECONDARY SECTION: Logistics & Finance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/50 p-10 rounded-[3rem] border border-slate-800">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">City</label>
            <input 
              type="text" 
              className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold outline-none focus:border-slate-600"
              value={formData.dateCity || ''}
              onChange={(e) => setFormData({...formData, dateCity: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Date</label>
            <input 
              type="date" 
              className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold outline-none focus:border-slate-600 [color-scheme:dark]"
              value={formData.dateDate ? formData.dateDate.split('T')[0] : ''}
              onChange={(e) => setFormData({...formData, dateDate: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Price (€)</label>
            <input 
              type="number" 
              className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold outline-none focus:border-slate-600"
              value={formData.datePrice || ''}
              onChange={(e) => setFormData({...formData, datePrice: e.target.value})}
            />
          </div>
        </div>

        <button type="submit" className="w-full py-8 bg-orange-600 hover:bg-orange-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]">
          Confirm Update
        </button>
      </form>
    </div>
  );
}

export default EditDateView;