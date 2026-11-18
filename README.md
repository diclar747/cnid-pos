# RestoPOS

Sistema de punto de venta con Next.js y PostgreSQL local. No requiere servicios de base de datos externos.

## Requisitos

- Node.js y pnpm
- PostgreSQL en `localhost:5432`
- Una base de datos llamada `cnidpos`

## Preparación

1. Crear la base de datos si todavía no existe:

   ```sql
   CREATE DATABASE cnidpos;
   ```

2. Copiar `.env.example` a `.env.local` y completar la conexión `DATABASE_URL` con el usuario y la contraseña locales.
3. Ejecutar:

   ```powershell
   pnpm install
   pnpm db:setup
   pnpm dev
   ```

4. Abrir [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login).

`db:setup` crea las tablas y carga tres usuarios iniciales y un catálogo de productos solo cuando esas tablas están vacías. Se puede volver a ejecutar sin duplicar estos registros. Las ventas, compras, órdenes de compra, gastos, proveedores, usuarios, productos y datos de la empresa se guardan en PostgreSQL. El carrito se guarda por usuario en el navegador y se actualiza con los precios y el stock del catálogo al entrar. Las preferencias visuales y el estado plegado del menú también se mantienen en el navegador.

Para publicarlo en un servidor, seguí [docs/despliegue.md](docs/despliegue.md).

## Superadministración y restaurantes

Para crear la cuenta central una sola vez, ejecutá `pnpm db:superadmin` después de `pnpm db:setup`. El comando genera una contraseña aleatoria y la muestra solo al ejecutarse; cambiala desde **Mi perfil** después del primer acceso. Si ya existe una cuenta central, no modifica su contraseña. Se pueden definir `SUPERADMIN_EMAIL`, `SUPERADMIN_USERNAME`, `SUPERADMIN_NAME` y `SUPERADMIN_PASSWORD` antes de ejecutarlo.

El superadministrador inicia sesión en `/superadmin`. Desde allí crea restaurantes con una cuenta administradora inicial, edita sus datos, los suspende, reactiva o elimina de la operación. Eliminar conserva los datos para recuperación y bloquea el acceso. También puede publicar avisos generales o dirigidos a un restaurante. Los iconos de campaña, notificaciones, pantalla completa y avatar están en la cabecera del POS y del panel. **Mi perfil** permite editar nombre, email, usuario, foto y contraseña.

«De la Casa» permanece en el esquema `public` para conservar su historial. Cada restaurante nuevo recibe un esquema PostgreSQL `restaurant_ID` con productos, ventas, compras, órdenes, cocina, tarjetas QR y configuración independientes. Las cuentas y sesiones se guardan en `public` con asignación obligatoria a un restaurante. Suspender un restaurante invalida sus sesiones y bloquea nuevos accesos.

## Datos de demostración

Con la app corriendo, `pnpm db:demo` completa una base local para probar todos los roles. Crea el superadministrador si no existe, agrega a «De la Casa» proveedores, compras, gastos y 30 ventas de los últimos 14 días, y crea «Restaurante Demo» con su catálogo, usuarios, compras, gastos y 20 ventas. Se puede volver a ejecutar sin duplicar datos. Si la app no está en el puerto 3000, indicá `POS_ORIGIN` (por ejemplo `http://127.0.0.1:3100`).

| Restaurante | Rol | Email | Contraseña |
| --- | --- | --- | --- |
| — | Superadministrador | `superadmin@cnid.local` | `SuperDemo2026!` |
| De la Casa | Administrador | `admin@heroui.com` | `admin123` |
| De la Casa | Gerente | `manager@heroui.com` | `manager123` |
| De la Casa | Cajero | `user@heroui.com` | `user123` |
| De la Casa | Mesero | `dani@delacasa.local`, `cesar@delacasa.local` | `Mesero2026` |
| Restaurante Demo | Administrador | `demo@cnid.local` | `Demo2026cnid` |
| Restaurante Demo | Gerente | `gerente.demo@cnid.local` | `Gerente2026` |
| Restaurante Demo | Cajero | `cajero.demo@cnid.local` | `Cajero2026` |
| Restaurante Demo | Mesero | `mesero.demo@cnid.local` | `Mesero2026` |

Estas cuentas son solo para bases locales de prueba; no ejecutes `db:demo` en una base real.

## Operación diaria

1. En **Proveedores**, registrá RUC, dirección, teléfono, correo, contactos y condiciones comerciales.
2. En **Productos**, cargá nombre, precio, stock inicial y código QR o de barras. Podés usar la cámara del teléfono o un lector que escribe el código. Asigná el proveedor principal al producto.
3. En **Órdenes de compra**, elegí producto y proveedor, cantidad y costo. Crear una orden pendiente no modifica el stock. Al pulsar **Recibir**, la compra se registra y el stock aumenta una vez. Podés cancelar órdenes pendientes.
4. En el **Punto de venta**, el buscador superior toma el foco al abrir. Escribí el nombre y pulsá Enter, o escaneá un código que termina en Enter: el producto se agrega directamente al carrito. El icono de cámara está dentro del mismo buscador. Al confirmar una venta, PostgreSQL descuenta el stock en una transacción.

