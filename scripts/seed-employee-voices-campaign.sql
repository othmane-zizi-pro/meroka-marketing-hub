-- Create Meroka account, LinkedIn channel, and Employee Voices campaign
-- Also assign all real employees to the campaign

-- 1. Create the Meroka account
INSERT INTO accounts (id, name, slug, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Meroka',
  'meroka',
  '{"mission": "Saving independence in medicine", "tagline": "Collective power, individual control"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- 2. Create the LinkedIn channel
INSERT INTO channels (id, account_id, platform, name, settings, is_active)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'linkedin',
  'Meroka LinkedIn',
  '{"posting_guidelines": "Professional but authentic, mission-driven"}'::jsonb,
  true
)
ON CONFLICT (account_id, platform) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 3. Create the Employee Voices campaign
INSERT INTO campaigns (id, channel_id, name, type, description, settings, status, schedule_cron, schedule_timezone, posts_per_employee, workflow_type, workflow_config)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'Employee Voices',
  'employee_voices',
  'Showcase Meroka team members'' thought leadership and authentic voices on LinkedIn. Posts are AI-generated based on each employee''s style and expertise, then reviewed and approved before publishing.',
  '{"auto_approve": false, "require_approval": true}'::jsonb,
  'active',
  '0 7,12 * * *',  -- 7 AM and 12 PM UTC
  'America/New_York',
  1,  -- 1 post per schedule run (so 2 per day total at 7 AM and 12 PM)
  'complex',
  '{"generate_media": false, "selection_method": "llm_judge", "models": ["gemini", "openai", "grok"]}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  settings = EXCLUDED.settings,
  status = EXCLUDED.status,
  schedule_cron = EXCLUDED.schedule_cron,
  schedule_timezone = EXCLUDED.schedule_timezone,
  posts_per_employee = EXCLUDED.posts_per_employee,
  workflow_type = EXCLUDED.workflow_type,
  workflow_config = EXCLUDED.workflow_config,
  updated_at = NOW();

-- 4. Create users for each real employee and assign to campaign
-- First, create users in the users table
INSERT INTO users (id, account_id, email, name, role)
SELECT
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001',
  email,
  CASE
    WHEN email = 'clara.caden@meroka.com' THEN 'Clara Caden'
    WHEN email = 'othmane.zizi@meroka.com' THEN 'Othmane Zizi'
    WHEN email = 'alexandra.kiekensarana@meroka.com' THEN 'Alexandra Kiekens'
    WHEN email = 'bonniesylvie.rwemalika@meroka.com' THEN 'Bonnie Rwemalika'
    WHEN email = 'antoine.bertrand@meroka.com' THEN 'Antoine Bertrand'
    WHEN email = 'alex@meroka.com' THEN 'Alex Barrett'
    WHEN email = 'felix.gagne@meroka.com' THEN 'Félix Gagné'
    WHEN email = 'jeanvianney.cordeiro@meroka.com' THEN 'Jean Vianney'
    WHEN email = 'junjian.li@meroka.com' THEN 'Junjian Li'
    WHEN email = 'nigel.albert@meroka.com' THEN 'Nigel Albert'
    ELSE email
  END,
  'contributor'
FROM employee_voice_samples
WHERE is_sample = false
ON CONFLICT (account_id, email) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- 5. Assign all real employees to the Employee Voices campaign
INSERT INTO campaign_employees (campaign_id, user_id, is_active)
SELECT
  'e0000000-0000-0000-0000-000000000001',
  u.id,
  true
FROM users u
WHERE u.account_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (campaign_id, user_id) DO UPDATE SET
  is_active = true;

-- Verify the setup
SELECT 'Account' as entity, name, slug FROM accounts WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Channel', name, platform::text FROM channels WHERE id = 'c0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Campaign', name, type::text FROM campaigns WHERE id = 'e0000000-0000-0000-0000-000000000001';

SELECT 'Employees assigned:' as info, COUNT(*)::text as count FROM campaign_employees WHERE campaign_id = 'e0000000-0000-0000-0000-000000000001';
