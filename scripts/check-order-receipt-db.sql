-- Check receipt data for order in database
-- Usage: Run this query in your Supabase SQL editor

SELECT 
    id,
    status,
    paid_at,
    stripe_payment_intent_id,
    stripe_charge_id,
    stripe_receipt_url,
    stripe_receipt_number,
    service_type,
    created_at,
    updated_at
FROM orders 
WHERE id = '17c0fa0b-c436-4dbe-a764-abaa20930b92';
