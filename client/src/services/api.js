import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  timeout: 10000, // 10s request timeout
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

// Automatic retry for idempotent GET requests on network drop/timeout (max 2 retries)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;

    if (err.response && err.response.status === 401) {
      sessionStorage.removeItem('budo_token');
      sessionStorage.removeItem('budo_user');
      return Promise.reject(err);
    }

    // Only retry GET requests or requests explicitly configured with retry
    if (config && config.method === 'get' && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = config._retryCount * 1200;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(err);
  }
);
