-- Tiempo real: cada cambio en órdenes, comandas, llamados de mesa y caja avisa por NOTIFY.
-- El servidor escucha el canal restopos_events y reenvía el aviso (solo al restaurante dueño) por SSE.
-- Se aplica en cada esquema de restaurante; la función es compartida en public.

CREATE OR REPLACE FUNCTION public.restopos_notify() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN row_id := (to_jsonb(OLD) ->> 'id'); ELSE row_id := (to_jsonb(NEW) ->> 'id'); END IF;
  PERFORM pg_notify('restopos_events', json_build_object('s', TG_TABLE_SCHEMA, 't', TG_TABLE_NAME, 'op', TG_OP, 'id', row_id)::text);
  RETURN NULL;
END $$;

CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON service_orders FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON kitchen_tickets FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON table_calls FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON cash_sessions FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON cash_movements FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();

-- Cocina: prioridad de la comanda (se muestra primero) y aviso de demora estimada.
ALTER TABLE kitchen_tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high'));
ALTER TABLE kitchen_tickets ADD COLUMN IF NOT EXISTS delay_minutes INTEGER CHECK (delay_minutes IS NULL OR delay_minutes BETWEEN 1 AND 240);
