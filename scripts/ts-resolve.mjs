// Permite ejecutar pruebas en TypeScript con Node (que ya entiende TS) usando las rutas del proyecto:
// imports relativos sin extensión y el alias «@/». Uso: node --conditions=react-server --import ./scripts/ts-resolve.mjs <archivo.ts>
import { register } from "node:module"
import { existsSync, statSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { join, resolve as resolvePath } from "node:path"
import { isMainThread } from "node:worker_threads"

const root = resolvePath(fileURLToPath(new URL("..", import.meta.url)))

export async function resolve(specifier, context, nextResolve) {
  // «server-only» solo marca módulos del servidor (Next.js lo resuelve internamente); fuera de Next es un módulo vacío.
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true }
  const candidates = []
  if (specifier.startsWith("@/")) candidates.push(join(root, specifier.slice(2)))
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) candidates.push(fileURLToPath(new URL(specifier, context.parentURL)))
  for (const base of candidates) {
    for (const file of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, join(base, "index.ts")]) {
      if (existsSync(file) && statSync(file).isFile()) return nextResolve(pathToFileURL(file).href, context)
    }
  }
  try { return await nextResolve(specifier, context) }
  catch (error) {
    // Paquetes CommonJS sin "exports" (por ejemplo next/headers) necesitan la extensión en ESM.
    if (error?.code === "ERR_MODULE_NOT_FOUND" && /^[^./][^:]*\/[^.]+$/.test(specifier)) return nextResolve(`${specifier}.js`, context)
    throw error
  }
}

if (isMainThread) register(import.meta.url)
