// Formato de conversaciones y mensajes de WhatsApp para las respuestas de la API.

export const conversationRow = (row: any) => ({
  id: Number(row.id), phone: row.phone, name: row.name, botEnabled: row.bot_enabled, handoffRequested: row.handoff_requested,
  assignedName: row.assigned_name, unread: Number(row.unread), lastMessage: row.last_message,
  lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null, cartItems: Array.isArray(row.cart?.items) ? row.cart.items.length : 0,
  openOrders: Number(row.open_orders ?? 0),
})

export const messageRow = (row: any) => ({ id: Number(row.id), direction: row.direction, author: row.author, authorName: row.author_name, kind: row.kind,
  body: row.body, status: row.status, orderId: row.order_id == null ? null : Number(row.order_id), createdAt: new Date(row.created_at).toISOString() })
