// `next build` con una línea de progreso periódica.
// El panel cdpanel interrumpe el despliegue si el build pasa 5 minutos sin imprimir nada,
// y `next build` queda en silencio mientras compila con 1 vCPU. Este envoltorio lo evita.
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

process.env.NEXT_TELEMETRY_DISABLED = "1"

// Rama `panel`: GitHub Actions ya compiló (.github/workflows/panel-build.yml).
if (existsSync(".next/PREBUILT") && existsSync(".next/BUILD_ID")) {
  console.log(`Build precompilado en GitHub (commit ${readFileSync(".next/PREBUILT", "utf8").trim().slice(0, 7)}); no se vuelve a compilar.`)
  process.exit(0)
}
const started = Date.now()
const timer = setInterval(() => {
  console.log(`… compilando (${Math.round((Date.now() - started) / 1000)} s)`)
}, 45_000)

const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build", ...process.argv.slice(2)], {
  stdio: "inherit", env: process.env,
})
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => build.kill(signal))
build.on("exit", (code, signal) => {
  clearInterval(timer)
  console.log(`Build terminado en ${Math.round((Date.now() - started) / 1000)} s`)
  process.exit(code ?? (signal ? 1 : 0))
})
