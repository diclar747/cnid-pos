import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { loadOrder, logOrderEvent, recordCustomerPurchase, ServiceOrderError, upsertCustomer, validOrderType } from "@/lib/service-order-server"
import type { OrderLine } from "@/lib/service-order-types"

export const runtime = "nodejs"

class CheckoutError extends Error {}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos") || !hasPermission(user, "manage_sales")) {
    return NextResponse.json({ error: "Sin permiso para registrar ventas." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const paymentMethod = body?.paymentMethod
  const serviceOrderId = body?.serviceOrderId == null ? null : Number(body.serviceOrderId)
  if (!["cash", "card", "transfer"].includes(paymentMethod) ||
    (serviceOrderId !== null && (!Number.isSafeInteger(serviceOrderId) || serviceOrderId <= 0))) {
    return NextResponse.json({ error: "Venta incompleta." }, { status: 400 })
  }

  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const serviceOrder = serviceOrderId ? await loadOrder(client, serviceOrderId, true) : null
    if (serviceOrder && serviceOrder.status !== "open") throw new CheckoutError("La orden ya fue cobrada o cancelada.")
    const rawItems = serviceOrder
      ? serviceOrder.items.map((line) => ({ id: line.productId, quantity: line.quantity, selectedModifiers: line.modifiers, snapshot: line }))
      : Array.isArray(body?.items) ? body.items : []
    const orderType = serviceOrder?.orderType ?? body?.orderType ?? "dineIn"
    if (!rawItems.length || !validOrderType(orderType)) throw new CheckoutError("Venta incompleta.")
    const quantities = new Map<number, number>()
    const stockNeeded = new Map<number, number>()
    const lines = new Map<number, Array<{ quantity: number; selectedModifiers: Array<{ groupId: number; optionId: number }>; snapshot: OrderLine | null }>>()
    for (const item of rawItems) {
      const id = Number(item?.id ?? item?.productId)
      const quantity = Number(item?.quantity)
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new CheckoutError("Un producto o cantidad no es válido.")
      }
      const selectedModifiers = Array.isArray(item?.selectedModifiers) ? item.selectedModifiers.map((modifier: { groupId?: unknown; optionId?: unknown }) => ({
        groupId: Number(modifier.groupId), optionId: Number(modifier.optionId),
      })) : []
      if (selectedModifiers.some((modifier: { groupId: number; optionId: number }) =>
        !Number.isSafeInteger(modifier.groupId) || !Number.isSafeInteger(modifier.optionId))) {
        throw new CheckoutError("Agregado inválido.")
      }
      const snapshot = serviceOrder ? (item as { snapshot: OrderLine }).snapshot : null
      quantities.set(id, (quantities.get(id) ?? 0) + quantity)
      stockNeeded.set(id, (stockNeeded.get(id) ?? 0) + (snapshot?.stockReserved ? 0 : quantity))
      lines.set(id, [...(lines.get(id) ?? []), { quantity, selectedModifiers, snapshot }])
    }
    const items = []
    let total = 0

    for (const [id] of [...quantities.entries()].sort((a, b) => a[0] - b[0])) {
      const result = await client.query(`SELECT id, data FROM products WHERE id = $1 FOR UPDATE`, [id])
      const product = result.rows[0]?.data
      const quantityToDeduct = stockNeeded.get(id) ?? 0
      if (!product || (product.isActive === false && quantityToDeduct > 0)) throw new CheckoutError(`El producto ${id} no está disponible.`)
      if (product.trackStock !== false && (!Number.isSafeInteger(product.stock) || product.stock < quantityToDeduct)) {
        throw new CheckoutError(`Stock insuficiente para ${product.name}.`)
      }
      const basePrice = product.pricesByOrderType?.[orderType] ?? product.price
      if (!serviceOrder && (!Number.isSafeInteger(basePrice) || basePrice < 0)) throw new CheckoutError("Precio de producto inválido.")

      for (const line of lines.get(id) ?? []) {
        const configured: Array<{ groupId: number; groupName: string; optionId: number; name: string; price: number }> = []
        if (line.snapshot) configured.push(...line.snapshot.modifiers)
        else {
          const groups = Array.isArray(product.modifierGroups) ? product.modifierGroups : []
          const distinctOptions = new Set(line.selectedModifiers.map((modifier) => `${modifier.groupId}:${modifier.optionId}`))
          if (distinctOptions.size !== line.selectedModifiers.length) throw new CheckoutError("Agregados duplicados.")
          for (const chosen of line.selectedModifiers) {
            const group = groups.find((entry: { legacyId: number }) => entry.legacyId === chosen.groupId)
            const option = group?.options?.find((entry: { legacyId: number }) => entry.legacyId === chosen.optionId)
            if (!group || !option || !Number.isSafeInteger(option.price) || option.price < 0) {
              throw new CheckoutError("Uno de los agregados no está disponible.")
            }
            configured.push({ groupId: group.legacyId, groupName: group.name,
              optionId: option.legacyId, name: option.name, price: option.price })
          }
          for (const group of groups) {
            const count = configured.filter((modifier) => modifier.groupId === group.legacyId).length
            if ((group.required && count === 0) || (!group.multiple && count > 1)) {
              throw new CheckoutError(`Elegí correctamente las opciones de ${group.name}.`)
            }
          }
        }
        const price = line.snapshot ? line.snapshot.price : basePrice + configured.reduce((sum, modifier) => sum + modifier.price, 0)
        const subtotal = price * line.quantity
        if (!Number.isSafeInteger(price) || price < 0 || (line.snapshot && subtotal !== line.snapshot.subtotal)) throw new CheckoutError("Importe de orden inválido.")
        total += subtotal
        if (!Number.isSafeInteger(total)) throw new CheckoutError("El total excede el límite permitido.")
        items.push({
          product: { id, name: line.snapshot?.productName ?? product.name, price },
          productId: id, productName: line.snapshot?.productName ?? product.name,
          quantity: line.quantity, price, subtotal, total: subtotal,
          modifiers: configured,
        })
      }

      if (product.trackStock !== false && quantityToDeduct > 0) {
        await client.query(
          `UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2`,
          [product.stock - quantityToDeduct, id],
        )
        await client.query(
          `INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id)
           VALUES ($1, $2, $3, 'sale', $4)`,
          [id, product.stock, product.stock - quantityToDeduct, Number(user.id)],
        )
      }
    }
    if (serviceOrder && total !== serviceOrder.total) throw new CheckoutError("El total de la orden cambió. Revisá la cuenta.")
    if (serviceOrder?.confirmation === "pending") throw new CheckoutError("Confirmá el pedido antes de cobrarlo.")

    // El envío se cobra aparte de los productos y entra en el total de la venta.
    const subtotal = total
    const deliveryFee = serviceOrder?.orderType === "delivery" ? serviceOrder.deliveryFee : 0
    const grandTotal = subtotal + deliveryFee
    const cashReceived = paymentMethod === "cash" ? Number(body.cashReceived) : grandTotal
    if (!Number.isSafeInteger(cashReceived) || cashReceived < grandTotal) {
      throw new CheckoutError("El monto recibido es insuficiente.")
    }

    const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 255) || serviceOrder?.customerName || "Cliente General" : serviceOrder?.customerName || "Cliente General"
    const customerRuc = typeof body.customerRuc === "string" ? body.customerRuc.trim().slice(0, 50) : ""
    const customerId = await upsertCustomer(client, { name: customerName, phone: serviceOrder?.customerPhone, ruc: customerRuc })
      ?? serviceOrder?.customerId ?? null
    const sale = {
      date: new Date().toISOString(),
      total: grandTotal,
      subtotal,
      deliveryFee,
      items,
      paymentMethod,
      orderType,
      customerName,
      customerRuc,
      customerId,
      ...(serviceOrder ? { serviceOrderId: serviceOrder.id, tableLabel: serviceOrder.tableLabel, cardCode: serviceOrder.cardCode,
        waiterId: serviceOrder.waiterId, waiterName: serviceOrder.waiterName, notes: serviceOrder.notes,
        deliveryZoneName: serviceOrder.deliveryZoneName, deliveryAddress: serviceOrder.deliveryAddress,
        courierName: serviceOrder.courierName, source: serviceOrder.source } : {}),
      cashReceived,
      change: cashReceived - grandTotal,
      userId: Number(user.id),
      userName: user.name,
    }
    const saved = await client.query(`INSERT INTO sales (data) VALUES ($1::jsonb) RETURNING id`, [JSON.stringify(sale)])
    await recordCustomerPurchase(client, customerId, grandTotal)
    if (serviceOrder) {
      await client.query(`UPDATE service_orders SET status = 'paid', sale_id = $1, customer_id = COALESCE(customer_id, $3),
        closed_at = NOW(), updated_at = NOW() WHERE id = $2`, [saved.rows[0].id, serviceOrder.id, customerId])
      await logOrderEvent(client, serviceOrder.id, "paid", { status: paymentMethod, note: `Venta #${saved.rows[0].id}`, actor: { id: user.id, name: user.name } })
    }
    await client.query("COMMIT")
    return NextResponse.json({ sale: { ...sale, id: Number(saved.rows[0].id) } }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK")
    if (error instanceof CheckoutError || error instanceof ServiceOrderError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error("Checkout failed", error)
    return NextResponse.json({ error: "No se pudo registrar la venta." }, { status: 500 })
  } finally {
    client.release()
  }
}
