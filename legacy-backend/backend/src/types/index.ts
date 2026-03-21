import { Request } from 'express';

// ============================================
// User Types
// ============================================

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin' | 'school_admin';

export interface User {
    id: number;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url: string | null;
    school_id: number | null;
    bio: string | null;
    grade: string | null;
    google_id: string | null;
    password?: string;
    created_at: Date;
    updated_at: Date;
}

export interface AuthUser {
    id: number;
    role: UserRole;
    school_id?: number;
    email?: string;
}

// ============================================
// Request Types
// ============================================

export interface AuthRequest extends Request {
    user?: AuthUser;
}

// ============================================
// Project Types
// ============================================

export type ProjectStatus = 'pending' | 'ongoing' | 'complete';
export type ProjectVisibility = 'private' | 'public';

export interface Project {
    id: number;
    owner_id: number;
    title: string;
    description: string | null;
    start_date: Date;
    end_date: Date | null;
    status: ProjectStatus;
    skills: string[] | null;
    verified: boolean;
    verified_by: number | null;
    visibility: ProjectVisibility;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface ProjectMedia {
    id: number;
    project_id: number;
    media_type: string;
    media_url: string;
    thumbnail_url: string | null;
    file_name: string | null;
    file_size: number | null;
    uploaded_by: number | null;
    created_at: Date;
    deleted_at: Date | null;
}

export interface ProjectFeedback {
    id: number;
    project_id: number;
    user_id: number;
    comment: string | null;
    rating: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// ============================================
// Achievement Types
// ============================================

export interface Achievement {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    date_earned: Date | null;
    verified: boolean;
    verified_by: number | null;
    verified_at: Date | null;
    certificate_url: string | null;
    created_at: Date;
    deleted_at: Date | null;
}

// ============================================
// Scholarship Types
// ============================================

export interface Scholarship {
    id: number;
    title: string;
    description: string | null;
    organization: string | null;
    amount: number | null;
    deadline: Date | null;
    application_url: string | null;
    requirements: string[] | null;
    eligibility_criteria: Record<string, unknown> | null;
    min_gpa: number | null;
    eligible_courses: string[] | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface ScholarshipMatch {
    id: number;
    title: string;
    score: number;
    matchedCriteria: string[];
    missingCriteria: string[];
}

// ============================================
// Profile Types
// ============================================

export interface Profile {
    id: number;
    user_id: number;
    date_of_birth: Date | null;
    phone: string | null;
    address: string | null;
    social_links: Record<string, unknown> | null;
    portfolio_visibility: string;
    intended_course: string | null;
    gpa: number | null;
    subjects: string[] | null;
    graduation_year: number | null;
    created_at: Date;
    updated_at: Date;
}

// ============================================
// Student Level Types
// ============================================

export interface StudentLevel {
    id: number;
    user_id: number;
    level: string;
    points: number;
    achievements_count: number;
    projects_count: number;
    upgraded_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

// ============================================
// Event & Gallery Types
// ============================================

export interface Event {
    id: number;
    title: string;
    description: string | null;
    event_date: Date | null;
    type: 'personal' | 'school';
    created_by: number | null;
    school_id: number | null;
    verified: boolean;
    location: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface MediaItem {
    id: number;
    event_id: number;
    title: string | null;
    description: string | null;
    media_type: string;
    media_url: string;
    uploaded_by: number | null;
    created_at: Date;
    deleted_at: Date | null;
}

export interface PersonalGalleryItem {
    id: number;
    user_id: number;
    title: string | null;
    description: string | null;
    media_type: string;
    media_url: string;
    thumbnail_url: string | null;
    visibility: 'private' | 'public';
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// ============================================
// School Types
// ============================================

export interface School {
    id: number;
    name: string;
    location: string | null;
    education_system: string | null;
    description: string | null;
    logo_url: string | null;
    created_by: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================
// AI Chat Types
// ============================================

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface Recommendations {
    actions: string[];
}

// ============================================
// Validation Types
// ============================================

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    success: boolean;
    errors: ValidationError[];
}
