import axios from 'axios';

type Role = 'student' | 'parent' | 'teacher' | 'admin';

export type User = {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    avatarUrl?: string;
    schoolId?: number;
};

export type Profile = {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
};

type AuthRegisterRequest = {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    schoolId?: number;
};

type AuthLoginRequest = {
    email: string;
    password: string;
};

export type ProjectStatus = 'pending' | 'ongoing' | 'complete';

export type Project = {
    id: string;
    title: string;
    description: string | null;
    status: ProjectStatus;
    start_date: string;
    end_date: string | null;
    collaborators: string[] | null;
    skills_tracked?: Record<string, number>;
    thumbnail_url?: string | null;
    student_name?: string | null;
};

type ProjectCreateRequest = {
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    status?: ProjectStatus;
    collaborators?: string[];
};

type ProjectUpdateRequest = Partial<ProjectCreateRequest>;

type ProjectMediaRequest = {
    title?: string;
    description?: string;
    media_type: 'image' | 'video' | 'pdf';
    media_url: string;
};

type ProjectFeedbackRequest = {
    text?: string;
    comment?: string;
    rating?: number;
};

export type Achievement = {
    id: string;
    title: string;
    description: string | null;
    date_earned: string;
    certificate_url?: string | null;
    verified?: boolean;
};

type GalleryEventCreateRequest = {
    title: string;
    description?: string;
    event_date: string;
    type?: 'personal' | 'school';
    location?: string;
    created_by?: string;
};

type GalleryMediaCreateRequest = {
    event_id: number | string;
    title?: string;
    description?: string;
    media_type: 'image' | 'video';
    media_url: string;
};

type PersonalGalleryItemCreate = {
    title?: string;
    description?: string;
    mediaType: 'image' | 'video';
    mediaUrl: string;
    thumbnailUrl?: string | null;
    visibility?: 'private' | 'public' | 'parents';
};

type SchoolEventCreateRequest = {
    title: string;
    description?: string;
    eventDate: string;
    location?: string;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';


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

api.interceptors.response.use((response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        return { ...response, data: (body as any).data };
    }
    return response;
}, (error) => {
    return Promise.reject(error);
});

export const auth = {
    register: (data: AuthRegisterRequest) => api.post('/auth/register', data),
    login: (data: AuthLoginRequest) => api.post('/auth/login', data),
    google: (data: Record<string, unknown>) => api.post('/auth/google', data),
    getProfile: () => api.get('/auth/me'),
    updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
};

export const dashboard = {
    getStats: () => api.get('/dashboard/stats'),
    getAchievements: () => api.get<Achievement[]>('/dashboard/achievements'),
    getProjects: () => api.get<Project[]>('/dashboard/projects'),
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
    getAll: (pending?: boolean) => api.get<{ data: Project[] }>(`/projects${pending ? '?pending=true' : ''}`),
    getOne: (id: string) => api.get<{ data: Project }>(`/projects/${id}`),
    create: (data: ProjectCreateRequest) => api.post('/projects', data),
    update: (id: string, data: ProjectUpdateRequest) => api.put(`/projects/${id}`, data),
    delete: (id: string) => api.delete(`/projects/${id}`),
    addMedia: (id: string, data: ProjectMediaRequest) => api.post(`/projects/${id}/media`, data),
    verify: (id: string) => api.post(`/projects/${id}/verify`),
    addFeedback: (id: string, data: ProjectFeedbackRequest) => api.post(`/projects/${id}/feedback`, data),
};

export const gallery = {
    getPublicEvents: () => api.get('/gallery/public'),
    getUserEvents: () => api.get('/gallery/my-events'),
    createEvent: (data: GalleryEventCreateRequest) => api.post('/gallery/events', data),
    addMedia: (data: GalleryMediaCreateRequest) => api.post('/gallery/media', data),
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
    chatStream: async (message: string, onToken: (text: string) => void, onMatches?: (matches: unknown[]) => void, onRecos?: (recos: unknown) => void) => {
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
                        continue;
                    }
                }
            }
        }
    },
    chat: (messages: unknown[], personality: string) => api.post('/ai/chat/legacy', { messages, personality }),
};

export const achievements = {
    getAll: (pending?: boolean) => api.get<{ data: Achievement[] }>(`/achievements${pending ? '?pending=true' : ''}`),
    getOne: (id: string) => api.get<{ data: Achievement }>(`/achievements/${id}`),
    create: (data: { title: string; description?: string; date_earned?: string; certificate_url?: string }) =>
        api.post('/achievements', data),
    update: (id: string, data: { title?: string; description?: string; date_earned?: string; certificate_url?: string }) =>
        api.put(`/achievements/${id}`, data),
    delete: (id: string) => api.delete(`/achievements/${id}`),
    verify: (id: string) => api.post(`/achievements/verify/${id}`),
};



export const profile = {
    getMe: () => api.get('/profile/me'),
    updateMe: (data: Record<string, unknown>) => api.put('/profile/me', data),
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
    createItem: (data: PersonalGalleryItemCreate) => api.post('/personal-gallery', data),
    getMyItems: (page = 1, limit = 20) => api.get(`/personal-gallery?page=${page}&limit=${limit}`),
    updateItem: (id: number, data: Partial<PersonalGalleryItemCreate>) => api.put(`/personal-gallery/${id}`, data),
    deleteItem: (id: number) => api.delete(`/personal-gallery/${id}`),
    getStudentItems: (studentId: number, page = 1, limit = 20) => api.get(`/personal-gallery/student/${studentId}?page=${page}&limit=${limit}`),
};

export const schoolGallery = {
    getAll: (schoolId?: number, page = 1, limit = 12) =>
        api.get(`/school-gallery${schoolId ? `?schoolId=${schoolId}` : ''}${schoolId ? `&` : `?`}page=${page}&limit=${limit}`),
    getOne: (id: string) => api.get(`/school-gallery/${id}`),
    create: (data: SchoolEventCreateRequest) => api.post('/school-gallery', data),
    addMedia: (id: string, data: GalleryMediaCreateRequest) => api.post(`/school-gallery/${id}/media`, data),
    delete: (id: string) => api.delete(`/school-gallery/${id}`),
};

export default api;
