-- Cuenta del cliente (consumidor): una sola cuenta para todos los restaurantes del marketplace.
-- Pide desde la web o desde el QR de la mesa, ve su historial y sigue el estado de cada pedido con avisos push.
-- Las tablas de cuentas viven en public; cada restaurante solo guarda a qué cuenta pertenece cada pedido.
-- Se aplica en cada esquema de restaurante (las tablas de public se crean una sola vez).

CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.customer_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_sessions_account ON public.customer_sessions (account_id);

CREATE TABLE IF NOT EXISTS public.customer_push (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS customer_push_account ON public.customer_push (account_id);

CREATE TABLE IF NOT EXISTS public.customer_order_links (
  restaurant_id BIGINT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (restaurant_id, order_id)
);
CREATE INDEX IF NOT EXISTS customer_order_links_account ON public.customer_order_links (account_id, created_at DESC);

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS customer_account_id BIGINT REFERENCES public.customer_accounts(id) ON DELETE SET NULL;
