import axios from 'axios';

type Role = 'student' | 'parent' | 'teacher' | 'admin' | 'school_admin';

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
    role: Role;
    schoolId?: number;
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
    fileName?: string;
    fileSize?: number;
    mediaType: 'image' | 'video' | 'pdf' | 'document';
    mediaUrl: string;
    thumbnailUrl?: string;
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

const API_URL = import.meta.env.VITE_API_URL || '/api';


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
}, async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                const response = await api.post('/auth/refresh', { refreshToken });
                const { token: newToken, refreshToken: newRefreshToken } = response.data;

                // Store new tokens
                localStorage.setItem('token', newToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                // Update original request with new token
                originalRequest.headers.Authorization = 'Bearer ' + newToken;

                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/auth';
                return Promise.reject(refreshError);
            }
        }
    }

    // Clear tokens on other auth errors
    if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

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
    deleteFile: (filename: string) => api.delete('/upload/' + filename),
};

export const projects = {
    getAll: (params?: { pending?: boolean; studentId?: string }) => {
        const query = new URLSearchParams();
        if (params?.pending) query.append('pending', 'true');
        if (params?.studentId) query.append('studentId', params.studentId);
        return api.get<{ data: Project[] }>('/projects?' + query.toString());
    },
    getOne: (id: string) => api.get<{ data: Project }>('/projects/' + id),
    create: (data: ProjectCreateRequest) => api.post('/projects', data),
    update: (id: string, data: ProjectUpdateRequest) => api.put('/projects/' + id, data),
    delete: (id: string) => api.delete('/projects/' + id),
    addMedia: (id: string, data: ProjectMediaRequest) => api.post('/projects/' + id + '/media', data),
    verify: (id: string) => api.post('/projects/' + id + '/verify'),
    addFeedback: (id: string, data: ProjectFeedbackRequest) => api.post('/projects/' + id + '/feedback', data),
};

export const gallery = {
    getPublicEvents: () => api.get('/gallery/public'),
    getUserEvents: () => api.get('/gallery/my-events'),
    createEvent: (data: GalleryEventCreateRequest) => api.post('/gallery/events', data),
    addMedia: (data: GalleryMediaCreateRequest) => api.post('/gallery/media', data),
    getEvent: (id: string) => api.get('/gallery/events/' + id),
    getEventMedia: (id: string) => api.get('/gallery/events/' + id + '/media'),
    deleteEvent: (id: string) => api.delete('/gallery/events/' + id),
    deleteMedia: (id: string) => api.delete('/gallery/media/' + id),
};

export const scholarship = {
    getAll: (params?: { limit?: number; offset?: number }) =>
        api.get('/scholarship', { params }),
    getOne: (id: string) => api.get('/scholarship/' + id),
    match: (limit?: number) => api.get('/scholarship/match', { params: { limit } }),
};

export const recommendations = {
    generate: () => api.get('/recommendations/generate'),
};

export type StudentAnalytics = {
    projectCompletionRate: number;
    verifiedAchievementCount: number;
    achievementCount: number;
    aiUsage: { day: string; messages: number }[];
    xp: {
        level: number;
        currentXp: number;
        nextLevelXp: number;
        tier: 'basic' | 'plus' | 'pro';
    };
};

export const analytics = {
    getStudentStats: (studentId: string) => api.get<{ data: StudentAnalytics }>('/analytics/student/' + studentId),
};

