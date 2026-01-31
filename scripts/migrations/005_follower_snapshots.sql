-- Follower Snapshots Table
-- Stores daily follower count snapshots for tracking growth over time

CREATE TABLE IF NOT EXISTS follower_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('x', 'linkedin')),
  follower_count INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Ensure one snapshot per platform per day
  CONSTRAINT unique_platform_day UNIQUE (platform, snapshot_date)
);

-- Index for efficient querying by platform and date range
CREATE INDEX IF NOT EXISTS idx_follower_snapshots_platform ON follower_snapshots(platform);
CREATE INDEX IF NOT EXISTS idx_follower_snapshots_date ON follower_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_follower_snapshots_platform_date ON follower_snapshots(platform, snapshot_date DESC);

-- Enable RLS
ALTER TABLE follower_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read snapshots
CREATE POLICY "Authenticated users can read follower snapshots"
  ON follower_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert (for now, will use service role later)
CREATE POLICY "Authenticated users can insert follower snapshots"
  ON follower_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE follower_snapshots IS 'Daily snapshots of follower counts for X and LinkedIn';
