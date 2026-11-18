// Arranque para el panel de hosting cdpanel (contenedor node:22, sin SSH).
// Configurar en el sitio la variable APP_ENTRY=scripts/panel-start.mjs.
//
// En cada arranque:
//   1. aplica migraciones (setup-local-db, no borra datos);
//   2. crea el superadministrador si SUPERADMIN_EMAIL está definido y no existe (sin contraseña, la genera);
//   3. importa la carta de De la Casa si existe el archivo y todavía no se cargó;
//   4. inicia Next.js en 0.0.0.0:$PORT (el panel usa PORT=8080).
import { spawn, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), ".."))
process.env.NEXT_TELEMETRY_DISABLED = "1"

if (!process.env.DATABASE_URL) {
  console.error("Falta la variable DATABASE_URL en el sitio (Variables del panel).")
  process.exit(1)
}

function run(script, args = []) {
  console.log(`> node ${script} ${args.join(" ")}`.trim())
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", env: process.env })
  if (result.status !== 0) {
    console.error(`${script} terminó con error (${result.status ?? result.signal}).`)
    process.exit(1)
  }
}

run("scripts/setup-local-db.mjs")
// Sin SUPERADMIN_PASSWORD, create-superadmin genera una contraseña y la muestra una sola vez.
if (process.env.SUPERADMIN_EMAIL) run("scripts/create-superadmin.mjs")
const exportFile = process.env.LEGACY_EXPORT_FILE || "data/de-la-casa-export.json"
if (existsSync(exportFile)) run("scripts/import-legacy-export.mjs", [exportFile, "--apply", "--if-empty"])

const port = process.env.PORT || "8080"
console.log(`> next start -H 0.0.0.0 -p ${port}`)
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit", env: process.env,
})
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.kill(signal))
server.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