export const ai = {
    chatStream: async (message: string, onToken: (text: string) => void, onMatches?: (matches: unknown[]) => void, onRecos?: (recos: unknown) => void) => {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL + '/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
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
    getAll: (params?: { pending?: boolean; studentId?: string }) => {
        const query = new URLSearchParams();
        if (params?.pending) query.append('pending', 'true');
        if (params?.studentId) query.append('studentId', params.studentId);
        return api.get<{ data: Achievement[] }>('/achievements?' + query.toString());
    },
    getOne: (id: string) => api.get<{ data: Achievement }>('/achievements/' + id),
    create: (data: { title: string; description?: string; date_earned?: string; certificate_url?: string }) =>
        api.post('/achievements', data),
    update: (id: string, data: { title?: string; description?: string; date_earned?: string; certificate_url?: string }) =>
        api.put('/achievements/' + id, data),
    delete: (id: string) => api.delete('/achievements/' + id),
    verify: (id: string) => api.post('/achievements/verify/' + id),
};



export const profile = {
    getMe: () => api.get('/profile/me'),
    updateMe: (data: Record<string, unknown>) => api.put('/profile/me', data),
    getPublicProfile: (id: string) => api.get('/profile/' + id),
    linkParent: (data: { parentEmail: string; relationship?: string }) => api.post('/profile/link-parent', data),
    getChildren: () => api.get('/profile/children'),
};

export const settings = {
    get: (key: string) => api.get('/settings/' + key),
    update: (key: string, value: string | null) => api.put('/settings/' + key, { value }),
    getAll: () => api.get('/settings'),
};

export const personalGallery = {
    createItem: (data: PersonalGalleryItemCreate) => api.post('/personal-gallery', data),
    getMyItems: (page = 1, limit = 20) => api.get('/personal-gallery?page=' + page + '&limit=' + limit),
    updateItem: (id: number, data: Partial<PersonalGalleryItemCreate>) => api.put('/personal-gallery/' + id, data),
    deleteItem: (id: number) => api.delete('/personal-gallery/' + id),
    getStudentItems: (studentId: number, page = 1, limit = 20) => api.get('/personal-gallery/student/' + studentId + '?page=' + page + '&limit=' + limit),
};

export const schoolGallery = {
    getAll: (schoolId?: number, page = 1, limit = 12) =>
        api.get('/school-gallery' + (schoolId ? '?schoolId=' + schoolId : '') + (schoolId ? '&' : '?') + 'page=' + page + '&limit=' + limit),
    getOne: (id: string) => api.get('/school-gallery/' + id),
    create: (data: SchoolEventCreateRequest) => api.post('/school-gallery', data),
    addMedia: (id: string, data: GalleryMediaCreateRequest) => api.post('/school-gallery/' + id + '/media', data),
    delete: (id: string) => api.delete('/school-gallery/' + id),
};

export const teacher = {
    // Classes
    getClasses: () => api.get('/teacher/classes'),
    getClass: (id: string) => api.get('/teacher/class/' + id),
    getClassStudents: (id: string, params?: { search?: string; grade?: string }) => {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.grade) query.append('grade', params.grade);
        return api.get('/teacher/class/' + id + '/students?' + query.toString());
    },

    // Students
    getStudents: (params?: { search?: string; grade?: string; classId?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.grade) query.append('grade', params.grade);
        if (params?.classId) query.append('classId', params.classId);
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        return api.get('/teacher/students?' + query.toString());
    },
    getStudent: (id: string) => api.get('/teacher/student/' + id),

    // Analytics
    getAnalytics: () => api.get('/teacher/analytics/overview'),
    getClassAnalytics: (classId: string) => api.get('/teacher/analytics/class/' + classId),

    // Notifications
    getNotifications: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.unreadOnly) query.append('unreadOnly', 'true');
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        return api.get('/teacher/notifications?' + query.toString());
    },
    markNotificationRead: (id: string) => api.patch('/teacher/notifications/' + id + '/read'),
    markAllNotificationsRead: () => api.patch('/teacher/notifications/read-all'),

    // Verification
    getPendingProjects: () => api.get('/teacher/projects/pending'),
    rejectProject: (id: string, reason: string) => api.post('/teacher/project/' + id + '/reject', { reason }),
    addProjectFeedback: (id: string, data: { comment?: string; rating?: number }) =>
        api.post('/teacher/project/' + id + '/feedback', data),

    getPendingAchievements: () => api.get('/teacher/achievements/pending'),
    rejectAchievement: (id: string, reason: string) => api.post('/teacher/achievement/' + id + '/reject', { reason }),
};

