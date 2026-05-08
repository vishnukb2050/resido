import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const membersApi = {
    list: () => api.get('/resident/members'),
    create: (data: any) => api.post('/resident/members', data),
    updateStatus: (id: string, isActive: boolean) => api.patch(`/resident/members/${id}/status`, { isActive }),
};

export default api;
