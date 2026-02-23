import axios from 'axios';

// The proxy in vite.config.js will handle redirecting this to the backend
const API_URL = '/api/bands';

/**
 * Sends a request to the backend to create a new band.
 * @param {string} bandName - The name of the new band.
 * @returns {Promise<object>} - The response data from the server.
 */
const createBand = async (bandName) => {
    try {
        // The second argument to axios.post is the request body.
        // Axios will automatically send cookies for the logged-in user.
        const response = await axios.post(API_URL, { bandName });
        return response.data;
    } catch (error) {
        // Axios wraps HTTP errors in error.response.
        // We rethrow the error so the calling component can handle it.
        console.error("Error in createBand service:", error.response?.data?.message || error.message);
        throw error.response?.data || { message: "An unknown error occurred while creating the band." };
    }
};

export const bandService = {
    createBand,
};