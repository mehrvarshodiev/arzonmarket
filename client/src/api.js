import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const isDevelopment = import.meta.env.DEV;

const api = axios.create({
  // In production Vercel serves /api/* as serverless functions.
  // VITE_API_URL can override this when an external API is intentionally used.
  baseURL: apiUrl || (isDevelopment ? 'http://localhost:5000/api' : '/api'),
  timeout: 12000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
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
