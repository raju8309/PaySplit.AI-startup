import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  signup: (name: string, email: string, password: string) => api.post('/api/auth/signup', { name, email, password }),
  getProfile: () => api.get('/api/auth/profile'),
};

export const cardsAPI = {
  getCards: () => api.get('/api/cards'),
  addCard: (data: any) => api.post('/api/cards', data),
};

export const paymentsAPI = {
  splitPayment: (data: any) => api.post('/api/payments/split', data),
  getTransactions: () => api.get('/api/payments/transactions'),
};

export default api;