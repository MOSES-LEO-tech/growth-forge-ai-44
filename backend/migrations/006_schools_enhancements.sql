-- Migration: Add enhanced school fields
-- Date: 2025-02-12

-- Add missing columns to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS level VARCHAR(100);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS curriculum TEXT[];
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS banner_url VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
CREATE INDEX IF NOT EXISTS idx_schools_location ON schools(location);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(type);
CREATE INDEX IF NOT EXISTS idx_schools_level ON schools(level);

-- Create scholarships table if not exists
CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    min_gpa DECIMAL(3, 2),
    eligible_courses TEXT[],
    requirements TEXT[],
    eligibility_criteria JSONB,
    provider_name VARCHAR(255),
    provider_contact VARCHAR(255),
    application_url VARCHAR(255),
    deadline DATE,
    start_date DATE,
    end_date DATE,
    is_renewable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create index for scholarships
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_active ON scholarships Add sample(is_active);

-- school data for testing
INSERT INTO schools (name, location, education_system, description, type, level, curriculum, contact_email, contact_phone, address, website)
VALUES 
    ('Greenfield International Academy', 'London, UK', 'British', 'Greenfield International Academy is committed to providing world-class education that nurtures critical thinking, creativity, and global citizenship.', 'International School', 'Primary & Secondary', ARRAY['IGCSE', 'A-Levels', 'IB'], 'info@greenfield.edu', '+44 20 1234 5678', '123 Education Lane, London, UK', 'https://greenfield.edu'),
    ('Nairobi STEM High School', 'Nairobi, Kenya', 'Kenyan 8-4-4', 'A leading institution focused on Science, Technology, Engineering, and Mathematics education for Kenyan students.', 'National School', 'Secondary', ARRAY['KCSE', 'STEM'], 'admissions@nairobistem.ac.ke', '+254 20 123 4567', '456 Science Avenue, Nairobi, Kenya', 'https://nairobistem.ac.ke'),
    ('Cape Town Arts Academy', 'Cape Town, South Africa', 'South African', 'Excellence in arts education with a focus on visual arts, music, and performing arts.', 'Specialized School', 'Primary & Secondary', ARRAY['CAPS', 'Arts'], 'info@capetownarts.za', '+27 21 123 4567', '789 Creative Street, Cape Town, South Africa', 'https://capetownarts.za')
ON CONFLICT DO NOTHING;

-- Add sample scholarships
INSERT INTO scholarships (title, description, amount, min_gpa, eligible_courses, requirements, deadline, provider_name)
VALUES 
    ('African Excellence Scholarship', 'Full scholarship for outstanding African students pursuing higher education.', 25000.00, 3.5, ARRAY['All'], ARRAY['Leadership', 'Community Service'], '2025-08-01', 'African Education Foundation'),
    ('STEM Women Initiative', ' scholarship for women pursuing STEM degrees in African universities.', 15000.00, 3.0, ARRAY['Computer Science', 'Engineering', 'Mathematics', 'Physics'], ARRAY['Women', 'STEM'], '2025-06-15', 'TechWomen Africa'),
    ('Young Leaders Award', 'Recognizing young leaders who have made significant contributions to their communities.', 10000.00, 2.5, ARRAY['All'], ARRAY['Leadership', 'Volunteering'], '2025-07-30', 'Global Youth Leaders')
ON CONFLICT DO NOTHING;

SELECT 'Migration completed successfully' as status;
