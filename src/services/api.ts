import axios from 'axios';

const API_URL = 'http://localhost:3000/api';


const api = axios.create({
    baseURL: API_URL,
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

export const auth = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    google: (data: any) => api.post('/auth/google', data),
    getProfile: () => api.get('/auth/me'),
    updateProfile: (data: any) => api.put('/auth/profile', data),
};

export const dashboard = {
    getStats: () => api.get('/dashboard/stats'),
    getAchievements: () => api.get('/dashboard/achievements'),
    getProjects: () => api.get('/dashboard/projects'),
};

export const upload = {
    uploadFile: (file: File, onProgress?: (progress: number) => void) => {
        const formData = new FormData();
        formData.append('file', file);

        return api.post('/upload/single', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });
    },
    uploadMultiple: (files: File[], onProgress?: (progress: number) => void) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        return api.post('/upload/multiple', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });
    },
    deleteFile: (filename: string) => api.delete(`/upload/${filename}`),
};

export const projects = {
    getAll: () => api.get('/projects'),
    getOne: (id: string) => api.get(`/projects/${id}`),
    create: (data: any) => api.post('/projects', data),
    update: (id: string, data: any) => api.put(`/projects/${id}`, data),
    delete: (id: string) => api.delete(`/projects/${id}`),
};

export const gallery = {
    getPublicEvents: () => api.get('/gallery/public'),
    getUserEvents: () => api.get('/gallery/my-events'),
    createEvent: (data: any) => api.post('/gallery/events', data),
    addMedia: (data: any) => api.post('/gallery/media', data),
    getEvent: (id: string) => api.get(`/gallery/events/${id}`),
    getEventMedia: (id: string) => api.get(`/gallery/events/${id}/media`),
    deleteEvent: (id: string) => api.delete(`/gallery/events/${id}`),
    deleteMedia: (id: string) => api.delete(`/gallery/media/${id}`),
};

export default api;
