-- Migration: Parent Dashboard Tables
-- Created: 2026-02-19 (FIXED 2026-04-29)
-- Purpose: Add tables needed for the Parent Dashboard functional activation
-- FIXES: Changed SERIAL/INTEGER -> UUID, users(id) -> auth.users(id)
--        Renamed parent_children -> parent_child_links for consistency

-- 1. parent_child_links: Links a parent user to their student child(ren)
CREATE TABLE IF NOT EXISTS parent_child_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- school_admin who created the link
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_parent_child UNIQUE (parent_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent ON parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_child ON parent_child_links(child_id);

-- 2. project_comments: Allows parents to leave encouragement on student projects (read-only academic, write encouragement)
CREATE TABLE IF NOT EXISTS project_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment     TEXT NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_parent ON project_comments(parent_id);

-- 3. messages: Parent <-> Teacher messaging (aligned with unified_schema)
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject      TEXT,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_status  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read_status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- 4. notifications: Per-user notification feed (aligned with unified_schema)
CREATE TABLE IF NOT EXISTS notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  message        TEXT,
  resource_type  TEXT,
  resource_id    UUID,
  read           BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- 5. parent_plans: Parent subscription tier
CREATE TABLE IF NOT EXISTS parent_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier       TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'plus', 'pro')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. parent_ai_chat_logs: Parent AI guidance chat history (separate from student SmartBuddy logs)
CREATE TABLE IF NOT EXISTS parent_ai_chat_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- contextual child at time of chat
  message_role    TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
  message_content TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parent_ai_logs_parent ON parent_ai_chat_logs(parent_id, created_at DESC);

-- Enable RLS on parent-specific tables
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent_child_links
DO $$
BEGIN
    DROP POLICY IF EXISTS "Parents view own links" ON parent_child_links;
    DROP POLICY IF EXISTS "Students view own links" ON parent_child_links;
    DROP POLICY IF EXISTS "Parents can create links" ON parent_child_links;
    DROP POLICY IF EXISTS "Parents can delete links" ON parent_child_links;

    CREATE POLICY "Parents view own links" ON parent_child_links FOR SELECT USING (auth.uid() = parent_id);
    CREATE POLICY "Students view own links" ON parent_child_links FOR SELECT USING (auth.uid() = child_id);
    CREATE POLICY "Parents can create links" ON parent_child_links FOR INSERT WITH CHECK (auth.uid() = parent_id);
    CREATE POLICY "Parents can delete links" ON parent_child_links FOR DELETE USING (auth.uid() = parent_id);
END $$;

-- RLS Policies for project_comments
DO $$
BEGIN
    DROP POLICY IF EXISTS "Parents manage own comments" ON project_comments;
    CREATE POLICY "Parents manage own comments" ON project_comments FOR ALL USING (auth.uid() = parent_id);
END $$;

-- RLS Policies for messages
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own messages" ON messages;
    DROP POLICY IF EXISTS "Users can send messages" ON messages;
    CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
END $$;

-- RLS Policies for notifications
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
    CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
END $$;

-- RLS Policies for parent_plans
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own plan" ON parent_plans;
    DROP POLICY IF EXISTS "Users can update own plan" ON parent_plans;
    CREATE POLICY "Users can view own plan" ON parent_plans FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can update own plan" ON parent_plans FOR ALL USING (auth.uid() = user_id);
END $$;

-- RLS Policies for parent_ai_chat_logs
DO $$
BEGIN
    DROP POLICY IF EXISTS "Parents manage own chat logs" ON parent_ai_chat_logs;
    CREATE POLICY "Parents manage own chat logs" ON parent_ai_chat_logs FOR ALL USING (auth.uid() = parent_id);
END $$;
