import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('budo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      sessionStorage.removeItem('budo_token');
      sessionStorage.removeItem('budo_user');
    }
    return Promise.reject(err);
  }
);
