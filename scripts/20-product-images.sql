-- Fotos de productos subidas desde la computadora, pegadas en base64 o descargadas de una URL.
-- Se guardan aparte del producto para que la lista del POS no cargue imágenes pesadas. Se aplica en cada esquema de restaurante.
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-f0-9]{24}$'),
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  data BYTEA NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
