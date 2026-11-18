-- WhatsApp (Baileys) y asistente Niro IA, por restaurante.
-- Las credenciales de la sesión se guardan en la base (el disco del servidor es de solo lectura).
-- Se aplica en cada esquema de restaurante.

CREATE TABLE IF NOT EXISTS whatsapp_session (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'qr', 'connected', 'logged_out', 'error')),
  phone TEXT NOT NULL DEFAULT '',
  push_name TEXT NOT NULL DEFAULT '',
  qr TEXT,
  qr_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO whatsapp_session (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Claves de cifrado de WhatsApp (creds y llaves de señal), serializadas con BufferJSON.
CREATE TABLE IF NOT EXISTS whatsapp_auth (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Actividad de la sesión: conexiones, desconexiones y errores.
CREATE TABLE IF NOT EXISTS whatsapp_session_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS whatsapp_session_log_recent ON whatsapp_session_log (created_at DESC);

CREATE TABLE IF NOT EXISTS wa_conversations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jid TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  bot_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  handoff_requested BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_user_id BIGINT REFERENCES public.app_users(id) ON DELETE SET NULL,
  assigned_name TEXT NOT NULL DEFAULT '',
  -- Carrito temporal del asistente: productos (id, cantidad, opciones), modalidad, dirección, zona y nombre.
  cart JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (JSONB_TYPEOF(cart) = 'object'),
  unread INTEGER NOT NULL DEFAULT 0 CHECK (unread >= 0),
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wa_conversations_recent ON wa_conversations (last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS wa_conversations_phone ON wa_conversations (phone) WHERE phone <> '';

CREATE TABLE IF NOT EXISTS wa_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  wa_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  author TEXT NOT NULL CHECK (author IN ('customer', 'bot', 'staff', 'system')),
  author_name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'audio', 'image', 'location', 'other')),
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('received', 'sent', 'failed', 'simulated')),
  order_id BIGINT REFERENCES service_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Evita procesar dos veces el mismo mensaje si WhatsApp lo reenvía.
CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_wa_id ON wa_messages (wa_id) WHERE wa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wa_messages_conversation ON wa_messages (conversation_id, created_at);

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS wa_conversation_id BIGINT REFERENCES wa_conversations(id) ON DELETE SET NULL;

-- Asistente Niro IA del restaurante.
CREATE TABLE IF NOT EXISTS ai_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  instructions TEXT NOT NULL DEFAULT '' CHECK (LENGTH(instructions) <= 4000),
  greeting TEXT NOT NULL DEFAULT '' CHECK (LENGTH(greeting) <= 600),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_interactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT REFERENCES wa_conversations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'transcription', 'simulator')),
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  model TEXT NOT NULL DEFAULT '',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_interactions_recent ON ai_interactions (created_at DESC);

CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON whatsapp_session FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT OR UPDATE OR DELETE ON wa_conversations FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
CREATE OR REPLACE TRIGGER restopos_live AFTER INSERT ON wa_messages FOR EACH ROW EXECUTE FUNCTION public.restopos_notify();
