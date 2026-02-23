import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFromApi, postToApi } from '../services/dataService'; // Use your helpers

function EditDateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch data using the correct singular endpoint: /api/date/:id
  useEffect(() => {
    fetchFromApi(`date/${id}`)
      .then(data => {
        setFormData(data);
        setLoading(false);
      })
      .catch(err => console.error("Fetch error:", err));
  }, [id]);

  // 2. Handle Update using the correct endpoint: /api/update-date/:id
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Your backend expects a POST to /api/update-date/:id
      const response = await postToApi(`update-date/${id}`, formData);
      if (response.success) {
        navigate(`/date/${id}`);
      }
    } catch (err) {
      console.error("Update failed", err);
      alert("Save failed: " + err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading || !formData) {
    return <div className="p-20 text-center font-black uppercase text-slate-700">Loading Editor...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 custom-scrollbar h-screen">
      <div className="max-w-4xl mx-auto py-6">
        <h3 className="text-2xl font-black uppercase tracking-widest text-slate-200 mb-6">
          Edit Event Details
        </h3>
        
        <form onSubmit={handleUpdate} className="bg-slate-900/50 border border-slate-800 p-6 rounded-md shadow-xl flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Venue</label>
              <input 
                name="dateVenue"
                value={formData.dateVenue || ''} 
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 text-white p-3 text-sm focus:border-orange-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">City</label>
              <input 
                name="dateCity"
                value={formData.dateCity || ''} 
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 text-white p-3 text-sm focus:border-orange-500 outline-none" 
              />
            </div>
          </div>

          {/* Add other fields here following the same pattern */}

          <div className="flex gap-4">
            <button 
              type="submit" 
              className="flex-1 bg-orange-600 text-white py-4 rounded-sm text-[12px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg"
            >
              Save Changes
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="px-8 bg-slate-800 text-slate-400 py-4 rounded-sm text-[12px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditDateView;