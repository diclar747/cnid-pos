-- WhatsApp: audios e imágenes guardados para escucharlos y verlos desde la bandeja,
-- y transcripción automática de audios configurable por restaurante.
-- Los archivos van en la base (el disco del servidor es de solo lectura).

CREATE TABLE IF NOT EXISTS wa_media (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id BIGINT REFERENCES wa_messages(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0),
  seconds INTEGER,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wa_media_message ON wa_media (message_id);
CREATE INDEX IF NOT EXISTS wa_media_created ON wa_media (created_at);

ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS media_id BIGINT REFERENCES wa_media(id) ON DELETE SET NULL;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS transcribe_audio BOOLEAN NOT NULL DEFAULT TRUE;

-- Foto de perfil de cada contacto (WhatsApp entrega enlaces que vencen: se guarda la imagen).
-- data NULL = el contacto no tiene foto o la oculta por privacidad; se vuelve a consultar cada 24 h.
CREATE TABLE IF NOT EXISTS wa_avatars (
  conversation_id BIGINT PRIMARY KEY REFERENCES wa_conversations(id) ON DELETE CASCADE,
  mime TEXT,
  data BYTEA,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery por ubicación: el cliente comparte su ubicación de WhatsApp y el pedido la guarda (enlace al mapa).
-- max_km: radio de cada zona desde el local (ubicación en la Ficha); con la ubicación del cliente se elige la zona.
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC(9, 6);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC(9, 6);
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS max_km NUMERIC(6, 2) CHECK (max_km IS NULL OR max_km > 0);
