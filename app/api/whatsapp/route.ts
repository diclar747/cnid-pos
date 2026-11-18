import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema, db } from "@/lib/db"
import { niroConfigured } from "@/lib/niro"
import { sessionSocket } from "@/lib/whatsapp/session"

export const runtime = "nodejs"

// Estado de WhatsApp y del asistente del restaurante.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const schema = await currentSchema()
  const [session, logs, ai, usage, counts] = await Promise.all([
    db.query("SELECT * FROM whatsapp_session WHERE id = 1").then((result) => result.rows[0]),
    db.query("SELECT event, detail, created_at FROM whatsapp_session_log ORDER BY created_at DESC LIMIT 25"),
    db.query("SELECT enabled, instructions, greeting, transcribe_audio, updated_at FROM ai_settings WHERE id = 1").then((result) => result.rows[0]),
    db.query(`SELECT COUNT(*) FILTER (WHERE status = 'ok' AND kind = 'chat') AS replies, COUNT(*) FILTER (WHERE status = 'error') AS errors,
        COUNT(*) FILTER (WHERE kind = 'transcription' AND status = 'ok') AS transcriptions, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens,
        COALESCE(AVG(latency_ms) FILTER (WHERE status = 'ok' AND kind = 'chat'), 0) AS latency
      FROM ai_interactions WHERE created_at > NOW() - INTERVAL '30 days'`).then((result) => result.rows[0]),
    db.query(`SELECT COUNT(*) AS conversations, COALESCE(SUM(unread), 0) AS unread, COUNT(*) FILTER (WHERE handoff_requested) AS handoffs
      FROM wa_conversations WHERE jid NOT LIKE 'simulator:%' AND last_message_at IS NOT NULL`).then((result) => result.rows[0]),
  ])
  const manage = hasPermission(user, "manage_company")
  return NextResponse.json({
    session: { enabled: Boolean(session?.enabled), status: session?.status ?? "disconnected", live: Boolean(sessionSocket(schema)), phone: session?.phone ?? "",
      pushName: session?.push_name ?? "", qr: manage ? session?.qr ?? null : null, qrAt: session?.qr_at ?? null, connectedAt: session?.connected_at ?? null, lastError: session?.last_error ?? "" },
    logs: manage ? logs.rows.map((row) => ({ event: row.event, detail: row.detail, createdAt: new Date(row.created_at).toISOString() })) : [],
    ai: { enabled: Boolean(ai?.enabled), instructions: ai?.instructions ?? "", greeting: ai?.greeting ?? "", transcribeAudio: ai?.transcribe_audio !== false, configured: niroConfigured() },
    usage: { replies: Number(usage.replies), errors: Number(usage.errors), transcriptions: Number(usage.transcriptions), tokens: Number(usage.tokens), latencyMs: Math.round(Number(usage.latency)) },
    counts: { conversations: Number(counts.conversations), unread: Number(counts.unread), handoffs: Number(counts.handoffs) },
    canManage: manage,
  })
}
