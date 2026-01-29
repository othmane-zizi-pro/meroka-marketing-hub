-- Add is_active column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- To deactivate a campaign:
-- UPDATE campaigns SET is_active = false WHERE name = 'Campaign Name';

-- To reactivate a campaign:
-- UPDATE campaigns SET is_active = true WHERE name = 'Campaign Name';

-- Current status: Employee Voices is inactive
-- UPDATE campaigns SET is_active = false WHERE name ILIKE '%employee%voices%';
