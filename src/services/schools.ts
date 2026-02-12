import api from './api';

export interface School {
  id: number;
  name: string;
  location: string;
  education_system?: string;
  description?: string;
  type?: string;
  level?: string;
  curriculum?: string[];
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  banner_url?: string;
  website?: string;
  logo_url?: string;
  student_count?: number;
  teacher_count?: number;
  project_count?: number;
  achievement_count?: number;
  is_active?: boolean;
}

export interface SchoolStats {
  total_students: number;
  total_teachers: number;
  total_projects: number;
  total_achievements: number;
  total_events: number;
}

export interface SchoolResponse {
  schools: School[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SchoolWithStats extends School {
  stats?: SchoolStats;
  recentAchievements?: any[];
  topStudents?: any[];
}

const schoolsService = {
  // Get all schools with pagination and filters
  async getSchools(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    level?: string;
  }): Promise<SchoolResponse> {
    const response = await api.get('/schools', { params });
    return response.data;
  },

  // Get single school by ID
  async getSchool(id: number): Promise<SchoolWithStats> {
    const response = await api.get(`/schools/${id}`);
    return response.data;
  },

  // Get school statistics
  async getSchoolStats(id: number): Promise<{ stats: SchoolStats; recentAchievements: any[]; topStudents: any[] }> {
    const response = await api.get(`/schools/${id}/stats`);
    return response.data;
  },

  // Get users belonging to a school
  async getSchoolUsers(id: number, params?: { role?: string; page?: number; limit?: number }): Promise<{ users: any[]; pagination: any }> {
    const response = await api.get(`/schools/${id}/users`, { params });
    return response.data;
  },

  // Create school (admin only)
  async createSchool(data: Partial<School>): Promise<School> {
    const response = await api.post('/schools', data);
    return response.data;
  },

  // Update school (admin only)
  async updateSchool(id: number, data: Partial<School>): Promise<School> {
    const response = await api.put(`/schools/${id}`, data);
    return response.data;
  },

  // Delete school (admin only)
  async deleteSchool(id: number): Promise<void> {
    await api.delete(`/schools/${id}`);
  },
};

export default schoolsService;
