-- Table to store LinkedIn OAuth connections
CREATE TABLE IF NOT EXISTS linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  linkedin_user_id TEXT,
  linkedin_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_user ON linkedin_connections(user_email);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_expires ON linkedin_connections(expires_at);

-- Enable RLS
ALTER TABLE linkedin_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view own LinkedIn connections"
  ON linkedin_connections
  FOR SELECT
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');

-- Policy: Users can insert/update their own connections
CREATE POLICY "Users can manage own LinkedIn connections"
  ON linkedin_connections
  FOR ALL
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email')
  WITH CHECK (user_email = auth.jwt() ->> 'email');
