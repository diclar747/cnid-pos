# Despliegue en el servidor

Guía para publicar RestoPOS en un servidor Linux propio (por ejemplo el VPS de cdpanel / cd.com.py) con Node.js, PostgreSQL y Nginx detrás de Cloudflare. Al final hay una variante para **Setup Node.js App** de cPanel.

## 1. Requisitos en el servidor

- Node.js 20 o superior (`node -v`).
- pnpm: `corepack enable && corepack prepare pnpm@latest --activate`.
- PostgreSQL 14 o superior, solo accesible desde el propio servidor.
- Un gestor de procesos: PM2 (`npm i -g pm2`) o systemd.
- Un subdominio apuntando al servidor, por ejemplo `pos.tudominio.com.py`, con HTTPS (Cloudflare o Let's Encrypt). La cámara, el lector QR y la PWA **requieren HTTPS**.

## 2. Base de datos

```bash
sudo -u postgres psql -c "CREATE USER cnidpos WITH PASSWORD 'CAMBIAR_POR_UNA_CLAVE_LARGA';"
sudo -u postgres psql -c "CREATE DATABASE cnidpos OWNER cnidpos;"
```

## 3. Código y configuración

```bash
cd /var/www/apps
git clone https://github.com/diclar747/cnid-pos.git
cd cnid-pos
git checkout main
```

Crear `/var/www/apps/cnid-pos/.env.local` (no se sube a Git):

```env
DATABASE_URL=postgresql://cnidpos:CAMBIAR_POR_UNA_CLAVE_LARGA@127.0.0.1:5432/cnidpos
SESSION_COOKIE_SECURE=true
PORT=3000
```

`SESSION_COOKIE_SECURE=true` hace que la cookie de sesión viaje solo por HTTPS. No la actives si accedés por `http://`.

## 4. Instalar, preparar la base y compilar

```bash
pnpm install --frozen-lockfile
pnpm db:setup        # crea/actualiza tablas en todos los restaurantes; se puede repetir
pnpm db:superadmin   # crea la cuenta central y muestra su contraseña una sola vez
pnpm build
```

`db:setup` en una base vacía crea tres cuentas de ejemplo (`admin@heroui.com`, `manager@heroui.com`, `user@heroui.com`) con contraseñas conocidas. **En producción cambiá sus contraseñas o desactivalas apenas entres.** No ejecutes `pnpm db:demo` en el servidor: carga usuarios y ventas de prueba.

### Carta de De la Casa

El export del POS anterior está en `.legacy-export/` y no se sube a Git (contiene datos del negocio). Copialo desde la PC y aplicalo:

```bash
# desde la PC
scp .legacy-export/de-la-casa-export.json usuario@servidor:/var/www/apps/cnid-pos/.legacy-export/
# en el servidor
node scripts/import-legacy-export.mjs              # vista previa
node scripts/import-legacy-export.mjs --apply      # 309 productos, agregados, salón y mesas
```

Las fotos de los platos ya están en el repositorio (`public/menu-legacy`, `public/menu-web`).

## 5. Ejecutar como servicio

Con PM2:

```bash
pm2 start "pnpm start:local" --name cnid-pos --cwd /var/www/apps/cnid-pos
pm2 save
pm2 startup   # seguir la instrucción que imprime para arrancar con el servidor
```

`pnpm start:local` escucha en `127.0.0.1` y en el puerto de `PORT`; no queda expuesto directamente a internet. (`pnpm start` escucha en todas las interfaces: es para contenedores como el del panel.)

## 6. Nginx

```nginx
server {
    listen 80;
    server_name pos.tudominio.com.py;

    client_max_body_size 10m;   # fotos de salones y avatares

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Con Cloudflare en modo **Full (strict)**, instalá un certificado de origen o de Let's Encrypt (`certbot --nginx -d pos.tudominio.com.py`) y escuchá también en 443.

## 7. Actualizar a una versión nueva

```bash
cd /var/www/apps/cnid-pos
git pull
pnpm install --frozen-lockfile
pnpm db:setup        # aplica migraciones nuevas sin borrar datos
pnpm build
pm2 restart cnid-pos
```

Antes de actualizar, respaldá la base: `pg_dump -Fc cnidpos > ~/respaldos/cnidpos-$(date +%F).dump`.

## Panel cdpanel (cd.com.py)

El panel corre cada sitio en un contenedor Node 22: clona el repositorio, ejecuta `npm ci`, `npm run build` y `npm prune --omit=dev`, y arranca la app con `PORT=8080`. El plan básico no tiene SSH, así que `scripts/panel-start.mjs` hace en cada arranque lo que en un servidor propio se corre a mano: migraciones, cuentas iniciales y carga de la carta. El build no necesita la base.

1. **Sitio:** en **Sitios y aplicaciones**, el sitio tiene que ser de tipo **Node.js**. Si se creó como estático, no se puede cambiar: borralo y crealo de nuevo como Node.js con el mismo dominio.
2. **Base de datos:** en **Bases de datos → PostgreSQL**, creá una base (por ejemplo `cnidpos`). El panel le agrega un prefijo (`cd_usr…_cnidpos`), el usuario es ese nombre con `_u` y la contraseña **se muestra una sola vez**: copiala. El host es `postgres`, puerto `5432`.
3. **Variables del sitio** (pestaña Variables; al guardar se recrea el contenedor):

   | Variable | Valor |
   | --- | --- |
   | `APP_ENTRY` | `scripts/panel-start.mjs` |
   | `DATABASE_URL` | `postgresql://USUARIO:CONTRASEÑA@postgres:5432/BASE` |
   | `SESSION_COOKIE_SECURE` | `true` |
   | `SEED_SAMPLE_DATA` | `false` (no crea cuentas ni productos de ejemplo) |
   | `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_NAME` | Administrador de «De la Casa». Solo se usa si la base no tiene usuarios. `INITIAL_ADMIN_PASSWORD` (10+ caracteres) es opcional: si falta, se genera y se muestra **una vez** en **Registros**. |
   | `SUPERADMIN_EMAIL` | Cuenta central; solo se crea si no existe. `SUPERADMIN_PASSWORD` (14+ caracteres) es opcional: si falta, se genera y se muestra una vez en **Registros**. |

   Después del primer arranque podés borrar las variables de contraseña: las cuentas ya quedan en la base.
4. **Despliegue:** URL `https://github.com/diclar747/cnid-pos` (sin credenciales), rama **`panel`**. El panel compila con 1 vCPU y corta a los 10 minutos, y `next build` no entra; por eso se despliega la rama `panel`, que ya trae `.next` compilado: el panel solo instala dependencias (~3 min) y `scripts/build.mjs` omite la compilación al ver `.next/PREBUILT`. El repositorio es público; si vuelve a ser privado, el panel necesita un token cargado desde el botón **Git** de la tarjeta del sitio.

   **Actualizar la rama `panel`:** cada push a `main` la regenera con GitHub Actions (`.github/workflows/panel-build.yml`). Si Actions no está disponible, compilala a mano y publicala, y después tocá **Volver a desplegar**:

   ```bash
   git clone --depth 1 https://github.com/diclar747/cnid-pos.git /tmp/cnid-panel && cd /tmp/cnid-panel
   npm ci && npm run build
   rm -rf .next/cache && git rev-parse HEAD > .next/PREBUILT
   git checkout --orphan panel && git add -A && git add -f .next
   git commit -m "Build para el panel" && git push -f origin panel
   ```
5. **Carta de De la Casa:** con **Administrador de archivos**, en la carpeta del sitio creá `data/` y subí `de-la-casa-export.json` (está en la PC, en `.legacy-export/`). Reiniciá el sitio (no vuelvas a desplegar, porque un despliegue reemplaza la carpeta): al arrancar se importa una sola vez. Las actualizaciones posteriores no la vuelven a importar ni pisan los cambios hechos desde la administración.
6. **Probar:** `https://restopos.cd.com.py/login` con el administrador inicial; crear una cuenta, enviar a cocina, imprimir la precuenta y cobrar.

En ejecución el plan básico da 512 MB de RAM y 0,25 vCPU: alcanza, pero va justo. El contenedor tiene el disco de solo lectura; la app guarda todo (incluidas fotos de salones y avatares) en PostgreSQL.

## Variante: cPanel «Setup Node.js App»

1. En cPanel → **PostgreSQL Databases**, creá la base y el usuario, y asignale todos los privilegios.
2. En **Git Version Control**, cloná `https://github.com/diclar747/cnid-pos.git` (rama `main`).
3. En **Setup Node.js App**: versión 20+, *Application root* = carpeta del repositorio, *Application URL* = el subdominio, *Startup file* = `node_modules/next/dist/bin/next` con argumento `start`, y las variables `DATABASE_URL`, `SESSION_COOKIE_SECURE=true`.
4. Desde la terminal de cPanel, dentro del entorno de la app: `npm i -g pnpm`, `pnpm install`, `pnpm db:setup`, `pnpm db:superadmin`, `pnpm build`, y reiniciá la app.

Si el plan de hosting no ofrece PostgreSQL o Node.js 20, hace falta un VPS.

## Verificación

- `https://pos.tudominio.com.py/login` abre e inicia sesión.
- Crear una cuenta en una mesa, enviar a cocina, imprimir la precuenta y cobrar.
- Con la app iniciada en el puerto 3000, `node scripts/smoke-local.mjs` comprueba el flujo principal (crea y borra registros temporales).
