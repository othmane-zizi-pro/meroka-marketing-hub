-- Add organization columns to linkedin_connections table
ALTER TABLE linkedin_connections ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE linkedin_connections ADD COLUMN IF NOT EXISTS organization_name TEXT;
