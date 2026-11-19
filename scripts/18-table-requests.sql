-- Pedidos desde el QR de la mesa: además de «llamar al mozo» y «pedir la cuenta», la mesa puede pedir algo puntual
-- (servilletas, hielo…) y avisar un pedido nuevo que el personal acepta antes de mandarlo a cocina.
-- Se aplica en cada esquema de restaurante.
ALTER TABLE table_calls DROP CONSTRAINT IF EXISTS table_calls_kind_check;
ALTER TABLE table_calls ADD CONSTRAINT table_calls_kind_check CHECK (kind IN ('waiter', 'bill', 'request', 'order'));
ALTER TABLE table_calls ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
-- Un llamado abierto por mesa y tipo, salvo los pedidos puntuales (puede haber varios).
DROP INDEX IF EXISTS table_calls_one_open;
CREATE UNIQUE INDEX IF NOT EXISTS table_calls_one_open_kind ON table_calls (table_id, kind) WHERE status = 'open' AND kind IN ('waiter', 'bill', 'order');
