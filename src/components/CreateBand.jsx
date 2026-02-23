import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { bandService } from '../services/bandService'; // Import our new service

function CreateBand() {
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }, // Use react-hook-form state
    } = useForm();
    
    const [serverError, setServerError] = useState(''); // To display errors from the backend

    const onSubmit = async (data) => {
        try {
            setServerError(''); // Clear previous errors
            const response = await bandService.createBand(data.bandName);
            console.log("Band created successfully:", response);
            // Redirect to a future page for the band, for now, we'll go home
            // In Phase 2, we will create a dedicated band page and redirect there.
            navigate('/'); // TODO: Redirect to /bands/:bandID
        } catch (error) {
            console.error("Failed to create band:", error);
            setServerError(error.message || "An unexpected error occurred.");
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Name Your Band</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-4">
                    <label htmlFor="bandName" className="block text-sm font-medium text-gray-700">Band Name</label>
                    <input
                        id="bandName"
                        type="text"
                        {...register('bandName', { required: 'Band name is required' })}
                        className={`mt-1 block w-full px-3 py-2 border ${errors.bandName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                    {errors.bandName && <p className="mt-2 text-sm text-red-600">{errors.bandName.message}</p>}
                </div>

                {/* We can remove the color input for now unless you want it */}
                
                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'CREATE BAND'}
                    </button>
                </div>

                {serverError && <p className="mt-4 text-center text-sm text-red-600">{serverError}</p>}
            </form>
        </div>
    );
}

export default CreateBand;
