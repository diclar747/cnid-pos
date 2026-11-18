-- Mesero asignado y precuenta de cada cuenta. Se aplica en public y en cada esquema restaurant_N.
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS waiter_id BIGINT REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS waiter_name TEXT NOT NULL DEFAULT '';
-- billed_at: última precuenta impresa. Se borra si después se agregan consumos.
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS bill_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS service_orders_waiter ON service_orders (waiter_id) WHERE status = 'open';
