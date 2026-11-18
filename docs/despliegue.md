# Despliegue en el servidor

Guía para publicar CNID POS en un servidor Linux propio (por ejemplo el VPS de cdpanel / cd.com.py) con Node.js, PostgreSQL y Nginx detrás de Cloudflare. Al final hay una variante para **Setup Node.js App** de cPanel.

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
pm2 start "pnpm start" --name cnid-pos --cwd /var/www/apps/cnid-pos
pm2 save
pm2 startup   # seguir la instrucción que imprime para arrancar con el servidor
```

`pnpm start` escucha en `127.0.0.1` y en el puerto de `PORT`; no queda expuesto directamente a internet.

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
