-- Migration: Create school settings and school achievements tables
-- Date: 2026-02-23

-- School-specific settings configuration
CREATE TABLE IF NOT EXISTS school_settings (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    theme_color VARCHAR(20) DEFAULT '#2563eb',
    logo_url VARCHAR(255),
    banner_url VARCHAR(255),
    parent_access_enabled BOOLEAN DEFAULT true,
    ai_features_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    require_email_verification BOOLEAN DEFAULT false,
    allow_student_project_sharing BOOLEAN DEFAULT true,
    require_teacher_approval BOOLEAN DEFAULT false,
    custom_css TEXT,
    custom_js TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_school_settings_school ON school_settings(school_id);

-- School-specific achievements
CREATE TABLE IF NOT EXISTS school_achievements (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    criteria TEXT,
    type VARCHAR(50) DEFAULT 'custom',
    icon_url VARCHAR(255),
    points_value INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_school_achievements_school ON school_achievements(school_id);
CREATE INDEX IF NOT EXISTS idx_school_achievements_type ON school_achievements(type);

-- Add featured and flagged columns to projects table if not exists
ALTER TABLE projects ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false;

SELECT 'School settings and achievements migration completed successfully' as status;
