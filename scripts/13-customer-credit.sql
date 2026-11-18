-- Crédito / cuenta corriente de clientes: se cobra «a cuenta» y el cliente paga después (semanal, quincenal o mensual).
-- El saldo se lleva en customers.balance y cada movimiento queda en customer_ledger (cargos, abonos y ajustes).
-- Se aplica en cada esquema de restaurante.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit BIGINT CHECK (credit_limit IS NULL OR credit_limit >= 0);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_billing_cycle_check;
ALTER TABLE customers ADD CONSTRAINT customers_billing_cycle_check CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly', 'none'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS customers_balance ON customers (balance) WHERE balance <> 0;

-- Pagos: además de cobrar ventas, registran abonos a la cuenta corriente (entran en la caja abierta).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'sale';
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purpose_check;
ALTER TABLE payments ADD CONSTRAINT payments_purpose_check CHECK (purpose IN ('sale', 'account'));

ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_kind_check;
ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_kind_check CHECK (kind IN ('cash', 'card', 'transfer', 'qr', 'other', 'credit'));
INSERT INTO payment_methods (code, name, kind, needs_verification, sort_order)
VALUES ('credit', 'Crédito (cuenta corriente)', 'credit', FALSE, 9) ON CONFLICT (code) DO NOTHING;

-- Movimientos de la cuenta: amount con signo (cargo +, abono −, ajuste ±) y saldo resultante.
CREATE TABLE IF NOT EXISTS customer_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('charge', 'payment', 'adjustment')),
  amount BIGINT NOT NULL CHECK (amount <> 0),
  balance_after BIGINT NOT NULL,
  sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
  payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  method TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  user_id BIGINT,
  user_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_ledger_customer ON customer_ledger (customer_id, created_at DESC);

CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON customer_ledger FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
