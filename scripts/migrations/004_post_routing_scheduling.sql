-- Migration: 004_post_routing_scheduling
-- Add post drafts with routing (direct/proofreading/scheduled), edit history, and user timezone

-- ============================================
-- POST DRAFTS TABLE
-- Stores posts before publishing with routing options
-- ============================================

CREATE TABLE IF NOT EXISTS post_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Content
  content TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'x' | 'linkedin' | 'instagram'
  media_url TEXT,
  media_type TEXT,

  -- Original author (always credited, cannot be changed)
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,

  -- Routing
  route TEXT NOT NULL DEFAULT 'direct', -- 'direct' | 'proofreading' | 'scheduled'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'rejected'

  -- Scheduling (for route='scheduled')
  scheduled_for TIMESTAMPTZ,
  scheduled_timezone TEXT DEFAULT 'America/New_York',

  -- Proofreading tracking
  current_content TEXT, -- Current version after edits (null = same as content)
  last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_edited_at TIMESTAMPTZ,

  -- Approval (only original author can approve)
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Publishing
  published_at TIMESTAMPTZ,
  external_id TEXT,
  external_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_post_drafts_author ON post_drafts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_status ON post_drafts(status);
CREATE INDEX IF NOT EXISTS idx_post_drafts_route ON post_drafts(route);
CREATE INDEX IF NOT EXISTS idx_post_drafts_scheduled ON post_drafts(scheduled_for) WHERE route = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_post_drafts_channel ON post_drafts(channel);
CREATE INDEX IF NOT EXISTS idx_post_drafts_created ON post_drafts(created_at DESC);

-- ============================================
-- POST EDIT HISTORY TABLE
-- Tracks all edits made during proofreading
-- ============================================

CREATE TABLE IF NOT EXISTS post_edit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Reference to post draft
  post_draft_id UUID NOT NULL REFERENCES post_drafts(id) ON DELETE CASCADE,

  -- Editor info
  editor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  editor_email TEXT NOT NULL,
  editor_name TEXT NOT NULL,

  -- Content changes
  previous_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edit_summary TEXT, -- Optional description of changes

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_edit_history_post ON post_edit_history(post_draft_id);
CREATE INDEX IF NOT EXISTS idx_post_edit_history_editor ON post_edit_history(editor_id);
CREATE INDEX IF NOT EXISTS idx_post_edit_history_created ON post_edit_history(created_at DESC);

-- ============================================
-- USER TIMEZONE PREFERENCE
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

COMMENT ON COLUMN users.timezone IS 'User timezone for displaying scheduled posts (IANA timezone format)';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on post_drafts
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view drafts
CREATE POLICY "Users can view all post drafts"
  ON post_drafts FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can create drafts
CREATE POLICY "Users can create post drafts"
  ON post_drafts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Any authenticated user can update drafts (for editing during proofreading)
CREATE POLICY "Users can update post drafts"
  ON post_drafts FOR UPDATE
  TO authenticated
  USING (true);

-- Only author can delete their draft
CREATE POLICY "Authors can delete their post drafts"
  ON post_drafts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Enable RLS on post_edit_history
ALTER TABLE post_edit_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view edit history
CREATE POLICY "Users can view edit history"
  ON post_edit_history FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can add to edit history
CREATE POLICY "Users can add edit history"
  ON post_edit_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_post_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_drafts_updated_at ON post_drafts;
CREATE TRIGGER post_drafts_updated_at
  BEFORE UPDATE ON post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_drafts_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE post_drafts IS 'Posts waiting to be published - supports direct posting, proofreading, and scheduling';
COMMENT ON COLUMN post_drafts.route IS 'Routing destination: direct (publish now), proofreading (team review), scheduled (future publish)';
COMMENT ON COLUMN post_drafts.status IS 'Current status in workflow: draft, pending_review, approved, scheduled, published, rejected';
COMMENT ON COLUMN post_drafts.current_content IS 'Latest version after edits. NULL means content unchanged from original';
COMMENT ON TABLE post_edit_history IS 'Audit trail of all edits made during proofreading process';