Los códigos QR generados por el sistema incluyen el código del producto y pueden completar nombre, precio y categoría al registrar uno nuevo. Un código externo solo identifica el producto; los demás datos se completan manualmente.

## Uso en teléfono e instalación PWA

La interfaz se adapta a teléfono y se puede instalar desde el navegador como aplicación. El manifiesto, los iconos y el service worker están incluidos. La pantalla sin conexión explica que el servidor local y PostgreSQL deben estar disponibles para registrar ventas; **no se guardan ventas sin conexión**.

Para abrirla desde un teléfono, ambos equipos deben estar en la misma red. Después de `pnpm build`:

```powershell
./scripts/setup-phone-cert.ps1 -LanAddress 192.168.51.55
pnpm phone:https
```

Reemplazá la IP del ejemplo si cambia la dirección privada de la computadora. El comando de preparación crea una autoridad local y un certificado para esa IP dentro de `.local-cert/`, excluido de Git. El servidor HTTPS escucha solo en esa IP, puerto `3443`, y usa la misma base PostgreSQL local. El teléfono abre `https://IP:3443/login`.

Para que el teléfono acepte HTTPS, copiá **solo** `.local-cert/ca.cer` al dispositivo e instalalo como certificado de confianza. En iPhone hay que activar además la confianza completa en **Ajustes → General → Información → Ajustes de confianza de certificados**. En Android se importa desde los ajustes de seguridad del sistema. Nunca copies ni compartas los archivos `.key`. Si el teléfono no conecta, verificá que ambos estén en la misma red y que Windows permita el puerto `3443` en la red privada.

La dirección `http://127.0.0.1:3000` solo sirve en la computadora. El acceso mediante IP local por HTTP no habilita cámara ni instalación PWA en el teléfono. No expongas PostgreSQL a la red; el teléfono solo necesita acceso al servidor web. Antes de permitir otros dispositivos, cambiá las contraseñas iniciales desde **Administración → Usuarios**.

Una vez configurado HTTPS local, en Android usá **Instalar aplicación** desde el menú del navegador; en iPhone, **Compartir → Agregar a pantalla de inicio**. El lector de códigos conectado a la computadora no necesita la cámara y funciona con el cursor del buscador.

La consulta opcional de RUC usa el servicio de CNID por internet. Si no está disponible, el nombre del cliente se puede ingresar manualmente y la venta se registra localmente.

## Datos de De la Casa

La instalación local actual contiene el catálogo y las ventas históricas del restaurante «De la Casa». La cuenta real de Julio tiene acceso de administrador y las cuentas de demostración están desactivadas. Cambiá la contraseña inicial desde **Administración → Usuarios**.

El flujo de cuentas abiertas, comandas, cocina, delivery y tarjetas QR está explicado en [Operación del restaurante](docs/operacion-restaurante.md).

En **Administración → Salones y mesas** se crean salones con foto y mesas con cantidad de sillas, forma y QR propio. Se pueden imprimir todos los QR para colocarlos en las mesas. El POS reconoce el QR en el buscador y abre la cuenta de esa mesa; el cliente puede escanearlo con su teléfono, elegir productos y agregados, consultar la cuenta y enviar el pedido a cocina. El pedido móvil está disponible en la red local HTTPS configurada arriba y se cobra en el local.

El análisis del respaldo, las reglas de conversión y los casos que requieren datos adicionales están en [docs/importacion-de-la-casa.md](docs/importacion-de-la-casa.md). El respaldo PostgreSQL anterior a la importación está en `.backups/` y queda fuera de Git.

En una base nueva, `pnpm db:setup` carga cuentas y productos de demostración para el primer arranque; no los agrega si ya existen usuarios o productos.

El esquema está en `scripts/03-local-postgres.sql`, la migración de restaurantes en `scripts/04-restaurants.sql`, las mesas en `scripts/05-dining.sql`, el mesero y la precuenta en `scripts/06-service-billing.sql`, y clientes, historial y delivery en `scripts/07-customers-delivery.sql`. El script de preparación es `scripts/setup-local-db.mjs`.

Para comprobar el flujo principal con la aplicación iniciada en `http://127.0.0.1:3000`, ejecutar `pnpm test:smoke`. Para incluir cuentas abiertas, cocina, aislamiento entre restaurantes, pedidos QR y el catálogo histórico, ejecutar `pnpm test:smoke:all`. Las pruebas crean cuentas y registros temporales, verifican su persistencia y los eliminan al terminar. Si preferís usar una cuenta administradora existente, podés definir `POS_TEST_EMAIL` y `POS_TEST_PASSWORD`; la prueba de restaurantes acepta `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`.
