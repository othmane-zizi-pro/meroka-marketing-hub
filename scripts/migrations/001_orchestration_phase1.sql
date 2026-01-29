-- Migration: 001_orchestration_phase1
-- Phase 1: Foundation for AI Post Generation Orchestration

-- ============================================
-- CAMPAIGN SCHEDULE CONFIGURATION
-- ============================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_cron TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'UTC';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS posts_per_employee INTEGER DEFAULT 3;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workflow_type TEXT DEFAULT 'simple';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workflow_config JSONB DEFAULT '{}';

-- ============================================
-- CAMPAIGN-EMPLOYEE ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_employees_campaign ON campaign_employees(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_employees_user ON campaign_employees(user_id);

-- ============================================
-- WORKFLOW EXECUTION LOGS (for monitoring/tuning)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  employee_id UUID REFERENCES users(id),
  workflow_type TEXT NOT NULL,
  step_name TEXT NOT NULL,
  model TEXT,
  prompt_version TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL, -- 'success' | 'error' | 'timeout'
  error_message TEXT,
  raw_input TEXT,
  raw_output TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_execution ON workflow_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_campaign ON workflow_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_employee ON workflow_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created ON workflow_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_model ON workflow_logs(model);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON workflow_logs(status);

-- ============================================
-- POST GENERATION METADATA
-- ============================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS execution_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS original_content TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edit_distance INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS time_to_approve_seconds INTEGER;

CREATE INDEX IF NOT EXISTS idx_posts_execution ON posts(execution_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE campaign_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- Campaign employees: users can view assignments in their account
CREATE POLICY "Users can view campaign employees in their account" ON campaign_employees
  FOR SELECT USING (
    campaign_id IN (
      SELECT ca.id FROM campaigns ca
      JOIN channels ch ON ca.channel_id = ch.id
      JOIN users u ON ch.account_id = u.account_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Workflow logs: users can view logs for their account's campaigns
CREATE POLICY "Users can view workflow logs in their account" ON workflow_logs
  FOR SELECT USING (
    campaign_id IN (
      SELECT ca.id FROM campaigns ca
      JOIN channels ch ON ca.channel_id = ch.id
      JOIN users u ON ch.account_id = u.account_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access campaign_employees" ON campaign_employees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access workflow_logs" ON workflow_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate edit distance (Levenshtein) between original and edited content
CREATE OR REPLACE FUNCTION calculate_edit_distance(original TEXT, edited TEXT)
RETURNS INTEGER AS $$
DECLARE
  len1 INTEGER := length(original);
  len2 INTEGER := length(edited);
BEGIN
  -- Simple approximation: character difference
  -- For production, consider pg_similarity extension
  RETURN abs(len1 - len2) + (
    SELECT COUNT(*)::INTEGER
    FROM generate_series(1, LEAST(len1, len2)) i
    WHERE substring(original from i for 1) != substring(edited from i for 1)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to calculate edit distance when post content changes
CREATE OR REPLACE FUNCTION update_post_edit_distance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_content IS NOT NULL AND NEW.content != NEW.original_content THEN
    NEW.edit_distance := calculate_edit_distance(NEW.original_content, NEW.content);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_post_edit_distance ON posts;
CREATE TRIGGER trigger_post_edit_distance
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_edit_distance();

-- Trigger to calculate time to approve
CREATE OR REPLACE FUNCTION update_time_to_approve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_at IS NOT NULL AND OLD.approved_at IS NULL THEN
    NEW.time_to_approve_seconds := EXTRACT(EPOCH FROM (NEW.approved_at - NEW.created_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_time_to_approve ON posts;
CREATE TRIGGER trigger_time_to_approve
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_time_to_approve();
