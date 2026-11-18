"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "../../../components/protected-route"
import { apiRequest } from "@/lib/api-client"
import type { KitchenTicket } from "@/lib/service-order-types"
import { useCompany } from "../../../context/company-context"

const typeLabel = { dineIn: "LOCAL", delivery: "DELIVERY", pickup: "RETIRO" }

export default function KitchenPrintPage() {
  const params = useParams<{ id: string }>()
  const { companyConfig } = useCompany()
  const [ticket, setTicket] = useState<KitchenTicket | null>(null)
  const [error, setError] = useState("")
  const printed = useRef(false)
  useEffect(() => {
    if (!/^\d+$/.test(params.id)) { setError("Comanda inválida"); return }
    apiRequest<{ ticket: KitchenTicket }>(`/api/kitchen-tickets/${params.id}`)
      .then(({ ticket }) => setTicket(ticket))
      .catch((problem) => setError(problem instanceof Error ? problem.message : "No se pudo abrir la comanda"))
  }, [params.id])
  useEffect(() => {
    if (!ticket || printed.current || new URLSearchParams(window.location.search).get("auto") !== "1") return
    printed.current = true
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [ticket])
  return <ProtectedRoute requiredPermissions={["access_pos"]}><main className="min-h-screen bg-slate-100 p-4 text-black sm:p-8">
    <div className="print-actions mx-auto mb-4 flex max-w-sm justify-between gap-2"><Button variant="outline" onClick={() => window.close()}><X className="mr-2 h-4 w-4" /> Cerrar</Button><Button onClick={() => window.print()} disabled={!ticket}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button></div>
    {error && <p className="mx-auto max-w-sm rounded-lg bg-red-100 p-4 text-red-800">{error}</p>}
    {!ticket && !error && <p className="text-center">Cargando comanda…</p>}
    {ticket && <article className="ticket mx-auto w-full max-w-sm bg-white p-5 font-mono text-sm shadow-lg">
      <div className="border-b-2 border-dashed border-black pb-3 text-center"><p className="text-lg font-extrabold uppercase">{companyConfig.name || "Restaurante"}</p><p className="text-xs">COMANDA DE COCINA</p><p className="mt-2 text-3xl font-black">#{ticket.orderId}</p><p>Ticket #{ticket.id} · {typeLabel[ticket.orderType]}</p></div>
      <div className="space-y-1 border-b-2 border-dashed border-black py-3"><p><strong>Fecha:</strong> {new Date(ticket.createdAt).toLocaleString("es-PY")}</p>{ticket.tableLabel && <p><strong>Mesa:</strong> {ticket.tableLabel}</p>}{ticket.waiterName && <p><strong>Mesero:</strong> {ticket.waiterName}</p>}{ticket.customerName && <p><strong>Cliente:</strong> {ticket.customerName}</p>}{ticket.cardCode && <p><strong>Tarjeta:</strong> {ticket.cardCode.slice(-6)}</p>}</div>
      <div className="space-y-4 border-b-2 border-dashed border-black py-4">{ticket.items.map((line) => <div key={line.lineId}><div className="flex gap-3 text-base font-extrabold"><span>{line.quantity}×</span><span>{line.productName}</span></div>{line.modifiers.map((option) => <p key={`${option.groupId}-${option.optionId}`} className="pl-7 text-xs">+ {option.name}</p>)}</div>)}</div>
      {ticket.notes && <div className="border-b-2 border-dashed border-black py-3"><strong>NOTAS:</strong><p className="mt-1 whitespace-pre-wrap">{ticket.notes}</p></div>}
      <p className="pt-4 text-center text-xs">Preparar · revisar · marcar listo</p>
    </article>}
    <style jsx global>{`@media print { @page { size: 80mm auto; margin: 3mm; } html, body { width: 80mm !important; margin: 0 !important; padding: 0 !important; background: white !important; } .print-actions { display: none !important; } .ticket { width: 74mm !important; max-width: none !important; margin: 0 !important; padding: 1mm !important; box-shadow: none !important; } }`}</style>
  </main></ProtectedRoute>
}
