-- Create employee_voice_samples table for storing sample posts used for AI few-shotting
CREATE TABLE IF NOT EXISTS employee_voice_samples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  example_post_1 TEXT NOT NULL,
  example_post_2 TEXT NOT NULL,
  example_post_3 TEXT NOT NULL,
  blurb TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE employee_voice_samples ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all samples
CREATE POLICY "Allow authenticated users to read samples" ON employee_voice_samples
  FOR SELECT TO authenticated USING (true);

-- Create policy for service role to manage samples
CREATE POLICY "Allow service role full access" ON employee_voice_samples
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_voice_samples_email ON employee_voice_samples(email);

-- Add index on is_sample for filtering
CREATE INDEX IF NOT EXISTS idx_employee_voice_samples_is_sample ON employee_voice_samples(is_sample);
