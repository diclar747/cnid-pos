# CNID POS

Next.js 15, React 19, TypeScript, Tailwind CSS y PostgreSQL local. El paquete se gestiona con pnpm.

## Desarrollo

`pnpm install`, `pnpm db:setup`, `pnpm dev`. La conexión se configura mediante `DATABASE_URL` en `.env.local`, tomando `.env.example` como referencia. Las tablas se crean con `scripts/03-local-postgres.sql`.

## Estructura

- `app/api`: autenticación y acceso del servidor a PostgreSQL. La venta y la compra actualizan stock dentro de transacciones.
- `lib/db.ts`: pool PostgreSQL del servidor.
- `lib/auth.ts`: sesiones y contraseñas.
- `app/context`: estado de la interfaz y llamadas a las API.
- `app/admin`, `app/pos`, `app/checkout`: pantallas principales.

Mantener las credenciales de la base solo en archivos locales ignorados por Git. Los componentes del navegador acceden a los datos mediante las rutas API.
