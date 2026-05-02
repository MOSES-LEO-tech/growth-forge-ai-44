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
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          location: string | null
          description: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          description?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          description?: string | null
          logo_url?: string | null
          created_at?: string
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
          certificate_url: string | null
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
          certificate_url?: string | null
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
          certificate_url?: string | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin' | 'super_admin'
export type Profile = Database['public']['Tables']['profiles']['Row']
export type School = Database['public']['Tables']['schools']['Row']
export type StudentLevel = Database['public']['Tables']['student_levels']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Scholarship = Database['public']['Tables']['scholarships']['Row']
export type Recommendation = Database['public']['Tables']['recommendations']['Row']
export type GalleryEvent = Database['public']['Tables']['gallery_events']['Row']
export type GalleryMedia = Database['public']['Tables']['gallery_media']['Row']
