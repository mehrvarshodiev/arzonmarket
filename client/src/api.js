import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const isDevelopment = import.meta.env.DEV;

const api = axios.create({
  baseURL: apiUrl || (isDevelopment ? 'http://localhost:5000/api' : undefined),
  timeout: 8000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  if (import.meta.env.PROD && !apiUrl) {
    const error = new Error('API_NOT_CONFIGURED');
    error.code = 'API_NOT_CONFIGURED';
    return Promise.reject(error);
  }

  const token = localStorage.getItem('am_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => {
  const contentType = response.headers?.['content-type'] || '';
  if (!contentType.includes('application/json')) {
    const error = new Error('API_INVALID_RESPONSE');
    error.code = 'API_INVALID_RESPONSE';
    return Promise.reject(error);
  }
  return response;
});

export default api;
