-- Imagen del restaurante: logo y foto de portada que elige el dueño (encabezado del sistema, marketplace y tickets).
-- Se guardan aparte de la ficha para no cargar imágenes en cada pantalla. Se aplica en cada esquema de restaurante.
CREATE TABLE IF NOT EXISTS brand_assets (
  kind TEXT PRIMARY KEY CHECK (kind IN ('logo', 'cover')),
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  data BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
