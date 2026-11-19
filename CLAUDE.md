# RestoPOS

Next.js 15, React 19, TypeScript, Tailwind CSS y PostgreSQL local. El paquete se gestiona con pnpm.

## Desarrollo

`pnpm install`, `pnpm db:setup`, `pnpm dev`. La conexión se configura mediante `DATABASE_URL` en `.env.local`, tomando `.env.example` como referencia. Las tablas se crean con `scripts/03-local-postgres.sql`.

## Estructura

- `app/api`: autenticación y acceso del servidor a PostgreSQL. La venta y la compra actualizan stock dentro de transacciones.
- `lib/db.ts`: pool PostgreSQL del servidor.
- `lib/auth.ts`: sesiones y contraseñas.
- `app/context`: estado de la interfaz y llamadas a las API.
- `app/admin`, `app/pos`, `app/checkout`: pantallas principales; `app/crm` (tablero en vivo), `app/cash` (caja), `app/kitchen`, `app/table/[code]` (QR de mesa).
- Un esquema PostgreSQL por restaurante; migraciones por restaurante en `scripts/06…20-*.sql`, registradas en `scripts/setup-local-db.mjs` y `lib/restaurant-admin.ts`.
- `app/components/workspace-shell.tsx`: marco único (encabezado + «Opciones») para POS, WhatsApp, Pedidos, Órdenes, Cocina, Tarjetas QR, Mesas y Caja; las secciones ponen buscador o categorías con `WorkspaceSlot`. Apariencia del restaurante (logo, portada, color, encabezado) en `app/admin/company/branding-panel.tsx` y `/api/brand/[kind]`.
- Productos: fotos aparte en `product_images` (`lib/product-images.ts`, `/api/product-images`, descarga segura de URLs), grupos de opciones compartidos en `/api/product-groups`.
- `lib/cash.ts` (caja y pagos) y `lib/credit.ts` (cuenta corriente: cargos, abonos y ajustes); el cobro se hace en `app/components/payment-dialog.tsx`.
- `lib/marketplace.ts` + `app/marketplace`: vitrina pública de restaurantes activos con ficha y menú (pedido por WhatsApp).
- Cuenta del cliente (consumidor): `lib/customer-account.ts` (sesión `restopos_customer`, aparte del personal), `lib/customer-orders.ts` (pedido web como «Nuevo» en Pedidos, historial y seguimiento), páginas `/cuenta` y `/cuenta/pedidos/[ref]`. QR del restaurante `/r/[slug]`: entra como invitado sin registrarse (cookie de 400 días que se renueva), elige su mesa y pide; después puede guardar su cuenta con teléfono; tablas en public (`customer_accounts`, `customer_order_links`, `customer_push`).
- `lib/order-flow.ts`: flujo de estados de comandas y avisos al cliente (push y WhatsApp). `lib/realtime.ts` + `/api/events`: tiempo real (LISTEN/NOTIFY + SSE).
- `lib/whatsapp/*`: sesiones Baileys (credenciales en la base), bandeja y asistente; `lib/niro.ts`: única llamada a Niro IA (`NIRO_API_KEY` solo en el servidor). La IA propone acciones y el servidor valida precios, opciones y zonas.
- Pruebas: `scripts/smoke-*.mjs` contra la app corriendo (`POS_ORIGIN`), `pnpm test:push` y `pnpm test:whatsapp` (Niro y WhatsApp simulados).

Mantener las credenciales de la base solo en archivos locales ignorados por Git. Los componentes del navegador acceden a los datos mediante las rutas API.
