// Formato de conversaciones y mensajes de WhatsApp para las respuestas de la API.

export const conversationRow = (row: any) => ({
  id: Number(row.id), phone: row.phone, name: row.name, botEnabled: row.bot_enabled, handoffRequested: row.handoff_requested,
  assignedName: row.assigned_name, unread: Number(row.unread), lastMessage: row.last_message,
  lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null, cartItems: Array.isArray(row.cart?.items) ? row.cart.items.length : 0,
  openOrders: Number(row.open_orders ?? 0),
  /** Versión de la foto de perfil (cambia cuando se actualiza); null si no tiene. */
  avatar: row.avatar_at ? new Date(row.avatar_at).getTime() : null,
})

export const messageRow = (row: any) => ({ id: Number(row.id), direction: row.direction, author: row.author, authorName: row.author_name, kind: row.kind,
  body: row.body, status: row.status, orderId: row.order_id == null ? null : Number(row.order_id), createdAt: new Date(row.created_at).toISOString(),
  media: row.media_id == null ? null : { id: Number(row.media_id), mime: String(row.media_mime ?? ""), seconds: row.media_seconds == null ? null : Number(row.media_seconds),
    fileName: String(row.media_file_name ?? ""), size: row.media_size == null ? null : Number(row.media_size) } })

/** Columnas de la conversación (sin datos binarios) + fecha de la foto de perfil si existe. */
export const CONVERSATION_COLUMNS = `c.id, c.jid, c.phone, c.name, c.bot_enabled, c.handoff_requested, c.assigned_name, c.unread, c.last_message, c.last_message_at, c.cart,
  (SELECT a.checked_at FROM wa_avatars a WHERE a.conversation_id = c.id AND a.data IS NOT NULL) AS avatar_at`
