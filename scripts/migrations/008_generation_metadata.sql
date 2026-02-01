-- Migration: Add generation_metadata column to post_drafts
-- This stores full LLM Council orchestration details for AI-generated posts

ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS generation_metadata JSONB;

-- Add index for querying posts with generation metadata
CREATE INDEX IF NOT EXISTS idx_post_drafts_generation_metadata
ON post_drafts USING GIN (generation_metadata)
WHERE generation_metadata IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN post_drafts.generation_metadata IS 'Stores full LLM Council orchestration details including prompt, candidates, winner selection, and judge reasoning';
