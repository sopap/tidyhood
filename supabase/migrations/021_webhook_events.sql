-- Migration: Add webhook_events table for idempotent webhook processing
-- Created: 2025-10-06
-- Purpose: Store processed webhook events to prevent duplicate processing

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by event_id (idempotency check)
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);

-- Index for querying by event type
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);

-- Index for time-based queries
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at DESC);

-- Add comment
COMMENT ON TABLE webhook_events IS 'Stores processed webhook events for idempotency';
COMMENT ON COLUMN webhook_events.event_id IS 'Unique identifier from the webhook provider (e.g., Stripe event ID)';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of webhook event (e.g., payment_intent.succeeded)';
COMMENT ON COLUMN webhook_events.processed_at IS 'When the event was successfully processed';
COMMENT ON COLUMN webhook_events.payload IS 'Full webhook event payload for audit/debugging';

-- Enable RLS (only admins should access this table)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view webhook events
CREATE POLICY "webhook_events_admin_select"
  ON webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: System can insert webhook events (via service role)
CREATE POLICY "webhook_events_system_insert"
  ON webhook_events
  FOR INSERT
  WITH CHECK (true);

-- Add cleanup function to delete old webhook events (>90 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE processed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (run manually or via cron)
COMMENT ON FUNCTION cleanup_old_webhook_events IS 'Delete webhook events older than 90 days. Run periodically to maintain table size.';
