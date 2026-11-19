-- WhatsApp: videos, documentos y stickers (entrantes y enviados desde el chat del POS) y nombre del archivo.
-- Se aplica en cada esquema de restaurante.
ALTER TABLE wa_messages DROP CONSTRAINT IF EXISTS wa_messages_kind_check;
ALTER TABLE wa_messages ADD CONSTRAINT wa_messages_kind_check CHECK (kind IN ('text', 'audio', 'image', 'location', 'other', 'video', 'document', 'sticker'));
ALTER TABLE wa_media ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT '';
