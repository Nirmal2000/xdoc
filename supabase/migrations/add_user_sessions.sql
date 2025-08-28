-- Add user_sessions table for database-only authentication
-- This completely eliminates cookie dependency for user tokens

CREATE TABLE IF NOT EXISTS xdoc.user_sessions (
  user_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  name VARCHAR(255),
  profile_image_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_session_id ON xdoc.user_sessions(user_session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON xdoc.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_expires_at ON xdoc.user_sessions(token_expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE xdoc.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for user sessions
CREATE POLICY "Allow anonymous access to user sessions" ON xdoc.user_sessions
  FOR ALL USING (true);