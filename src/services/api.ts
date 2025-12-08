import axios from 'axios';

// Docker backend runs on port 3001 (mapped from internal 3000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';


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
    getAll: (pending?: boolean) => api.get(`/projects${pending ? '?pending=true' : ''}`),
    getOne: (id: string) => api.get(`/projects/${id}`),
    create: (data: any) => api.post('/projects', data),
    update: (id: string, data: any) => api.put(`/projects/${id}`, data),
    delete: (id: string) => api.delete(`/projects/${id}`),
    addMedia: (id: string, data: any) => api.post(`/projects/${id}/media`, data),
    verify: (id: string) => api.post(`/projects/${id}/verify`),
    addFeedback: (id: string, data: any) => api.post(`/projects/${id}/feedback`, data),
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

export const scholarship = {
    getAll: (params?: { limit?: number; offset?: number }) =>
        api.get('/scholarship', { params }),
    getOne: (id: string) => api.get(`/scholarship/${id}`),
    match: (limit?: number) => api.get('/scholarship/match', { params: { limit } }),
};

export const recommendations = {
    generate: () => api.get('/recommendations/generate'),
};

export const ai = {
    // Streaming chat - returns EventSource URL info
    chatStream: async (message: string, onToken: (text: string) => void, onMatches?: (matches: any[]) => void, onRecos?: (recos: any) => void) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error('Chat request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            let currentEvent = '';
            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    currentEvent = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (currentEvent === 'token' && parsed.text) {
                            onToken(parsed.text);
                        } else if (currentEvent === 'matches' && onMatches) {
                            onMatches(parsed);
                        } else if (currentEvent === 'recommendations' && onRecos) {
                            onRecos(parsed);
                        } else if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        // Skip parse errors
                    }
                }
            }
        }
    },
    // Legacy non-streaming
    chat: (messages: any[], personality: string) => api.post('/ai/chat/legacy', { messages, personality }),
};

export const achievements = {
    getAll: (pending?: boolean) => api.get(`/achievements${pending ? '?pending=true' : ''}`),
    getOne: (id: string) => api.get(`/achievements/${id}`),
    create: (data: { title: string; description?: string; date_earned?: string; certificate_url?: string }) =>
        api.post('/achievements', data),
    update: (id: string, data: { title?: string; description?: string; date_earned?: string; certificate_url?: string }) =>
        api.put(`/achievements/${id}`, data),
    delete: (id: string) => api.delete(`/achievements/${id}`),
    verify: (id: string) => api.post(`/achievements/verify/${id}`),
};



export const profile = {
    getMe: () => api.get('/profile/me'),
    updateMe: (data: any) => api.put('/profile/me', data),
    getPublicProfile: (id: string) => api.get(`/profile/${id}`),
    linkParent: (data: { parentEmail: string; relationship?: string }) => api.post('/profile/link-parent', data),
    getChildren: () => api.get('/profile/children'),
};

export const settings = {
    get: (key: string) => api.get(`/settings/${key}`),
    update: (key: string, value: string | null) => api.put(`/settings/${key}`, { value }),
    getAll: () => api.get('/settings'),
};

export const personalGallery = {
    createItem: (data: any) => api.post('/personal-gallery', data),
    getMyItems: (page = 1, limit = 20) => api.get(`/personal-gallery?page=${page}&limit=${limit}`),
    updateItem: (id: number, data: any) => api.put(`/personal-gallery/${id}`, data),
    deleteItem: (id: number) => api.delete(`/personal-gallery/${id}`),
    getStudentItems: (studentId: number, page = 1, limit = 20) => api.get(`/personal-gallery/student/${studentId}?page=${page}&limit=${limit}`),
};

export const schoolGallery = {
    getAll: (schoolId?: number) => api.get(`/school-gallery${schoolId ? `?schoolId=${schoolId}` : ''}`),
    getOne: (id: string) => api.get(`/school-gallery/${id}`),
    create: (data: any) => api.post('/school-gallery', data),
    addMedia: (id: string, data: any) => api.post(`/school-gallery/${id}/media`, data),
    delete: (id: string) => api.delete(`/school-gallery/${id}`),
};

export default api;
