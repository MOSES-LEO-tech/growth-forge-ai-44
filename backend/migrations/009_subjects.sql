-- Migration: Create subjects table for academic structure
-- Date: 2026-02-23

-- Subjects table for managing school subjects
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    grade VARCHAR(50) NOT NULL,
    subject_head_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade ON subjects(grade);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);

SELECT 'Subjects migration completed successfully' as status;
