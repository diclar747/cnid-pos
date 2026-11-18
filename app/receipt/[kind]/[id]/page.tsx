"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "../../../components/protected-route"
import { Ticket75mm, ticketPrintCss, type TicketData } from "../../../components/ticket-75mm"
import { useCompany } from "../../../context/company-context"
import { apiRequest } from "@/lib/api-client"
import type { ServiceOrder } from "@/lib/service-order-types"

type SaleRecord = {
  id: number; date: string; total: number; orderType?: TicketData["orderType"]; paymentMethod: string
  cashReceived?: number; change?: number; customerName?: string; customerRuc?: string; userName?: string
  serviceOrderId?: number; tableLabel?: string; waiterName?: string; notes?: string
  items: Array<{ productName?: string; product?: { name: string }; quantity: number; price: number; subtotal?: number; modifiers?: Array<{ name: string; price: number }> }>
}

function fromOrder(order: ServiceOrder): TicketData {
  return {
    kind: "bill", orderId: order.id, saleId: null, date: order.billedAt ?? new Date().toISOString(), orderType: order.orderType,
    tableLabel: order.tableLabel, waiterName: order.waiterName, customerName: order.customerName, customerRuc: "",
    notes: order.notes, cashierName: "", total: order.total, copyNumber: order.billCount,
    lines: order.items.map((line) => ({ quantity: line.quantity, name: line.productName, price: line.price, subtotal: line.subtotal,
      modifiers: line.modifiers.map((modifier) => ({ name: modifier.name, price: modifier.price })) })),
  }
}

function fromSale(sale: SaleRecord): TicketData {
  return {
    kind: "sale", orderId: sale.serviceOrderId ?? null, saleId: sale.id, date: sale.date, orderType: sale.orderType ?? "dineIn",
    tableLabel: sale.tableLabel ?? "", waiterName: sale.waiterName ?? "", customerName: sale.customerName ?? "",
    customerRuc: sale.customerRuc ?? "", notes: sale.notes ?? "", cashierName: sale.userName ?? "", total: sale.total,
    paymentMethod: sale.paymentMethod, cashReceived: sale.cashReceived, change: sale.change,
    lines: sale.items.map((item) => ({ quantity: item.quantity, name: item.productName ?? item.product?.name ?? "Producto",
      price: item.price, subtotal: item.subtotal ?? item.price * item.quantity,
      modifiers: (item.modifiers ?? []).map((modifier) => ({ name: modifier.name, price: modifier.price })) })),
  }
}

export default function ReceiptPage() {
  const params = useParams<{ kind: string; id: string }>()
  const { companyConfig } = useCompany()
  const [data, setData] = useState<TicketData | null>(null)
  const [error, setError] = useState("")
  const printed = useRef(false)

  useEffect(() => {
    if (!["bill", "sale"].includes(params.kind) || !/^\d+$/.test(params.id)) { setError("Ticket inválido"); return }
    const load = params.kind === "bill"
      ? apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${params.id}`).then(({ order }) => fromOrder(order))
      : apiRequest<{ sale: SaleRecord }>(`/api/sales/${params.id}`).then(({ sale }) => fromSale(sale))
    load.then(setData).catch((problem) => setError(problem instanceof Error ? problem.message : "No se pudo abrir el ticket"))
  }, [params.kind, params.id])

  useEffect(() => {
    if (!data || printed.current || new URLSearchParams(window.location.search).get("auto") !== "1") return
    printed.current = true
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [data])

  return <ProtectedRoute requiredPermissions={["access_pos"]}><main className="min-h-screen bg-slate-100 p-4 sm:p-8">
    <div className="print-actions mx-auto mb-4 flex max-w-[300px] justify-between gap-2">
      <Button variant="outline" onClick={() => window.close()}><X className="mr-2 h-4 w-4" /> Cerrar</Button>
      <Button onClick={() => window.print()} disabled={!data}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
    </div>
    {error && <p className="mx-auto max-w-[300px] rounded-lg bg-red-100 p-4 text-red-800">{error}</p>}
    {!data && !error && <p className="text-center">Cargando ticket…</p>}
    {data && <Ticket75mm data={data} company={{ name: companyConfig.name, ruc: companyConfig.ruc, address: companyConfig.address, city: companyConfig.city, phone: companyConfig.phone }} />}
    <style jsx global>{ticketPrintCss}</style>
  </main></ProtectedRoute>
}
