-- Add RLS policy for users to update their own voice samples
-- Users can only update/insert records where email matches their auth email

-- Policy for users to read their own samples
CREATE POLICY "Users can read own samples" ON employee_voice_samples
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Policy for users to insert their own samples
CREATE POLICY "Users can insert own samples" ON employee_voice_samples
  FOR INSERT TO authenticated
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Policy for users to update their own samples
CREATE POLICY "Users can update own samples" ON employee_voice_samples
  FOR UPDATE TO authenticated
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Note: The existing "Allow authenticated users to read samples" policy
-- allows reading all samples (needed for admin/service purposes)
-- The new policies allow self-service updates
