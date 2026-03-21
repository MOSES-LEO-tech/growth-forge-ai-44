import type { Tables, Enums } from '@/integrations/supabase/types';

// Re-export commonly used table row types
export type Profile = Tables<'profiles'>;
export type Achievement = Tables<'achievements'>;
export type Project = Tables<'projects'>;
export type Scholarship = Tables<'scholarships'>;
export type ScholarshipApplication = Tables<'scholarship_applications'>;
export type MediaItem = Tables<'media_items'>;
export type Event = Tables<'events'>;
export type School = Tables<'schools'>;
export type Student = Tables<'students'>;
export type UserRole = Enums<'user_role'>;
export type AppRole = Enums<'app_role'>;
export type ProjectStatus = Enums<'project_status'>;

// Gallery types (mapped to events + media_items)
export type GalleryEvent = Event;
export type GalleryMedia = MediaItem;

// Notification placeholder type (table doesn't exist yet)
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  resource_type?: string | null;
  resource_id?: string | null;
  created_at: string;
}

// Recommendation placeholder type (table doesn't exist yet)
export interface Recommendation {
  id: string;
  user_id: string;
  type: string;
  content: string | Record<string, any>;
  created_at: string;
}
