-- El asistente vuelve solo a una conversación que tomó el personal cuando nadie responde en ese tiempo (0 = nunca).
-- Se aplica en cada esquema de restaurante.
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS resume_after_minutes INTEGER NOT NULL DEFAULT 30 CHECK (resume_after_minutes BETWEEN 0 AND 1440);
