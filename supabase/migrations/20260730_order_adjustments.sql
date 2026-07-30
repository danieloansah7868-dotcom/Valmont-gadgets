-- Adds admin-editable delivery adjustment fields to the orders table.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS estimated_delivery_date TEXT;

-- delivery_fee, total and admin_notes already exist in the base schema,
-- but keep the guards here for older deployments.
ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Optional index for filtering delayed/rescheduled orders.
CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery
    ON orders (estimated_delivery_date);
