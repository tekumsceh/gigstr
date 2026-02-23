import axios from 'axios';

// The proxy in vite.config.js will handle redirecting this to the backend.
// All API requests can now be relative.
const API_BASE = '/api'; 

/**
 * Universal GET fetcher
 */
export const fetchFromApi = async (endpoint, params = {}) => {
  try {
    const sanitized = endpoint.replace(/^\/?(api\/)?/, '');
    const url = `${API_BASE}/${sanitized}`;

    const response = await axios.get(url, {
      params,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error.response?.data || error.message);
    // Return a default value or rethrow based on your app's needs
    return []; 
  }
};

/**
 * Universal POST fetcher
 */
export const postToApi = async (endpoint, payload) => {
  try {
    const sanitized = endpoint.replace(/^\/?(api\/)?/, '');
    const url = `${API_BASE}/${sanitized}`;

    const response = await axios.post(url, payload, {
      withCredentials: true, 
    });
    return response.data; 
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    console.error(`POST error for ${endpoint}:`, errorMsg);
    // Rethrow a more informative error to be caught by the UI
    throw new Error(errorMsg);
  }
};

/**
 * Universal DELETE fetcher
 */
export const deleteFromApi = async (endpoint) => {
  try {
    const sanitized = endpoint.replace(/^\/?(api\/)?/, '');
    const url = `${API_BASE}/${sanitized}`;

    const response = await axios.delete(url, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    console.error(`DELETE error for ${endpoint}:`, errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * SMART FETCHER - No changes needed here, as it uses the universal fetcher
 */
export const fetchTableData = async (tableName, columns = [], filters = {}) => {
  let endpoint = `/${tableName}`;
  
  if (tableName === 'status') endpoint = '/api/statuses';
  if (tableName === 'bands') endpoint = '/api/my-bands'; // Change 'type' to 'bands'
  if (tableName === 'dates') endpoint = '/api/dates';

  const params = { ...filters };
  if (columns.length > 0) params.cols = columns.join(',');

  return await fetchFromApi(endpoint, params);
};
