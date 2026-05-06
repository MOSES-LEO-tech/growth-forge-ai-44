export interface School {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  logo_url: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  description: string | null;
  admin_id: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  founded_year: number | null;
  student_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolMember {
  id: string;
  school_id: string;
  user_id: string;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface SchoolStats {
  total_students: number;
  total_achievements: number;
  total_scholarships_won: number;
}

export interface SchoolJoinCode {
  id: string;
  school_id: string;
  code: string;
  created_by: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolConnectionRequest {
  id: string;
  school_id: string;
  user_id: string;
  role: 'student' | 'teacher';
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
}
