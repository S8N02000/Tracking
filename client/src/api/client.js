import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const adminSecret = localStorage.getItem('admin_secret');
  if (adminSecret) {
    config.headers.Authorization = `Bearer ${adminSecret}`;
  }
  return config;
});

export default api;
