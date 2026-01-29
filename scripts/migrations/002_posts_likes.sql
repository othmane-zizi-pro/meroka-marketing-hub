-- Add columns to posts table for the Employee Voices campaign
-- and create a simpler likes system

-- Add columns to posts if they don't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS original_content TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS execution_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Create post_likes table (simpler than post_reactions for internal likes)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_email);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

-- Enable RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Policies for post_likes
CREATE POLICY "Anyone can view likes" ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT TO authenticated
  WITH CHECK (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can unlike their own" ON post_likes FOR DELETE TO authenticated
  USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Service role full access likes" ON post_likes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies for post_comments
CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment" ON post_comments FOR INSERT TO authenticated
  WITH CHECK (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE TO authenticated
  USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Service role full access comments" ON post_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to update likes_count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update likes count
DROP TRIGGER IF EXISTS trigger_update_likes_count ON post_likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();
