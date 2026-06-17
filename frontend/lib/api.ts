import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ───────────────────────────────────────────────
export const register = (data: { username: string; email: string; password: string }) =>
  api.post('/api/register/', data);

export const login = (data: { username: string; password: string }) =>
  api.post('/api/login/', data);

export const logout = () => api.post('/api/logout/');

// ─── Rooms ──────────────────────────────────────────────
export const getRooms = (params?: { resource?: string; capacity?: number; availability?: string }) =>
  api.get('/api/rooms/', { params });

export const getRoom = (id: number) => api.get(`/api/rooms/${id}/`);

export const getRoomAvailability = (roomId: number, date: string) =>
  api.get(`/api/rooms/${roomId}/availability/`, { params: { date } });

// ─── Bookings ────────────────────────────────────────────
export const getMyBookings = (params?: { status?: string }) =>
  api.get('/api/bookings/', { params });

export const createBooking = (data: {
  room: number;
  start_time: string;
  end_time: string;
}) => api.post('/api/bookings/', data);

export const cancelBooking = (id: number) =>
  api.patch(`/api/bookings/${id}/`, { status: 'Cancelled' });

export const confirmBooking = (id: number) =>
  api.patch(`/api/bookings/${id}/`, { status: 'Confirmed' });

// ─── Resources ───────────────────────────────────────────
export const getResources = () => api.get('/api/resources/');

export default api;
