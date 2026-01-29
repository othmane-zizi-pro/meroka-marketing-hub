-- Agentic Marketing App - Full Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE platform_type AS ENUM ('linkedin', 'x', 'instagram', 'facebook', 'threads');
CREATE TYPE campaign_type AS ENUM ('employee_voices', 'continuous_engagement', 'product_launch', 'event', 'custom');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE post_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'published');
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'contributor', 'viewer');
CREATE TYPE reaction_type AS ENUM ('upvote', 'comment');

-- ============================================
-- ACCOUNTS (Top-level: Meroka, co-branded partners)
-- ============================================

CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_slug ON accounts(slug);

-- ============================================
-- USERS (Team members belonging to accounts)
-- ============================================

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'contributor',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, email)
);

CREATE INDEX idx_users_account ON users(account_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ============================================
-- CHANNELS (LinkedIn, X, Instagram per account)
-- ============================================

CREATE TABLE channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, platform)
);

CREATE INDEX idx_channels_account ON channels(account_id);
CREATE INDEX idx_channels_platform ON channels(platform);

-- ============================================
-- CAMPAIGNS (Within channels)
-- ============================================

CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type campaign_type NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  status campaign_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_channel ON campaigns(channel_id);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- POSTS (AI-generated content for approval)
-- ============================================

CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  status post_status DEFAULT 'draft',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_campaign ON posts(campaign_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_for);

-- ============================================
-- POST REACTIONS (Upvotes and comments)
-- ============================================

CREATE TABLE post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type reaction_type NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, type) -- One upvote per user per post
);

CREATE INDEX idx_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_reactions_user ON post_reactions(user_id);
CREATE INDEX idx_reactions_type ON post_reactions(type);

-- ============================================
-- WATCHED ACCOUNTS (For continuous engagement)
-- ============================================

CREATE TABLE watched_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  platform_handle TEXT NOT NULL,
  platform_user_id TEXT,
  name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, platform_handle)
);

CREATE INDEX idx_watched_channel ON watched_accounts(channel_id);
CREATE INDEX idx_watched_active ON watched_accounts(is_active);

-- ============================================
-- EXTERNAL POSTS (Fetched from watched accounts)
-- ============================================

CREATE TABLE external_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  watched_account_id UUID REFERENCES watched_accounts(id) ON DELETE CASCADE NOT NULL,
  platform_post_id TEXT NOT NULL,
  content TEXT,
  media_urls JSONB DEFAULT '[]',
  posted_at TIMESTAMPTZ,
  engagement_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(watched_account_id, platform_post_id)
);

CREATE INDEX idx_external_watched ON external_posts(watched_account_id);
CREATE INDEX idx_external_posted ON external_posts(posted_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_posts ENABLE ROW LEVEL SECURITY;

-- Users can read their own account data
CREATE POLICY "Users can view own account" ON accounts
  FOR SELECT USING (
    id IN (SELECT account_id FROM users WHERE auth_id = auth.uid())
  );

-- Users can view other users in their account
CREATE POLICY "Users can view account members" ON users
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM users WHERE auth_id = auth.uid())
  );

-- Users can view channels in their account
CREATE POLICY "Users can view account channels" ON channels
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM users WHERE auth_id = auth.uid())
  );

-- Users can view campaigns in their account's channels
CREATE POLICY "Users can view account campaigns" ON campaigns
  FOR SELECT USING (
    channel_id IN (
      SELECT c.id FROM channels c
      JOIN users u ON c.account_id = u.account_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Users can view posts in their account's campaigns
CREATE POLICY "Users can view account posts" ON posts
  FOR SELECT USING (
    campaign_id IN (
      SELECT ca.id FROM campaigns ca
      JOIN channels ch ON ca.channel_id = ch.id
      JOIN users u ON ch.account_id = u.account_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Users can create reactions on posts they can view
CREATE POLICY "Users can create reactions" ON post_reactions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can view reactions" ON post_reactions
  FOR SELECT USING (
    post_id IN (
      SELECT p.id FROM posts p
      JOIN campaigns ca ON p.campaign_id = ca.id
      JOIN channels ch ON ca.channel_id = ch.id
      JOIN users u ON ch.account_id = u.account_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access accounts" ON accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access channels" ON channels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access campaigns" ON campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access posts" ON posts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reactions" ON post_reactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access watched" ON watched_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access external" ON external_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get upvote count for a post
CREATE OR REPLACE FUNCTION get_post_upvotes(post_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM post_reactions
  WHERE post_id = post_uuid AND type = 'upvote';
$$ LANGUAGE SQL STABLE;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
CREATE TRIGGER update_accounts_timestamp BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_channels_timestamp BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaigns_timestamp BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_posts_timestamp BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_watched_timestamp BEFORE UPDATE ON watched_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
