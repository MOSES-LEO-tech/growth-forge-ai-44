-- Migration: Create academic_years table for school years management
-- Date: 2026-02-23

-- Academic years table for managing school years
CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_academic_years_school_id ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active);

SELECT 'Academic years migration completed successfully' as status;
