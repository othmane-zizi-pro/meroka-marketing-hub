-- Table to store social media posts made through the app
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL, -- 'x', 'linkedin', 'instagram'
  content TEXT NOT NULL,
  media_url TEXT, -- URL of uploaded media (if any)
  external_id TEXT, -- Tweet ID, LinkedIn post ID, etc.
  external_url TEXT, -- Link to the post on the platform
  author_id UUID REFERENCES users(id),
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_social_posts_channel ON social_posts(channel);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_email);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);

-- Enable RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all posts
CREATE POLICY "Authenticated users can view social posts"
  ON social_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert their own posts
CREATE POLICY "Authenticated users can insert social posts"
  ON social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
