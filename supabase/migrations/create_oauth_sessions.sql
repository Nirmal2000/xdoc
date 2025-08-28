-- Create oauth_sessions table for X OAuth flow
-- This replaces cookie-based session storage with database storage
-- to fix iframe third-party cookie issues in production

CREATE TABLE IF NOT EXISTS xdoc.oauth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL,
  code_verifier VARCHAR(255) NOT NULL,
  return_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add index for efficient lookups by session_id
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_session_id ON xdoc.oauth_sessions(session_id);

-- Add index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON xdoc.oauth_sessions(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE xdoc.oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for OAuth flow
CREATE POLICY "Allow anonymous access to oauth sessions" ON xdoc.oauth_sessions
  FOR ALL USING (true);