-- Seed data for Growth Forge AI - Student Portfolio Platform
-- This script creates sample users, schools, and data for testing

-- First, create a sample school
INSERT INTO schools (name, location, education_system, description)
VALUES (
    'Nairobi International School',
    'Nairobi, Kenya',
    'British Curriculum',
    'A leading international school offering British curriculum education in Kenya'
ON CONFLICT DO NOTHING;

-- Create sample users with different roles for testing
-- Password for all test users is: "Test123!" (hashed with bcrypt)
-- Hash generated with: bcrypt.hashSync('Test123!', 10)

-- Admin user
INSERT INTO users (email, password, full_name, role, school_id, bio)
VALUES (
    'admin@growthforge.ai',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3/OCXR3ORlGyNLgiJKmK',
    'System Administrator',
    'admin',
    NULL,
    'System administrator for Growth Forge AI platform'
) ON CONFLICT (email) DO NOTHING;

-- Sample teacher
INSERT INTO users (email, password, full_name, role, school_id, bio)
VALUES (
    'teacher@school.edu',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3/OCXR3ORlGyNLgiJKmK',
    'Jane Teacher',
    'teacher',
    1,
    'Experienced science teacher passionate about student success'
) ON CONFLICT (email) DO NOTHING;

-- Sample student
INSERT INTO users (email, password, full_name, role, school_id, bio)
VALUES (
    'student@school.edu',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3/OCXR3ORlGyNLgiJKmK',
    'Alex Student',
    'student',
    1,
    'High school student passionate about technology and innovation'
) ON CONFLICT (email) DO NOTHING;

-- Sample parent
INSERT INTO users (email, password, full_name, role, school_id, bio)
VALUES (
    'parent@email.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3/OCXR3ORlGyNLgiJKmK',
    'Robert Parent',
    'parent',
    NULL,
    'Proud parent supporting my child educational journey'
) ON CONFLICT (email) DO NOTHING;

-- Create profiles for users
INSERT INTO profiles (user_id, date_of_birth, phone, address, social_links)
VALUES
    (1, '1990-01-15', '+254712345678', 'Nairobi, Kenya', '{"linkedin": "https://linkedin.com/in/admin", "twitter": "@admin"}'),
    (2, '1985-06-20', '+254723456789', 'Nairobi, Kenya', '{"linkedin": "https://linkedin.com/in/teacher"}'),
    (3, '2008-03-10', NULL, 'Nairobi, Kenya', '{"github": "https://github.com/student"}')
ON CONFLICT DO NOTHING;

-- Create student levels for gamification
INSERT INTO student_levels (user_id, level, points, achievements_count, projects_count)
VALUES
    (3, 'intermediate', 150, 5, 3)
ON CONFLICT DO NOTHING;

-- Create sample achievements for the student
INSERT INTO achievements (user_id, title, description, date_earned, category, verified)
VALUES
    (3, 'First Project', 'Completed first portfolio project', '2024-01-15', 'project', true),
    (3, 'Science Fair Winner', 'Won 1st place in school science fair', '2024-02-20', 'award', true),
    (3, 'Coding Basics', 'Completed introduction to programming', '2024-03-01', 'course', false),
    (3, 'Math Excellence', 'Achieved A grade in Mathematics', '2024-03-15', 'academic', false),
    (3, 'Team Player', 'Collaborated on 5 group projects', '2024-04-01', 'collaboration', false)
ON CONFLICT DO NOTHING;

-- Create sample projects for the student
INSERT INTO projects (owner_id, title, description, start_date, end_date, status, skills, visibility)
VALUES
    (3, 'Personal Portfolio Website', 'Built a responsive portfolio website using React', '2024-01-01', '2024-02-15', 'completed', '["React", "TypeScript", "CSS"]', 'public'),
    (3, 'Science Fair Project', 'Investigating renewable energy solutions', '2024-02-01', '2024-03-20', 'completed', '["Research", "Presentation", "Data Analysis"]', 'public'),
    (3, 'Mobile App Concept', 'Designing a study helper mobile application', '2024-04-01', NULL, 'ongoing', '["UI/UX", "Flutter", "User Research"]', 'private')
ON CONFLICT DO NOTHING;

-- Create sample scholarships
INSERT INTO scholarships (title, description, organization, amount, deadline, requirements, eligibility_criteria)
VALUES
    ('STEM Excellence Scholarship', 'Full scholarship for outstanding STEM students', 'Kenya Education Foundation', 50000.00, '2024-08-15', '["Transcripts", "Recommendation Letter", "Essay"], '{"min_gpa": 3.5, "grade_levels": ["Grade 10", "Grade 11", "Grade 12"]}'),
    ('Technology Innovation Grant', 'Supporting young tech innovators', 'African Tech Hub', 25000.00, '2024-09-30', '["Project Proposal", "Portfolio", "Interview"]', '{"min_gpa": 3.0, "grade_levels": ["Grade 9", "Grade 10", "Grade 11", "Grade 12"]}'),
    ('Arts & Culture Scholarship', 'For students passionate about arts and culture', 'Cultural Arts Council', 30000.00, '2024-07-01', '["Portfolio", "Personal Statement"]', '{"grade_levels": ["Grade 10", "Grade 11", "Grade 12"]}'),
    ('Sports Achievement Award', 'Recognizing athletic excellence', 'National Sports Council', 20000.00, '2024-06-15', '["Sports Certificate", "Coach Recommendation"]', '{"grade_levels": ["Grade 9", "Grade 10", "Grade 11", "Grade 12"]}'),
    ('Community Service Grant', 'For students making a difference in their community', 'Youth Community Foundation', 15000.00, '2024-08-01', '["Service Log", "Recommendation Letter"]', '{"min_hours": 50, "grade_levels": ["Grade 10", "Grade 11", "Grade 12"]}')
ON CONFLICT DO NOTHING;

-- Create sample AI recommendations for the student
INSERT INTO recommendations (user_id, category, priority, title, description, status)
VALUES
    (3, 'scholarship', 'high', 'STEM Excellence Scholarship', 'You have strong STEM achievements that match this scholarship criteria. Apply before August 15th!', 'pending'),
    (3, 'skill', 'medium', 'Learn Python Programming', 'Python is widely used in data science and AI. Consider taking an online course.', 'pending'),
    (3, 'project', 'medium', 'Add More Project Details', 'Your portfolio could benefit from detailed case studies for each project.', 'pending'),
    (3, 'achievement', 'low', 'Verify Your Achievements', 'Some achievements are not verified. Ask your teachers to verify them for credibility.', 'pending'),
    (3, 'extracurricular', 'low', 'Join a Club', 'Consider joining a coding or robotics club to enhance your technical skills.', 'pending')
ON CONFLICT DO NOTHING;

-- Create sample events
INSERT INTO events (title, description, event_date, type, location, school_id)
VALUES
    ('Career Day 2024', 'Explore different career paths and meet professionals', '2024-06-10', 'school', 'Main Hall, Nairobi International School', 1),
    ('Tech Innovation Challenge', 'Hackathon for students interested in technology', '2024-07-20', 'competition', 'Innovation Hub, Nairobi', 1),
    ('Parent-Teacher Conference', 'Discuss student progress and goals', '2024-05-15', 'school', 'Conference Room A', 1),
    ('Science & Technology Fair', 'Annual school science exhibition', '2024-08-25', 'school', 'Sports Complex', 1)
ON CONFLICT DO NOTHING;

-- Create sample personal gallery items
INSERT INTO personal_gallery_items (user_id, title, description, media_type, media_url, visibility)
VALUES
    (3, 'Coding Setup', 'My home office coding setup', 'image', 'https://example.com/images/coding-setup.jpg', 'private'),
    (3, 'Science Fair Presentation', 'Presenting my project at the science fair', 'image', 'https://example.com/images/science-fair.jpg', 'public'),
    (3, 'Graduation Goals', 'My academic goals for this year', 'image', 'https://example.com/images/goals.jpg', 'private')
ON CONFLICT DO NOTHING;

-- Update the todo list
-- Display confirmation message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Growth Forge AI - Seed Data Loaded Successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Accounts:';
    RAISE NOTICE '----------------------------------------------';
    RAISE NOTICE 'Email: admin@growthforge.ai';
    RAISE NOTICE 'Password: Test123!';
    RAISE NOTICE 'Role: Admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: teacher@school.edu';
    RAISE NOTICE 'Password: Test123!';
    RAISE NOTICE 'Role: Teacher';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: student@school.edu';
    RAISE NOTICE 'Password: Test123!';
    RAISE NOTICE 'Role: Student';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: parent@email.com';
    RAISE NOTICE 'Password: Test123!';
    RAISE NOTICE 'Role: Parent';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
