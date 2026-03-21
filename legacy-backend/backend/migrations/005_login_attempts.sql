-- Migration: Create login_attempts table and add user security columns
-- Run this to add brute force protection and user security enhancements

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success) WHERE success = false;

-- Add security columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Create a function to clean up old login attempts (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get recent failed login attempts count
CREATE OR REPLACE FUNCTION get_recent_failed_attempts(
    p_email VARCHAR(255),
    p_ip_address VARCHAR(45),
    p_window_minutes INTEGER DEFAULT 15
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM login_attempts
        WHERE email = p_email
          AND success = false
          AND created_at > NOW() - INTERVAL '1 minute' * p_window_minutes
    );
END;
$$ LANGUAGE plpgsql;

-- Add this to your crontab or scheduled job to run daily:
-- SELECT cleanup_old_login_attempts(30);

-- Example: Get failed attempts for an email in the last 15 minutes
-- SELECT get_recent_failed_attempts('user@example.com', '192.168.1.1', 15);
