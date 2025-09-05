-- X-Doctor Database Schema
-- Schema: xdoc

-- Enable the xdoc schema
CREATE SCHEMA IF NOT EXISTS xdoc;
SET search_path TO xdoc, public;

-- Ensure UUID generation function is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Grant permissions on schema
GRANT USAGE ON SCHEMA xdoc TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA xdoc TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA xdoc TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA xdoc TO anon, authenticated, service_role;

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA xdoc GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA xdoc GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA xdoc GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Users table
CREATE TABLE IF NOT EXISTS xdoc.users (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    profile_picture_url TEXT
);

-- Conversations table
CREATE TABLE IF NOT EXISTS xdoc.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES xdoc.users(user_id) ON DELETE CASCADE,
    experience_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS xdoc.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES xdoc.conversations(id) ON DELETE CASCADE,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON xdoc.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_experience_id ON xdoc.conversations(experience_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_experience ON xdoc.conversations(user_id, experience_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON xdoc.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON xdoc.messages(created_at);

-- Enable Row Level Security
ALTER TABLE xdoc.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE xdoc.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE xdoc.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "anon_all_users" ON xdoc.users
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "user_own_profile" ON xdoc.users
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        user_id = auth.jwt() ->> 'sub'
    );

-- Conversations policies
CREATE POLICY "anon_all_conversations" ON xdoc.conversations
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "user_own_conversations" ON xdoc.conversations
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        user_id = auth.jwt() ->> 'sub'
    );

-- Messages policies
CREATE POLICY "anon_all_messages" ON xdoc.messages
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "user_own_messages" ON xdoc.messages
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        conversation_id IN (
            SELECT id FROM xdoc.conversations
            WHERE user_id = auth.jwt() ->> 'sub'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION xdoc.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on conversations
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON xdoc.conversations
    FOR EACH ROW EXECUTE FUNCTION xdoc.update_updated_at_column();

-- Personas table
CREATE TABLE IF NOT EXISTS xdoc.personas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    userid TEXT NOT NULL REFERENCES xdoc.users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    persona_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for personas
CREATE INDEX IF NOT EXISTS idx_personas_userid ON xdoc.personas(userid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_userid_name ON xdoc.personas(userid, name);

-- Migration for existing databases where personas lacked a primary key
DO $$
BEGIN
  -- Only run if the table exists (older deployments)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'xdoc' AND table_name = 'personas'
  ) THEN
    -- Add id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'xdoc' AND table_name = 'personas' AND column_name = 'id'
    ) THEN
      ALTER TABLE xdoc.personas ADD COLUMN id UUID;
      UPDATE xdoc.personas SET id = gen_random_uuid() WHERE id IS NULL;
      -- Ensure future inserts get a generated UUID
      ALTER TABLE xdoc.personas ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE xdoc.personas ALTER COLUMN id SET NOT NULL;
      ALTER TABLE xdoc.personas ADD PRIMARY KEY (id);
    END IF;
  END IF;
END$$;

-- Enable RLS for personas
ALTER TABLE xdoc.personas ENABLE ROW LEVEL SECURITY;

-- Personas policies
CREATE POLICY "anon_all_personas" ON xdoc.personas
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "user_own_personas" ON xdoc.personas
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        userid = auth.jwt() ->> 'sub'
    );

-- Trigger to automatically update updated_at on personas
CREATE TRIGGER update_personas_updated_at
    BEFORE UPDATE ON xdoc.personas
    FOR EACH ROW EXECUTE FUNCTION xdoc.update_updated_at_column();
