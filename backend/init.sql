-- Schools table (created first to allow foreign key references)
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  education_system VARCHAR(100),
  description TEXT,
  logo_url VARCHAR(255),
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'student',
  google_id VARCHAR(255),
  avatar_url VARCHAR(255),
  school_id INTEGER REFERENCES schools(id),
  bio TEXT,
  grade VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for schools.created_by after users table exists
ALTER TABLE schools ADD CONSTRAINT fk_schools_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) 
  ON DELETE SET NULL;

-- Profiles table for extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  phone VARCHAR(50),
  address TEXT,
  social_links JSONB,
  portfolio_visibility VARCHAR(20) DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student levels for tier-based feature access
CREATE TABLE IF NOT EXISTS student_levels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(50) DEFAULT 'basic',
  points INTEGER DEFAULT 0,
  achievements_count INTEGER DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  upgraded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Parent-student relationship linking
CREATE TABLE IF NOT EXISTS parent_student_links (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_earned DATE,
  verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'ongoing',
  skills JSONB,
  verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  visibility VARCHAR(20) DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Project collaborators for multi-student projects
CREATE TABLE IF NOT EXISTS project_collaborators (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'contributor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Project media for rich content (photos, PDFs, videos)
CREATE TABLE IF NOT EXISTS project_media (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  media_type VARCHAR(50),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Project feedback from teachers/parents
CREATE TABLE IF NOT EXISTS project_feedback (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Personal gallery for student photos/videos (separate from school events)
CREATE TABLE IF NOT EXISTS personal_gallery_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  media_type VARCHAR(50),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  visibility VARCHAR(20) DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  type VARCHAR(50) DEFAULT 'personal',
  created_by INTEGER REFERENCES users(id),
  school_id INTEGER REFERENCES schools(id),
  verified BOOLEAN DEFAULT false,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS media_items (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  media_type VARCHAR(50),
  media_url TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- AI chat logs for SmartBuddy
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  personality VARCHAR(50),
  message_role VARCHAR(20),
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scholarships database
CREATE TABLE IF NOT EXISTS scholarships (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organization VARCHAR(255),
  amount DECIMAL(10, 2),
  deadline DATE,
  application_url TEXT,
  requirements JSONB,
  eligibility_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- AI-generated recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50),
  priority VARCHAR(20),
  title VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_personal_gallery_user ON personal_gallery_items(user_id);
CREATE INDEX IF NOT EXISTS idx_project_media_project ON project_media(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user ON ai_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_feedback_project ON project_feedback(project_id);

-- Extended student profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subjects JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intended_course VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gpa NUMERIC(3,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;

-- Additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_graduation_year ON profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_profiles_intended_course ON profiles(intended_course);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships(deadline);

-- Seed demo data (idempotent)
INSERT INTO users (email, password, full_name, role)
VALUES ('demo@student.local', '', 'Demo Student', 'student')
ON CONFLICT (email) DO NOTHING;

WITH u AS (SELECT id FROM users WHERE email = 'demo@student.local')
INSERT INTO profiles (user_id, intended_course, subjects, gpa, location, graduation_year)
SELECT u.id, 'computer science', '["mathematics","computer science"]'::jsonb, 3.7, 'Kenya', 2026 FROM u
ON CONFLICT (user_id) DO NOTHING;

WITH u AS (SELECT id FROM users WHERE email = 'demo@student.local')
INSERT INTO events (title, description, event_date, type, created_by, location)
SELECT 'Coding Club', 'Weekly coding club participation', CURRENT_TIMESTAMP, 'code', u.id, 'Nairobi' FROM u;

WITH u AS (SELECT id FROM users WHERE email = 'demo@student.local')
INSERT INTO achievements (user_id, title, description, date_earned)
SELECT u.id, 'Hackathon Finalist', 'Reached finals in school hackathon', CURRENT_DATE - INTERVAL '30 days' FROM u;

WITH u AS (SELECT id FROM users WHERE email = 'demo@student.local')
INSERT INTO projects (owner_id, title, description, start_date, status, skills, verified)
SELECT u.id, 'Portfolio Website', 'React + TypeScript site', CURRENT_DATE - INTERVAL '90 days', 'ongoing', '["react","typescript","javascript"]'::jsonb, true FROM u;

-- Scholarships
INSERT INTO scholarships (title, description, organization, amount, deadline, application_url, requirements, eligibility_criteria)
VALUES (
  'Kenya CS Excellence Scholarship',
  'For high-achieving CS-intent students in Kenya with math strength',
  'TechOrg Kenya',
  1500.00,
  CURRENT_DATE + INTERVAL '120 days',
  'https://example.org/apply/cs-excellence',
  '{"skills": ["react","typescript"]}',
  '{"majors": ["computer science"], "subjects": ["mathematics"], "gpa_min": 3.5, "location": ["kenya"], "event_types": ["code"], "graduation_year": 2026}'
)
ON CONFLICT DO NOTHING;

INSERT INTO scholarships (title, description, organization, amount, deadline, application_url, requirements, eligibility_criteria)
VALUES (
  'Debate & Leadership Award',
  'Supports student leaders with debate participation',
  'Leaders Fund',
  1000.00,
  CURRENT_DATE + INTERVAL '90 days',
  'https://example.org/apply/debate-leadership',
  '{"skills": ["communication"]}',
  '{"event_types": ["debate"], "gpa_min": 3.0}'
)
ON CONFLICT DO NOTHING;

