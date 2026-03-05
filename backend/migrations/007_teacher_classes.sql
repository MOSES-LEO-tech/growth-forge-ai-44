-- Teacher Dashboard Database Migration
-- Phase 1: Classes, Class Students, and Notifications tables

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  subject VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create class_students table (enrollment)
CREATE TABLE IF NOT EXISTS class_students (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);

-- Create notifications table for all users (including teachers)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Add foreign key index for class_students lookup
CREATE INDEX IF NOT EXISTS idx_class_students_composite ON class_students(class_id, student_id);

-- Create function to auto-create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id INTEGER,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_resource_type VARCHAR DEFAULT NULL,
  p_resource_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_notification_id INTEGER;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, resource_type, resource_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_resource_type, p_resource_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get students in a teacher's classes
CREATE OR REPLACE FUNCTION get_teacher_students(p_teacher_id INTEGER)
RETURNS TABLE(
  student_id INTEGER,
  user_id INTEGER,
  full_name VARCHAR,
  email VARCHAR,
  grade VARCHAR,
  class_id INTEGER,
  class_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.student_id,
    u.id AS user_id,
    u.full_name,
    u.email,
    u.grade,
    c.id AS class_id,
    c.name AS class_name
  FROM class_students cs
  JOIN classes c ON c.id = cs.class_id
  JOIN users u ON u.id = cs.student_id
  WHERE c.teacher_id = p_teacher_id
    AND c.deleted_at IS NULL
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher's class list with student counts
CREATE OR REPLACE FUNCTION get_teacher_classes_with_counts(p_teacher_id INTEGER)
RETURNS TABLE(
  class_id INTEGER,
  class_name VARCHAR,
  grade VARCHAR,
  subject VARCHAR,
  student_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS class_id,
    c.name AS class_name,
    c.grade,
    c.subject,
    COUNT(cs.student_id)::INTEGER AS student_count
  FROM classes c
  LEFT JOIN class_students cs ON cs.class_id = c.id
  WHERE c.teacher_id = p_teacher_id
    AND c.deleted_at IS NULL
  GROUP BY c.id, c.name, c.grade, c.subject
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;
