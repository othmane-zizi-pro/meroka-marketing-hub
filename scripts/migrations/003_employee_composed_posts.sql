-- Migration: 003_employee_composed_posts
-- Add source_type column to track employee-composed vs AI-generated posts

-- ============================================
-- POST SOURCE TYPE
-- ============================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'ai_generated';
-- Values: 'ai_generated' | 'employee_composed'

-- Add index for filtering by source type
CREATE INDEX IF NOT EXISTS idx_posts_source_type ON posts(source_type);

-- Add comment explaining the column
COMMENT ON COLUMN posts.source_type IS 'Tracks whether post was AI-generated or composed by employee. Values: ai_generated, employee_composed';