export const parent = {
    getMessages: () => api.get('/parent/messages'),
    sendMessage: (receiverId: number, content: string, subject?: string) =>
        api.post('/parent/messages', { receiverId, content, subject }),
    getChildProjects: (childId: string | number) => api.get(`/parent/child/${childId}/projects`),
    postProjectComment: (projectId: number, comment: string) =>
        api.post(`/parent/projects/${projectId}/comments`, { comment }),
    getPlan: () => api.get('/parent/plan'),
};

export const parentAI = {
    chatStream: async (message: string, childId: number | null, onToken: (text: string) => void) => {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL + '/parent/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
            },
            body: JSON.stringify({ message, childId }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Chat request failed');
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

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            onToken(parsed.text);
                        } else if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
    }
};

// School Admin API
export const schoolAdmin = {
    // === SCHOOL OVERVIEW ===
    getSchoolOverview: () => api.get('/school-admin/overview'),

    // === USER MANAGEMENT ===
    // Students
    getStudents: (params?: { page?: number; limit?: number; search?: string; classId?: string; status?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.search) query.append('search', params.search);
        if (params?.classId) query.append('classId', params.classId);
        if (params?.status) query.append('status', params.status);
        return api.get('/school-admin/students?' + query.toString());
    },
    getStudent: (id: string) => api.get('/school-admin/students/' + id),
    addStudent: (data: { email: string; firstName: string; lastName: string; classId?: string }) =>
        api.post('/school-admin/students', data),
    updateStudent: (id: string, data: { firstName?: string; lastName?: string; classId?: string; level?: number }) =>
        api.put('/school-admin/students/' + id, data),
    deleteStudent: (id: string) => api.delete('/school-admin/students/' + id),
    suspendStudent: (id: string, reason: string) => api.post('/school-admin/students/' + id + '/suspend', { reason }),
    resetStudentPassword: (id: string) => api.post('/school-admin/students/' + id + '/reset-password'),
    bulkUploadStudents: (data: FormData) => api.post('/school-admin/students/bulk', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // Teachers
    getTeachers: (params?: { page?: number; limit?: number; search?: string; subjectId?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.search) query.append('search', params.search);
        if (params?.subjectId) query.append('subjectId', params.subjectId);
        return api.get('/school-admin/teachers?' + query.toString());
    },
    getTeacher: (id: string) => api.get('/school-admin/teachers/' + id),
    addTeacher: (data: { email: string; firstName: string; lastName: string; subjectIds?: number[] }) =>
        api.post('/school-admin/teachers', data),
    updateTeacher: (id: string, data: { firstName?: string; lastName?: string; subjectIds?: number[]; permissions?: string[] }) =>
        api.put('/school-admin/teachers/' + id, data),
    deleteTeacher: (id: string) => api.delete('/school-admin/teachers/' + id),
    assignTeacherToClass: (teacherId: string, classId: string) =>
        api.post('/school-admin/teachers/' + teacherId + '/assign-class', { classId }),

    // Parents
    getParents: (params?: { page?: number; limit?: number; search?: string; studentId?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.search) query.append('search', params.search);
        if (params?.studentId) query.append('studentId', params.studentId);
        return api.get('/school-admin/parents?' + query.toString());
    },
    linkParentToStudent: (parentId: string, studentId: string) =>
        api.post('/school-admin/parents/' + parentId + '/link-student', { studentId }),
    unlinkParentFromStudent: (parentId: string, studentId: string) =>
        api.delete('/school-admin/parents/' + parentId + '/unlink-student/' + studentId),
    removeParentAccess: (id: string) => api.delete('/school-admin/parents/' + id),

    // === ACADEMIC STRUCTURE ===
    // Classes
    getClasses: (params?: { academicYearId?: number; grade?: string }) => {
        const query = new URLSearchParams();
        if (params?.academicYearId) query.append('academicYearId', String(params.academicYearId));
        if (params?.grade) query.append('grade', params.grade);
        return api.get('/school-admin/classes?' + query.toString());
    },
    getClass: (id: string) => api.get('/school-admin/classes/' + id),
    createClass: (data: { name: string; grade: string; academicYearId: number; teacherId?: string }) =>
        api.post('/school-admin/classes', data),
    updateClass: (id: string, data: { name?: string; grade?: string; teacherId?: string }) =>
        api.put('/school-admin/classes/' + id, data),
    deleteClass: (id: string) => api.delete('/school-admin/classes/' + id),
    archiveClass: (id: string) => api.post('/school-admin/classes/' + id + '/archive'),
    assignStudentToClass: (studentId: string, classId: string) =>
        api.post('/school-admin/classes/' + classId + '/assign-student', { studentId }),

    // Subjects
    getSubjects: (params?: { grade?: string; academicYearId?: number }) => {
        const query = new URLSearchParams();
        if (params?.grade) query.append('grade', params.grade);
        if (params?.academicYearId) query.append('academicYearId', String(params.academicYearId));
        return api.get('/school-admin/subjects?' + query.toString());
    },
    getSubject: (id: string) => api.get('/school-admin/subjects/' + id),
    createSubject: (data: { name: string; grade: string; academicYearId: number; teacherIds?: number[] }) =>
        api.post('/school-admin/subjects', data),
    updateSubject: (id: string, data: { name?: string; teacherIds?: number[] }) =>
        api.put('/school-admin/subjects/' + id, data),
    deleteSubject: (id: string) => api.delete('/school-admin/subjects/' + id),
    assignSubjectHead: (subjectId: string, teacherId: string) =>
        api.post('/school-admin/subjects/' + subjectId + '/assign-head', { teacherId }),

    // Academic Years
    getAcademicYears: () => api.get('/school-admin/academic-years'),
    getAcademicYear: (id: string) => api.get('/school-admin/academic-years/' + id),
    createAcademicYear: (data: { name: string; startDate: string; endDate: string }) =>
        api.post('/school-admin/academic-years', data),
    updateAcademicYear: (id: string, data: { name?: string; startDate?: string; endDate?: string; isActive?: boolean }) =>
        api.put('/school-admin/academic-years/' + id, data),
    archiveAcademicYear: (id: string) => api.post('/school-admin/academic-years/' + id + '/archive'),
    promoteStudents: (fromYearId: string, toYearId: string) =>
        api.post('/school-admin/academic-years/' + fromYearId + '/promote', { toYearId }),

    // === PORTFOLIO MODERATION ===
    getAllProjects: (params?: { page?: number; limit?: number; status?: string; classId?: string; search?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.status) query.append('status', params.status);
        if (params?.classId) query.append('classId', params.classId);
        if (params?.search) query.append('search', params.search);
        return api.get('/school-admin/projects?' + query.toString());
    },
    getProject: (id: string) => api.get('/school-admin/projects/' + id),
    approveProject: (id: string) => api.post('/school-admin/projects/' + id + '/approve'),
    rejectProject: (id: string, reason: string) => api.post('/school-admin/projects/' + id + '/reject', { reason }),
    featureProject: (id: string) => api.post('/school-admin/projects/' + id + '/feature'),
    unfeatureProject: (id: string) => api.delete('/school-admin/projects/' + id + '/feature'),
    removeProjectContent: (id: string, reason: string) => api.delete('/school-admin/projects/' + id + '/content', { data: { reason } }),
    flagProject: (id: string, reason: string) => api.post('/school-admin/projects/' + id + '/flag', { reason }),

    // === ACHIEVEMENT SYSTEM ===
    getSchoolAchievements: (params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        return api.get('/school-admin/achievements?' + query.toString());
    },
    createSchoolAchievement: (data: { title: string; description?: string; criteria?: string; iconUrl?: string; points?: number }) =>
        api.post('/school-admin/achievements', data),
    updateSchoolAchievement: (id: string, data: { title?: string; description?: string; criteria?: string; iconUrl?: string; points?: number }) =>
        api.put('/school-admin/achievements/' + id, data),
    deleteSchoolAchievement: (id: string) => api.delete('/school-admin/achievements/' + id),
    grantAchievementToStudent: (achievementId: string, studentId: string) =>
        api.post('/school-admin/achievements/' + achievementId + '/grant', { studentId }),
    revokeAchievementFromStudent: (achievementId: string, studentId: string) =>
        api.delete('/school-admin/achievements/' + achievementId + '/revoke/' + studentId),

    // === AI GOVERNANCE ===
    getAIUsageStats: (params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) => {
        const query = new URLSearchParams();
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        if (params?.groupBy) query.append('groupBy', params.groupBy);
        return api.get('/school-admin/ai-usage?' + query.toString());
    },
    getTopAIUsers: (limit?: number) => api.get('/school-admin/ai-usage/top-users' + (limit ? '?limit=' + limit : '')),
    getAIUsageByFeature: () => api.get('/school-admin/ai-usage/by-feature'),
    getAIUsageLogs: (params?: { userId?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.userId) query.append('userId', params.userId);
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        return api.get('/school-admin/ai-usage/logs?' + query.toString());
    },
    disableAIForUser: (userId: string) => api.post('/school-admin/ai-access/disable', { userId }),
    enableAIForUser: (userId: string) => api.post('/school-admin/ai-access/enable', { userId }),
    setAIQuotaForUser: (userId: string, quota: number) => api.post('/school-admin/ai-access/quota', { userId, quota }),
    setAIQuotaForLevel: (level: number, quota: number) => api.post('/school-admin/ai-access/level-quota', { level, quota }),

    // === ANALYTICS & REPORTING ===
    getAnalytics: (type: string, params?: { startDate?: string; endDate?: string }) => {
        const query = new URLSearchParams();
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        return api.get('/school-admin/analytics/' + type + '?' + query.toString());
    },
    exportReport: (type: string, format: 'csv' | 'pdf', params?: { startDate?: string; endDate?: string }) => {
        const query = new URLSearchParams({ format });
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        return api.get('/school-admin/reports/' + type + '?' + query.toString(), { responseType: 'blob' as any });
    },

    // === SCHOOL SETTINGS ===
    getSchoolSettings: () => api.get('/school-admin/settings'),
    updateSchoolSettings: (data: {
        schoolName?: string;
        logoUrl?: string;
        themeColor?: string;
        academicCalendar?: string;
        parentAccessEnabled?: boolean;
        aiFeaturesEnabled?: boolean;
        studentLevelRules?: string;
    }) => api.put('/school-admin/settings', data),

    // === NOTIFICATIONS ===
    getNotifications: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.unreadOnly) query.append('unreadOnly', 'true');
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        return api.get('/school-admin/notifications?' + query.toString());
    },
    markNotificationRead: (id: string) => api.patch('/school-admin/notifications/' + id + '/read'),
    markAllNotificationsRead: () => api.patch('/school-admin/notifications/read-all'),
    sendAnnouncement: (data: { title: string; message: string; targetRoles?: string[]; classIds?: string[] }) =>
        api.post('/school-admin/announcements', data),

    // === LOGS & AUDIT ===
    getAuditLogs: (params?: { userId?: string; action?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => {
        const query = new URLSearchParams();
        if (params?.userId) query.append('userId', params.userId);
        if (params?.action) query.append('action', params.action);
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        return api.get('/school-admin/audit-logs?' + query.toString());
    },
    getUserActivityLogs: (userId: string, params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        return api.get('/school-admin/users/' + userId + '/activity?' + query.toString());
    },
};

export default api;

