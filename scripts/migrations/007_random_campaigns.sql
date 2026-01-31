-- Migration: 007_random_campaigns
-- Add support for Random campaigns that generate AI posts from historical posts

-- ============================================
-- ADD SOURCE_CONFIG TO CAMPAIGNS
-- For random campaign settings (source platform, limits, etc.)
-- ============================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS source_config JSONB DEFAULT '{}';

COMMENT ON COLUMN campaigns.source_config IS 'Configuration for random campaigns: source_platform, posts_limit, posts_per_run';

-- ============================================
-- ADD CAMPAIGN LINK TO POST_DRAFTS
-- Track which campaign generated the draft and what inspired it
-- ============================================

ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS inspiration_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_post_drafts_campaign ON post_drafts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_inspiration ON post_drafts(inspiration_post_id);

COMMENT ON COLUMN post_drafts.campaign_id IS 'Campaign that generated this draft (for random campaigns)';
COMMENT ON COLUMN post_drafts.inspiration_post_id IS 'Historical post used as inspiration for AI generation';

-- ============================================
-- SEED RANDOM CAMPAIGNS
-- LinkedIn and X random campaigns
-- ============================================

INSERT INTO campaigns (id, name, type, is_active, source_config, schedule_cron, schedule_timezone)
VALUES
  (gen_random_uuid(), 'Random LinkedIn', 'random', true,
   '{"source_platform": "linkedin", "posts_limit": 50, "posts_per_run": 5}'::jsonb,
   '0 * * * *', 'America/New_York'),
  (gen_random_uuid(), 'Random X', 'random', true,
   '{"source_platform": "x", "posts_limit": 50, "posts_per_run": 5}'::jsonb,
   '0 * * * *', 'America/New_York')
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER VIEW FOR RANDOM POSTS
-- Makes it easier to query random campaign posts with their inspiration
-- ============================================

CREATE OR REPLACE VIEW random_posts_with_inspiration AS
SELECT
  pd.*,
  c.name as campaign_name,
  c.source_config,
  sp.content as inspiration_content,
  sp.external_url as inspiration_url,
  sp.channel as inspiration_channel,
  sp.author_name as inspiration_author
FROM post_drafts pd
JOIN campaigns c ON pd.campaign_id = c.id
LEFT JOIN social_posts sp ON pd.inspiration_post_id = sp.id
WHERE c.type = 'random';

COMMENT ON VIEW random_posts_with_inspiration IS 'Convenience view for random campaign posts with their inspiration source';
