-- Migration: Reconcile webhook_events schema
-- Created: 2026-06-11
-- Purpose: Migrations 021 and 023 both created webhook_events with conflicting
--          column names (event_id/payload vs stripe_event_id/payload_json).
--          Whichever ran first won (CREATE TABLE IF NOT EXISTS), leaving one of
--          the two Stripe webhook handlers querying nonexistent columns and
--          silently breaking idempotency. This normalizes any database to the
--          021 schema (event_id, payload), which both handlers now use.

DO $$
BEGIN
  -- Rename stripe_event_id -> event_id if a DB ended up with the 023 schema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'stripe_event_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE webhook_events RENAME COLUMN stripe_event_id TO event_id;
  END IF;

  -- Rename payload_json -> payload
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'payload_json'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'payload'
  ) THEN
    ALTER TABLE webhook_events RENAME COLUMN payload_json TO payload;
  END IF;
END $$;

-- Ensure the idempotency lookup index exists under the canonical name
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

COMMENT ON COLUMN webhook_events.event_id IS 'Unique identifier from the webhook provider (e.g., Stripe event ID)';
