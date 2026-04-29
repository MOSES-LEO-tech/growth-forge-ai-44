export interface School {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  logo_url: string | null;
  description: string | null;
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
