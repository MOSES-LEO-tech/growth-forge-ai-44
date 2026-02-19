-- Migration: Parent Dashboard Tables
-- Created: 2026-02-19
-- Purpose: Add tables needed for the Parent Dashboard functional activation

-- 1. parent_children: Links a parent user to their student child(ren)
CREATE TABLE IF NOT EXISTS parent_children (
  id          SERIAL PRIMARY KEY,
  parent_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL, -- school_admin who created the link
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_parent_child UNIQUE (parent_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_student ON parent_children(student_id);

-- 2. project_comments: Allows parents to leave encouragement on student projects (read-only academic, write encouragement)
CREATE TABLE IF NOT EXISTS project_comments (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment     TEXT NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_parent ON project_comments(parent_id);

-- 3. messages: Parent <-> Teacher messaging
CREATE TABLE IF NOT EXISTS messages (
  id           SERIAL PRIMARY KEY,
  sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject      VARCHAR(255),
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_status  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read_status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- 4. notifications: Per-user notification feed
CREATE TABLE IF NOT EXISTS notifications (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           VARCHAR(50) NOT NULL,
  -- types: 'achievement_verified' | 'project_complete' | 'message' | 'event_reminder'
  title          TEXT NOT NULL,
  body           TEXT,
  read_status    BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id   INTEGER,  -- e.g. achievement_id, project_id, message_id
  reference_type VARCHAR(50), -- 'achievement' | 'project' | 'message' | 'event'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- 5. parent_plans: Parent subscription tier
CREATE TABLE IF NOT EXISTS parent_plans (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier       VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'plus', 'pro')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. parent_ai_chat_logs: Parent AI guidance chat history (separate from student SmartBuddy logs)
CREATE TABLE IF NOT EXISTS parent_ai_chat_logs (
  id              SERIAL PRIMARY KEY,
  parent_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id        INTEGER REFERENCES users(id) ON DELETE SET NULL, -- contextual child at time of chat
  message_role    VARCHAR(10) NOT NULL CHECK (message_role IN ('user', 'assistant')),
  message_content TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parent_ai_logs_parent ON parent_ai_chat_logs(parent_id, created_at DESC);
