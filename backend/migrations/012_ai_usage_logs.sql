-- Migration: Create AI usage tracking tables
-- Date: 2026-02-23

-- AI usage logs for tracking AI feature usage per school
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    feature_name VARCHAR(100) NOT NULL,
    credits_used INTEGER DEFAULT 1,
    request_type VARCHAR(50),
    response_time_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_school ON ai_usage_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature_name);

-- AI access tiers configuration per school
CREATE TABLE IF NOT EXISTS ai_access_tiers (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    student_credits INTEGER DEFAULT 100,
    teacher_credits INTEGER DEFAULT 500,
    parent_credits INTEGER DEFAULT 50,
    ai_chat_enabled BOOLEAN DEFAULT true,
    ai_recommendations_enabled BOOLEAN DEFAULT true,
    ai_achievements_enabled BOOLEAN DEFAULT true,
    ai_essay_review_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_access_tiers_school ON ai_access_tiers(school_id);

SELECT 'AI usage logs migration completed successfully' as status;
