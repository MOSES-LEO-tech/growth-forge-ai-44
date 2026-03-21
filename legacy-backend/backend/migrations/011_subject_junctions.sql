-- Migration: Create subject junction tables for student and teacher assignments
-- Date: 2026-02-23

-- Junction table for student-subject enrollments
CREATE TABLE IF NOT EXISTS student_subjects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subject_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_user ON student_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);

-- Junction table for teacher-subject assignments
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subject_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_user ON teacher_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);

SELECT 'Subject junction tables migration completed successfully' as status;
