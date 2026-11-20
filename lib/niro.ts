import "server-only"

// NiroService: único punto de contacto con la API de Niro IA (https://niro.cnid.com.py/docs).
// La API key vive solo en el servidor (NIRO_API_KEY); nunca se envía al navegador ni se registra en logs.
// Endpoints usados, según la documentación pública:
//   POST /api/v1/chat/completions   { messages: [{ role, content }] } → choices[0].message.content, usage
//   POST /api/v1/audio/transcriptions  multipart "file" → { text }
//   GET  /api/v1/models?category=CHAT → { models: [...] }
// Errores: { error: { message } } con 400, 401 (key inválida), 402 (sin saldo), 404, 502.

export class NiroError extends Error {
  status: number
  constructor(message: string, status = 502) { super(message); this.status = status }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }
export type ChatResult = { content: string; model: string; promptTokens: number; completionTokens: number; latencyMs: number }

const baseUrl = () => (process.env.NIRO_BASE_URL || "https://niro.cnid.com.py/api/v1").replace(/\/+$/, "")
export const niroConfigured = () => Boolean(process.env.NIRO_API_KEY?.trim())

async function call(path: string, init: RequestInit & { timeoutMs?: number }) {
  const key = process.env.NIRO_API_KEY?.trim()
  if (!key) throw new NiroError("La IA no está configurada: falta NIRO_API_KEY en el servidor.", 503)
  const started = Date.now()
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(init.timeoutMs ?? 45_000) })
  } catch (error) {
    throw new NiroError(error instanceof Error && error.name === "TimeoutError" ? "Niro IA tardó demasiado en responder." : "No se pudo conectar con Niro IA.")
  }
  const text = await response.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { /* respuesta no JSON */ }
  if (!response.ok) {
    const message = body?.error?.message || body?.error || `Error ${response.status}`
    const friendly = response.status === 401 ? "La API key de Niro es inválida o fue revocada."
      : response.status === 402 ? "La organización de Niro no tiene saldo de créditos." : `Niro IA: ${String(message).slice(0, 200)}`
    throw new NiroError(friendly, response.status)
  }
  return { body, latencyMs: Date.now() - started }
}

export async function niroChat(messages: ChatMessage[], options: { timeoutMs?: number } = {}): Promise<ChatResult> {
  const { body, latencyMs } = await call("/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }), timeoutMs: options.timeoutMs })
  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== "string") throw new NiroError("Niro IA devolvió una respuesta vacía.")
  return { content, model: String(body?.model ?? ""), promptTokens: Number(body?.usage?.prompt_tokens ?? 0),
    completionTokens: Number(body?.usage?.completion_tokens ?? 0), latencyMs }
}

export async function niroTranscribe(audio: Buffer, filename = "audio.ogg", mimeType = "audio/ogg"): Promise<{ text: string; latencyMs: number }> {
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), filename)
  const { body, latencyMs } = await call("/audio/transcriptions", { method: "POST", body: form, timeoutMs: 60_000 })
  return { text: String(body?.text ?? "").trim(), latencyMs }
}

export async function niroModels(): Promise<{ name: string; category: string }[]> {
  const { body } = await call("/models?category=CHAT", { method: "GET", timeoutMs: 15_000 })
  return Array.isArray(body?.models) ? body.models.map((model: any) => ({ name: String(model.name ?? ""), category: String(model.category ?? "") })) : []
}

/**
 * OCR / visión: POST /vision/extract (multipart "file", "mode", "question").
 * mode="invoice" devuelve la factura paraguaya como JSON (emisor, comprobante, ítems y totales) en `data`.
 * Acepta PNG, JPG, WEBP, GIF (máx. 12 MB) o PDF con texto seleccionable.
 */
export async function niroVisionExtract(file: Buffer, filename: string, mimeType: string, mode: "text" | "invoice" = "invoice", question?: string):
  Promise<{ text: string; data: any; model: string; latencyMs: number }> {
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(file)], { type: mimeType }), filename)
  form.append("mode", mode)
  if (question) form.append("question", question)
  const { body, latencyMs } = await call("/vision/extract", { method: "POST", body: form, timeoutMs: 90_000 })
  let data = body?.data ?? null
  if (!data && typeof body?.text === "string") {
    // Algunos modelos devuelven el JSON dentro del texto (a veces entre ```json … ```).
    const raw = body.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
    try { data = JSON.parse(raw) } catch { data = null }
  }
  return { text: String(body?.text ?? ""), data, model: String(body?.model ?? ""), latencyMs }
}
