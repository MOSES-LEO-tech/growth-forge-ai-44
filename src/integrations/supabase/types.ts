export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Relationships: []
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
          visibility: string
          timezone: string | null
          education_system: string | null
          onboarding_completed_at: string | null
          notification_prefs: Json
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
          visibility?: string
          timezone?: string | null
          education_system?: string | null
          onboarding_completed_at?: string | null
          notification_prefs?: Json
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
          visibility?: string
          timezone?: string | null
          education_system?: string | null
          onboarding_completed_at?: string | null
          notification_prefs?: Json
          created_at?: string
          updated_at?: string
        }
      }
      school_announcements: {
        Relationships: [
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          title: string
          message: string
          audience: 'students' | 'parents' | 'staff'
          status: 'draft' | 'published'
          created_by: string | null
          published_by: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          message: string
          audience?: 'students' | 'parents' | 'staff'
          status?: 'draft' | 'published'
          created_by?: string | null
          published_by?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          message?: string
          audience?: 'students' | 'parents' | 'staff'
          status?: 'draft' | 'published'
          created_by?: string | null
          published_by?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Relationships: []
        Row: {
          id: string
          name: string
          location: string | null
          country: string | null
          description: string | null
          logo_url: string | null
          cover_url: string | null
          gallery_urls: string[]
          hero_video_url: string | null
          tagline: string | null
          founded_year: number | null
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
          cover_url?: string | null
          gallery_urls?: string[]
          hero_video_url?: string | null
          tagline?: string | null
          founded_year?: number | null
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
          cover_url?: string | null
          gallery_urls?: string[]
          hero_video_url?: string | null
          tagline?: string | null
          founded_year?: number | null
          admin_id?: string | null
          approval_status?: SchoolApprovalStatus
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      school_gallery_media: {
        Relationships: [
          {
            foreignKeyName: "school_gallery_media_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          url: string
          media_type: 'image' | 'video'
          caption: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          url: string
          media_type?: 'image' | 'video'
          caption?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          url?: string
          media_type?: 'image' | 'video'
          caption?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      academic_classes: {
        Relationships: [
          {
            foreignKeyName: "academic_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          name: string
          grade: string | null
          student_count: number | null
          teacher_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          grade?: string | null
          student_count?: number | null
          teacher_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          grade?: string | null
          student_count?: number | null
          teacher_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      academic_subjects: {
        Relationships: [
          {
            foreignKeyName: "academic_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          name: string
          code: string | null
          grade: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          code?: string | null
          grade?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          code?: string | null
          grade?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      academic_years: {
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          name: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      school_join_codes: {
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "school_connection_requests_school_id_fkey",
            columns: ["school_id"],
            isOneToOne: false,
            referencedRelation: "schools",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "school_connection_requests_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "school_connection_requests_decided_by_fkey",
            columns: ["decided_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
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
      achievements: {
        Relationships: []
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
        Relationships: []
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
      project_files: {
        Relationships: []
        Row: {
          id: string
          project_id: string
          folder_id: string | null
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          tags: string[]
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          folder_id?: string | null
          file_name: string
          file_path: string
          file_type: string
          file_size?: number
          tags?: string[]
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          folder_id?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          file_size?: number
          tags?: string[]
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_folders: {
        Relationships: []
        Row: {
          id: string
          project_id: string
          name: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_tasks: {
        Relationships: []
        Row: {
          id: string
          project_id: string
          title: string
          status: 'todo' | 'in_progress' | 'done'
          due_date: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          status?: 'todo' | 'in_progress' | 'done'
          due_date?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          status?: 'todo' | 'in_progress' | 'done'
          due_date?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      scholarships: {
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          folder_id: string | null
          tags: string[]
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
          folder_id?: string | null
          tags?: string[]
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
          folder_id?: string | null
          tags?: string[]
          created_at?: string
          deleted_at?: string | null
        }
      }
      gallery_folders: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      gallery_media: {
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      parent_child_links: {
        Relationships: []
        Row: {
          id: string
          parent_id: string | null
          child_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          child_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          child_id?: string | null
          created_at?: string
        }
      }
      admin_audit_logs: {
        Relationships: []
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          metadata?: Json
          created_at?: string
        }
      }
      smartbuddy_usage: {
        Relationships: []
        Row: {
          id: string
          user_id: string | null
          model: string
          provider: string
          personality: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          total_cost_usd: number
          cost_source: string
          latency_ms: number | null
          status: string
          error_code: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          model: string
          provider?: string
          personality?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          total_cost_usd?: number
          cost_source?: string
          latency_ms?: number | null
          status?: string
          error_code?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          model?: string
          provider?: string
          personality?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          total_cost_usd?: number
          cost_source?: string
          latency_ms?: number | null
          status?: string
          error_code?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      scholarship_applications: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          scholarship_id: string
          status: string
          applied_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scholarship_id: string
          status?: string
          applied_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scholarship_id?: string
          status?: string
          applied_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cms_pages: {
        Relationships: [
          {
            foreignKeyName: "cms_pages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          slug: string
          title: string
          content: string
          hero_image_url: string | null
          status: CmsContentStatus
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          published_at: string | null
          published_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          slug: string
          title: string
          content?: string
          hero_image_url?: string | null
          status?: CmsContentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          slug?: string
          title?: string
          content?: string
          hero_image_url?: string | null
          status?: CmsContentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cms_news: {
        Relationships: [
          {
            foreignKeyName: "cms_news_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          title: string
          body: string
          audience: string
          status: CmsContentStatus
          featured: boolean
          publish_at: string | null
          expire_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          published_at: string | null
          published_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          body: string
          audience?: string
          status?: CmsContentStatus
          featured?: boolean
          publish_at?: string | null
          expire_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          body?: string
          audience?: string
          status?: CmsContentStatus
          featured?: boolean
          publish_at?: string | null
          expire_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cms_events: {
        Relationships: [
          {
            foreignKeyName: "cms_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          title: string
          description: string | null
          location: string | null
          event_date: string
          end_date: string | null
          audience: string
          status: CmsContentStatus
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          published_at: string | null
          published_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          description?: string | null
          location?: string | null
          event_date: string
          end_date?: string | null
          audience?: string
          status?: CmsContentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          description?: string | null
          location?: string | null
          event_date?: string
          end_date?: string | null
          audience?: string
          status?: CmsContentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cms_resources: {
        Relationships: [
          {
            foreignKeyName: "cms_resources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
        Row: {
          id: string
          school_id: string
          title: string
          description: string | null
          category: string | null
          file_url: string
          file_type: string | null
          file_size: number | null
          tags: string[]
          status: CmsContentStatus
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          published_at: string | null
          published_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          description?: string | null
          category?: string | null
          file_url: string
          file_type?: string | null
          file_size?: number | null
          tags?: string[]
          status?: CmsContentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          description?: string | null
          category?: string | null
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          tags?: string[]
          status?: CmsContentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          published_at?: string | null
          published_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cms_content_versions: {
        Relationships: []
        Row: {
          id: string
          entity_type: string
          entity_id: string
          version: number
          content: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          version: number
          content: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          version?: number
          content?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      enrollments: {
        Relationships: [
          {
            foreignKeyName: 'enrollments_school_id_fkey'
            columns: ['school_id']
            isOneToOne: false
            referencedRelation: 'schools'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enrollments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
        Row: {
          id: string
          school_id: string
          student_id: string
          grade_level: string | null
          class_name: string | null
          school_year: string | null
          status: EnrollmentStatus
          enrolled_at: string
          exited_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          student_id: string
          grade_level?: string | null
          class_name?: string | null
          school_year?: string | null
          status?: EnrollmentStatus
          enrolled_at?: string
          exited_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          student_id?: string
          grade_level?: string | null
          class_name?: string | null
          school_year?: string | null
          status?: EnrollmentStatus
          enrolled_at?: string
          exited_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      link_parent_to_student_by_email: {
        Args: { p_student_email: string }
        Returns: {
          child_id: string
          status: 'linked'
        }
      }
      announcements_publish: {
        Args: { p_announcement_id: string }
        Returns: {
          id: string
          status: 'published'
          recipients: number
        }
      }
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
      delete_student_project: {
        Args: { p_project_id: string }
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
      cms_submit_for_review: {
        Args: { p_entity_type: string; p_entity_id: string }
        Returns: Json
      }
      cms_publish: {
        Args: { p_entity_type: string; p_entity_id: string }
        Returns: Json
      }
      cms_reject: {
        Args: { p_entity_type: string; p_entity_id: string; p_reason?: string | null }
        Returns: Json
      }
      cms_list_versions: {
        Args: { p_entity_type: string; p_entity_id: string }
        Returns: Json
      }
      cms_restore_version: {
        Args: { p_entity_type: string; p_entity_id: string; p_version: number }
        Returns: Json
      }
      admin_update_student_profile: {
        Args: { p_student_id: string; p_fields: Json }
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
export type CmsContentStatus = 'draft' | 'pending_review' | 'published' | 'rejected'
export type CmsAudience = 'public' | 'students' | 'staff'
export type EnrollmentStatus = 'active' | 'withdrawn' | 'graduated' | 'pending'
export type Profile = Database['public']['Tables']['profiles']['Row']
export type School = Database['public']['Tables']['schools']['Row']
export type SchoolJoinCode = Database['public']['Tables']['school_join_codes']['Row']
export type SchoolConnectionRequest = Database['public']['Tables']['school_connection_requests']['Row']
export type SchoolAnnouncement = Database['public']['Tables']['school_announcements']['Row']
export type SchoolGalleryMedia = Database['public']['Tables']['school_gallery_media']['Row']
export type AcademicClass = Database['public']['Tables']['academic_classes']['Row']
export type AcademicSubject = Database['public']['Tables']['academic_subjects']['Row']
export type AcademicYear = Database['public']['Tables']['academic_years']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectTask = Database['public']['Tables']['project_tasks']['Row']
export type ProjectFolder = Database['public']['Tables']['project_folders']['Row']
export type ProjectFile = Database['public']['Tables']['project_files']['Row']
export type Scholarship = Database['public']['Tables']['scholarships']['Row']
export type Recommendation = Database['public']['Tables']['recommendations']['Row']
export type GalleryEvent = Database['public']['Tables']['gallery_events']['Row']
export type GalleryFolder = Database['public']['Tables']['gallery_folders']['Row']
export type GalleryMedia = Database['public']['Tables']['gallery_media']['Row']
export type CmsPage = Database['public']['Tables']['cms_pages']['Row']
export type CmsNews = Database['public']['Tables']['cms_news']['Row']
export type CmsEvent = Database['public']['Tables']['cms_events']['Row']
export type CmsResource = Database['public']['Tables']['cms_resources']['Row']
export type CmsContentVersion = Database['public']['Tables']['cms_content_versions']['Row']
export type Enrollment = Database['public']['Tables']['enrollments']['Row']
