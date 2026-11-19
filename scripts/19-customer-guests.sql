-- Cliente invitado: al escanear el QR del restaurante o de una mesa se crea una identidad en ese teléfono (sin registrarse).
-- Después puede guardar su cuenta con teléfono y contraseña. Tablas en public (se crean/ajustan una sola vez).
ALTER TABLE public.customer_accounts ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.customer_accounts ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;
