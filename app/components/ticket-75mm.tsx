"use client"

import type { ServiceOrderType } from "@/lib/service-order-types"

// Ticket térmico de 75 mm con el formato del POS anterior de De la Casa:
// encabezado del local, número de orden, mesero y cliente, detalle con agregados y totales.

export interface TicketLine {
  quantity: number
  name: string
  price: number
  subtotal: number
  modifiers: Array<{ name: string; price: number }>
}

export interface TicketData {
  kind: "bill" | "sale"
  orderId: number | null
  saleId: number | null
  date: string
  orderType: ServiceOrderType
  tableLabel: string
  waiterName: string
  customerName: string
  customerRuc: string
  notes: string
  cashierName: string
  lines: TicketLine[]
  total: number
  paymentMethod?: string
  paymentMethodName?: string
  paymentStatus?: string
  cashReceived?: number
  change?: number
  copyNumber?: number
  /** Suma de productos; si no se indica es igual al total. */
  subtotal?: number
  deliveryFee?: number
  deliveryAddress?: string
  deliveryZone?: string
  courierName?: string
}

export interface TicketCompany {
  name: string
  ruc?: string
  address?: string
  city?: string
  phone?: string
}

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const typeLabel: Record<ServiceOrderType, string> = { dineIn: "En el local", delivery: "Delivery", pickup: "Retiro" }
const paymentLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", mixed: "Mixto" }

export function Ticket75mm({ data, company }: { data: TicketData; company: TicketCompany }) {
  const isBill = data.kind === "bill"
  const place = [company.address, company.city].filter(Boolean).join(" · ")
  return <article className="ticket-75 mx-auto w-full max-w-[300px] bg-white p-4 font-mono text-[12px] leading-snug text-black shadow-lg">
    <header className="border-b border-dashed border-black pb-2 text-center">
      <p className="text-base font-extrabold uppercase">{company.name || "Restaurante"}</p>
      {place && <p>{place}</p>}
      {company.phone && <p>Teléfono: {company.phone}</p>}
      {company.ruc && <p>RUC: {company.ruc}</p>}
    </header>

    <section className="border-b border-dashed border-black py-2">
      <p className="text-center text-sm font-extrabold">{isBill ? "PRECUENTA" : "COMPROBANTE DE PAGO"}</p>
      {data.orderId != null && <p className="text-center text-lg font-black">Orden #{data.orderId}</p>}
      {!isBill && data.saleId != null && <p className="text-center">Venta #{data.saleId}</p>}
      <p className="mt-1">{new Date(data.date).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {typeLabel[data.orderType] ?? data.orderType}</p>
      {data.tableLabel && <p>Mesa: {data.tableLabel}</p>}
      {data.waiterName && <p>Mesero: {data.waiterName}</p>}
      {data.customerName && data.customerName !== "Cliente General" && <p>Cliente: {data.customerName}</p>}
      {data.customerRuc && <p>RUC/CI: {data.customerRuc}</p>}
      {data.notes && <p>Nota: {data.notes}</p>}
      {data.orderType === "delivery" && (data.deliveryAddress || data.deliveryZone) && <p>Entrega: {[data.deliveryAddress, data.deliveryZone].filter(Boolean).join(" · ")}</p>}
      {data.courierName && <p>Repartidor: {data.courierName}</p>}
    </section>

    <table className="w-full border-b border-dashed border-black">
      <thead><tr className="border-b border-black text-left"><th className="w-6 py-1 pr-1">Cant</th><th className="py-1">Artículo</th><th className="py-1 text-right">Total</th></tr></thead>
      <tbody>
        {data.lines.map((line, index) => <tr key={index} className="align-top">
          <td className="py-1 pr-1">{line.quantity}</td>
          <td className="py-1 pr-1">
            <span className="font-bold">{line.name}</span>
            {line.quantity > 1 && <span className="block text-[11px]">{line.quantity} × {money(line.price)}</span>}
            {line.modifiers.map((modifier, i) => <span key={i} className="block pl-2 text-[11px]">+ {modifier.name}{modifier.price > 0 ? ` (${money(modifier.price)})` : ""}</span>)}
          </td>
          <td className="whitespace-nowrap py-1 text-right">{money(line.subtotal)}</td>
        </tr>)}
      </tbody>
    </table>

    <section className="space-y-0.5 border-b border-dashed border-black py-2">
      <p className="flex justify-between"><span>Subtotal:</span><span>{money(data.subtotal ?? data.total)}</span></p>
      {data.orderType === "delivery" && data.deliveryFee != null && <p className="flex justify-between"><span>Envío:</span><span>{data.deliveryFee ? money(data.deliveryFee) : "Gratis"}</span></p>}
      {!isBill && data.paymentMethod && <p className="flex justify-between"><span>Pago:</span><span>{data.paymentMethodName || paymentLabel[data.paymentMethod] || data.paymentMethod}{data.paymentStatus === "pending" ? " (a verificar)" : ""}</span></p>}
      {!isBill && data.paymentMethod === "cash" && data.cashReceived != null && <>
        <p className="flex justify-between"><span>Recibido:</span><span>{money(data.cashReceived)}</span></p>
        <p className="flex justify-between"><span>Saldo devuelto:</span><span>{money(data.change ?? 0)}</span></p>
      </>}
      <p className="flex justify-between pt-1 text-sm font-black"><span>TOTAL:</span><span>{money(data.total)}</span></p>
    </section>

    <footer className="pt-2 text-center">
      {isBill
        ? <><p className="font-bold">No válido como comprobante de pago</p>{(data.copyNumber ?? 1) > 1 && <p>Precuenta n.º {data.copyNumber}</p>}</>
        : <>{data.cashierName && <p>Atendido en caja por {data.cashierName}</p>}<p className="font-bold">¡Gracias por tu visita!</p></>}
    </footer>
  </article>
}

export const ticketPrintCss = `@media print {
  @page { size: 75mm auto; margin: 2mm; }
  html, body { width: 75mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
  .print-actions { display: none !important; }
  .ticket-75 { width: 71mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
}`
