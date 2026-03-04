import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import FormInput from '../components/FormInput';

// A curated palette of vibrant colors that look great on a dark background
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#0ea5e9', '#3b82f6', '#a855f7', '#ec4899'
];

const CreateBandView = () => {
    const [apiError, setApiError] = useState(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    // 1. Initialize react-hook-form
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            bandName: '',
            bandColor: PRESET_COLORS[1] // Default to the orange
        },
        mode: 'onChange'
    });

    // 2. The streamlined submit handler
    const onSubmit = async (data) => {
        setApiError(null);
        try {
            const response = await axios.post('/api/bands', data);
            if (response.status === 201) {
                navigate('/');
            } else {
                setApiError(t('createBand.failedCreate'));
            }
        } catch (err) {
            setApiError(err.response?.data?.message || t('createBand.unexpectedError'));
        }
    };

    return (
        <div className="w-[90%] max-w-[600px] mx-auto py-12">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-8">{t('createBand.createNewBand')}</h1>
            
            <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-900/50 border border-slate-800 p-8 rounded-lg shadow-xl">
                
                <div className="mb-8">
                    <FormInput 
                        label={t('createBand.bandName')}
                        id="bandName"
                        placeholder={t('createBand.bandNamePlaceholder')}
                        error={errors.bandName}
                        {...register('bandName', { 
                            required: t('createBand.bandNameRequired'),
                            minLength: { value: 2, message: t('createBand.nameMinLength') }
                        })}
                    />
                </div>

                <div className="mb-10">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">
                        {t('createBand.identityColor')}
                    </label>
                    
                    <Controller
                        name="bandColor"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                {PRESET_COLORS.map((color) => {
                                    const isSelected = value === color;
                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => onChange(color)}
                                            className="w-10 h-10 rounded-full transition-all duration-200"
                                            style={{
                                                backgroundColor: color,
                                                transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                                outline: isSelected ? '2px solid white' : 'none',
                                                outlineOffset: '2px',
                                                boxShadow: isSelected ? `0 0 15px ${color}` : 'none',
                                                opacity: isSelected ? 1 : 0.6
                                            }}
                                            aria-label={`Select color ${color}`}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    />
                    {/* Optional: You can still keep a hidden input here if needed for native form submission, 
                        but react-hook-form handles the state for us via Controller. */}
                </div>

                {/* API Error Message */}
                {apiError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-6 text-sm">
                        {apiError}
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-600 text-white py-4 rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed shadow-lg"
                >
                    {isSubmitting ? t('createBand.creating') : t('createBand.createBandProfile')}
                </button>

            </form>
        </div>
    );
};

export default CreateBandView;