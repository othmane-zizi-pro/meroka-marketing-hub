-- Migration: Create notifications table
-- This table stores notifications for users when someone likes or comments on posts about them

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,           -- Recipient email
  type TEXT NOT NULL,                 -- 'like', 'comment', 'reply'
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,          -- Who triggered the notification
  actor_name TEXT NOT NULL,           -- Name of the person who triggered it
  message TEXT,                       -- Human-readable message
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);

-- Index for faster queries by read status
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_email, is_read);

-- Index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email);

-- Policy: Authenticated users can create notifications
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
