import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const isDevelopment = import.meta.env.DEV;

const api = axios.create({
  baseURL: apiUrl || (isDevelopment ? 'http://localhost:5000/api' : '/api'),
  timeout: 12000,
  headers: { Accept: 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Telegram sessions use a server-only HttpOnly cookie. Do not copy their secret into JS headers.
  const token = localStorage.getItem('am_token');
  const authType = localStorage.getItem('am_auth_type');
  if (token && authType !== 'telegram') config.headers.Authorization = `Bearer ${token}`;
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
