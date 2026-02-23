import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateBandView = () => {
    const [bandName, setBandName] = useState('');
    const [bandColor, setBandColor] = useState('#FFFFFF'); // Default to white
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (!bandName.trim()) {
            setError('Band name is required.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await axios.post('/api/bands', { 
                bandName: bandName,
                bandColor: bandColor 
            });

            if (response.status === 201) {
                // On success, redirect to the home page
                navigate('/');
            } else {
                setError('Failed to create band. Please try again.');
            }

        } catch (err) {
            setError(err.response?.data?.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-[90%] max-w-[600px] mx-auto py-12">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-8">Create New Band</h1>
            <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 p-8 rounded-lg shadow-xl">
                
                {/* Band Name Input */}
                <div className="mb-6">
                    <label htmlFor="bandName" className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Band Name</label>
                    <input 
                        id="bandName"
                        type="text"
                        value={bandName}
                        onChange={(e) => setBandName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white p-3 text-lg focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="e.g., The Cosmic Keys"
                        required
                    />
                </div>

                {/* Band Color Input */}
                <div className="mb-8">
                    <label htmlFor="bandColor" className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Color Tag</label>
                    <div className="relative">
                        <input 
                            id="bandColor"
                            type="color"
                            value={bandColor}
                            onChange={(e) => setBandColor(e.target.value)}
                            className="w-full h-12 p-1 bg-slate-950 border border-slate-700 cursor-pointer"
                        />
                         <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                            {bandColor.toUpperCase()}
                        </div>
                    </div>
                   
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-6 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-600 text-white py-4 rounded-md text-sm font-black uppercase tracking-widest hover:bg-orange-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Creating...' : 'Create Band'}
                </button>

            </form>
        </div>
    );
};

export default CreateBandView;
