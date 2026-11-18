-- Caja y pagos: medios de pago configurables, sesiones de caja (apertura, cierre y arqueo),
-- movimientos (ventas, ingresos y egresos) y pagos con verificación de transferencias.
-- Se aplica en cada esquema de restaurante.

CREATE TABLE IF NOT EXISTS payment_methods (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z0-9_]{2,30}$'),
  name TEXT NOT NULL CHECK (LENGTH(name) BETWEEN 1 AND 60),
  kind TEXT NOT NULL CHECK (kind IN ('cash', 'card', 'transfer', 'qr', 'other')),
  needs_verification BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payment_methods (code, name, kind, needs_verification, sort_order) VALUES
  ('cash', 'Efectivo', 'cash', FALSE, 0),
  ('card', 'Tarjeta', 'card', FALSE, 1),
  ('transfer', 'Transferencia', 'transfer', TRUE, 2),
  ('qr', 'QR / billetera', 'qr', TRUE, 3)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS cash_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_amount BIGINT NOT NULL CHECK (opening_amount >= 0),
  opened_by BIGINT,
  opened_by_name TEXT NOT NULL DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by BIGINT,
  closed_by_name TEXT NOT NULL DEFAULT '',
  closed_at TIMESTAMPTZ,
  expected_cash BIGINT,
  counted_cash BIGINT CHECK (counted_cash IS NULL OR counted_cash >= 0),
  difference BIGINT,
  summary JSONB,
  notes TEXT NOT NULL DEFAULT ''
);
-- Una sola caja abierta por restaurante.
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open ON cash_sessions ((status)) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS cash_sessions_opened ON cash_sessions (opened_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES service_orders(id) ON DELETE SET NULL,
  session_id BIGINT REFERENCES cash_sessions(id) ON DELETE RESTRICT,
  method TEXT NOT NULL,
  method_name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'other',
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  reference TEXT NOT NULL DEFAULT '',
  created_by BIGINT,
  created_by_name TEXT NOT NULL DEFAULT '',
  verified_by BIGINT,
  verified_by_name TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  verify_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_status ON payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_session ON payments (session_id);
CREATE INDEX IF NOT EXISTS payments_sale ON payments (sale_id);

CREATE TABLE IF NOT EXISTS cash_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES cash_sessions(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  method TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  user_id BIGINT,
  user_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cash_movements_session ON cash_movements (session_id, created_at);
