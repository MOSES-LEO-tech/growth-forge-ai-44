export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          grade_level: string | null
          class_name: string | null
          age: number | null
          gpa: number | null
          subjects: string[] | null
          clubs: string[] | null
          interests: string[] | null
          extracurriculars: string[] | null
          role: UserRole
          school_id: string | null
          account_status: AccountStatus
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          grade_level?: string | null
          class_name?: string | null
          age?: number | null
          gpa?: number | null
          subjects?: string[] | null
          clubs?: string[] | null
          interests?: string[] | null
          extracurriculars?: string[] | null
          role?: UserRole
          school_id?: string | null
          account_status?: AccountStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          grade_level?: string | null
          class_name?: string | null
          age?: number | null
          gpa?: number | null
          subjects?: string[] | null
          clubs?: string[] | null
          interests?: string[] | null
          extracurriculars?: string[] | null
          role?: UserRole
          school_id?: string | null
          account_status?: AccountStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          location: string | null
          country: string | null
          description: string | null
          logo_url: string | null
          admin_id: string | null
          approval_status: SchoolApprovalStatus
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          country?: string | null
          description?: string | null
          logo_url?: string | null
          admin_id?: string | null
          approval_status?: SchoolApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          country?: string | null
          description?: string | null
          logo_url?: string | null
          admin_id?: string | null
          approval_status?: SchoolApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      school_join_codes: {
        Row: {
          id: string
          school_id: string
          code: string
          created_by: string | null
          is_active: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          code: string
          created_by?: string | null
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          code?: string
          created_by?: string | null
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      school_connection_requests: {
        Row: {
          id: string
          school_id: string
          user_id: string
          role: 'student' | 'teacher'
          status: SchoolConnectionStatus
          requested_at: string
          decided_by: string | null
          decided_at: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          school_id: string
          user_id: string
          role: 'student' | 'teacher'
          status?: SchoolConnectionStatus
          requested_at?: string
          decided_by?: string | null
          decided_at?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          user_id?: string
          role?: 'student' | 'teacher'
          status?: SchoolConnectionStatus
          requested_at?: string
          decided_by?: string | null
          decided_at?: string | null
          rejection_reason?: string | null
        }
      }
      student_levels: {
        Row: {
          id: string
          user_id: string | null
          points: number | null
          level: number | null
          badges: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          points?: number | null
          level?: number | null
          badges?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          points?: number | null
          level?: number | null
          badges?: string[] | null
          created_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          user_id: string | null
          title: string
          description: string | null
          category: string | null
          date_earned: string | null
          verified: boolean | null
          verified_by: string | null
          certificate_url: string | null
          approval_status: ContentApprovalStatus
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          description?: string | null
          category?: string | null
          date_earned?: string | null
          verified?: boolean | null
          verified_by?: string | null
          certificate_url?: string | null
          approval_status?: ContentApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          description?: string | null
          category?: string | null
          date_earned?: string | null
          verified?: boolean | null
          verified_by?: string | null
          certificate_url?: string | null
          approval_status?: ContentApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string | null
          user_id: string | null
          title: string
          description: string | null
          tags: string[] | null
          media_urls: string[] | null
          status: string | null
          start_date: string | null
          end_date: string | null
          skills_tracked: Json | null
          verified: boolean | null
          collaborators: string[] | null
          approval_status: ContentApprovalStatus
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          owner_id?: string | null
          user_id?: string | null
          title: string
          description?: string | null
          tags?: string[] | null
          media_urls?: string[] | null
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          skills_tracked?: Json | null
          verified?: boolean | null
          collaborators?: string[] | null
          approval_status?: ContentApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          user_id?: string | null
          title?: string
          description?: string | null
          tags?: string[] | null
          media_urls?: string[] | null
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          skills_tracked?: Json | null
          verified?: boolean | null
          collaborators?: string[] | null
          approval_status?: ContentApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      scholarships: {
        Row: {
          id: string
          title: string
          amount: number | null
          deadline: string | null
          requirements: string | null
          school_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          amount?: number | null
          deadline?: string | null
          requirements?: string | null
          school_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          amount?: number | null
          deadline?: string | null
          requirements?: string | null
          school_id?: string | null
          created_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          user_id: string | null
          type: 'scholarship' | 'profile' | 'actions' | null
          content: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type?: 'scholarship' | 'profile' | 'actions' | null
          content?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: 'scholarship' | 'profile' | 'actions' | null
          content?: Json | null
          created_at?: string
        }
      }
      gallery_events: {
        Row: {
          id: string
          user_id: string | null
          title: string
          description: string | null
          location: string | null
          event_date: string | null
          is_public: boolean | null
          approval_status: ContentApprovalStatus
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          description?: string | null
          location?: string | null
          event_date?: string | null
          is_public?: boolean | null
          approval_status?: ContentApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          description?: string | null
          location?: string | null
          event_date?: string | null
          is_public?: boolean | null
          approval_status?: ContentApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      gallery_media: {
        Row: {
          id: string
          event_id: string | null
          url: string
          type: 'image' | 'video' | 'document' | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          url: string
          type?: 'image' | 'video' | 'document' | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          url?: string
          type?: 'image' | 'video' | 'document' | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string
          title: string
          message: string | null
          resource_type: string | null
          resource_id: string | null
          read: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          title: string
          message?: string | null
          resource_type?: string | null
          resource_id?: string | null
          read?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          title?: string
          message?: string | null
          resource_type?: string | null
          resource_id?: string | null
          read?: boolean | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string | null
          receiver_id: string | null
          subject: string | null
          content: string
          read_status: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id?: string | null
          receiver_id?: string | null
          subject?: string | null
          content: string
          read_status?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string | null
          receiver_id?: string | null
          subject?: string | null
          content?: string
          read_status?: boolean | null
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string | null
          resource_type: string
          resource_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          resource_type: string
          resource_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          resource_type?: string
          resource_id?: string
          content?: string
          created_at?: string
        }
      }
      settings: {
        Row: {
          key: string
          value: Json | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      request_school_connection: {
        Args: { p_code: string }
        Returns: {
          status: 'pending' | 'approved'
          request_id?: string
          school_id?: string
          school_name?: string
        }
      }
      rotate_school_join_code: {
        Args: { p_school_id?: string | null }
        Returns: {
          school_id: string
          code: string
        }
      }
      get_active_school_join_code: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          school_id: string
          code: string
          created_by: string | null
          is_active: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }[]
      }
      approve_school_application: {
        Args: { p_school_id: string }
        Returns: {
          school_id: string
          admin_id: string
          code: string
        }
      }
      reject_school_application: {
        Args: { p_school_id: string; p_reason?: string | null }
        Returns: {
          school_id: string
          status: 'rejected'
        }
      }
      approve_school_connection: {
        Args: { p_request_id: string }
        Returns: {
          request_id: string
          status: 'approved'
        }
      }
      reject_school_connection: {
        Args: { p_request_id: string; p_reason?: string | null }
        Returns: {
          request_id: string
          status: 'rejected'
        }
      }
      disconnect_my_school: {
        Args: Record<string, never>
        Returns: {
          status: 'independent'
        }
      }
      approve_student_project: {
        Args: { p_project_id: string }
        Returns: Json
      }
      reject_student_project: {
        Args: { p_project_id: string; p_reason?: string | null }
        Returns: Json
      }
      approve_student_media_event: {
        Args: { p_event_id: string }
        Returns: Json
      }
      reject_student_media_event: {
        Args: { p_event_id: string; p_reason?: string | null }
        Returns: Json
      }
      approve_student_achievement: {
        Args: { p_achievement_id: string }
        Returns: Json
      }
      reject_student_achievement: {
        Args: { p_achievement_id: string; p_reason?: string | null }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin' | 'super_admin'
export type AccountStatus = 'pending' | 'approved' | 'rejected'
export type SchoolApprovalStatus = 'pending' | 'approved' | 'rejected'
export type SchoolConnectionStatus = 'pending' | 'approved' | 'rejected'
export type ContentApprovalStatus = 'pending' | 'approved' | 'rejected'
export type Profile = Database['public']['Tables']['profiles']['Row']
export type School = Database['public']['Tables']['schools']['Row']
export type SchoolJoinCode = Database['public']['Tables']['school_join_codes']['Row']
export type SchoolConnectionRequest = Database['public']['Tables']['school_connection_requests']['Row']
export type StudentLevel = Database['public']['Tables']['student_levels']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Scholarship = Database['public']['Tables']['scholarships']['Row']
export type Recommendation = Database['public']['Tables']['recommendations']['Row']
export type GalleryEvent = Database['public']['Tables']['gallery_events']['Row']
export type GalleryMedia = Database['public']['Tables']['gallery_media']['Row']
