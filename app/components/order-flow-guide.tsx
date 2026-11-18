"use client"

import { useEffect, useState } from "react"
import { ChevronDown, CircleHelp } from "lucide-react"

// Guía del recorrido de un pedido en el tablero: qué hace el local en cada columna y qué aviso recibe el cliente.

const STEPS = [
  { title: "1. Nuevos", tone: "bg-fuchsia-500", what: "Llegan los pedidos de WhatsApp (o la web) que todavía no aceptaste. Abrí la tarjeta y revisá productos, dirección o ubicación y total.",
    action: "«Confirmar y enviar» lo acepta y lo manda a Cocina. Si no podés hacerlo (no hay un producto, fuera de zona), «Cancelar» con el motivo.",
    customer: "Recibe «Pedido confirmado» o el rechazo con el motivo." },
  { title: "2. Pendientes", tone: "bg-amber-500", what: "Cuentas del local (mesa, mostrador) con productos cargados que todavía no se enviaron a cocina.",
    action: "«Confirmar y enviar» manda esos productos a Cocina como una comanda.", customer: "—" },
  { title: "3. Confirmados", tone: "bg-sky-500", what: "La comanda está en Cocina esperando que la tomen.",
    action: "Cocina toca «Aceptar» (o desde acá «Aceptar en cocina»). Si falta algo, en Cocina «Falta» avisa al cliente qué producto no hay; «+10 min» avisa una demora; «Urgente» lo pone primero.",
    customer: "Recibe «Pedido en preparación», y los avisos de demora o falta." },
  { title: "4. En cocina", tone: "bg-orange-500", what: "Se está preparando.", action: "Cuando está terminado: «Marcar listo».",
    customer: "Recibe «¡Pedido listo!» (para retirar, servir o enviar)." },
  { title: "5. Listos → En delivery", tone: "bg-emerald-500", what: "Delivery: en el detalle asigná el repartidor (ve la dirección y «Ver en el mapa» si el cliente compartió su ubicación).",
    action: "«Salió el delivery». Retiro o mesa: «Entregado» / «Servido» directamente.", customer: "Recibe «Tu pedido va en camino» con el nombre del repartidor." },
  { title: "6. Entregados y cobro", tone: "bg-slate-500", what: "Pedido entregado. Si todavía no se cobró, la tarjeta dice «Por cobrar».",
    action: "«Cobrar» desde el detalle (efectivo, tarjeta, transferencia o QR). Las transferencias quedan para verificar en Caja.", customer: "Recibe «Pedido entregado»." },
]

export function OrderFlowGuide() {
  const [open, setOpen] = useState(false)
  useEffect(() => { try { setOpen(window.localStorage.getItem("restopos-flow-guide") !== "closed") } catch { setOpen(true) } }, [])
  const toggle = () => setOpen((current) => {
    try { window.localStorage.setItem("restopos-flow-guide", current ? "closed" : "open") } catch { /* sin almacenamiento */ }
    return !current
  })
  return <section className="rounded-xl border bg-white dark:bg-slate-900">
    <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold">
      <span className="flex items-center gap-2"><CircleHelp className="h-4 w-4 text-indigo-600" />¿Cómo funciona? Recorrido de un pedido, qué hacés vos y qué recibe el cliente</span>
      <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="grid gap-2 border-t p-3 sm:grid-cols-2 xl:grid-cols-3">
      {STEPS.map((step) => <article key={step.title} className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
        <h3 className="flex items-center gap-2 text-sm font-bold"><span className={`h-2 w-2 rounded-full ${step.tone}`} />{step.title}</h3>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{step.what}</p>
        <p className="mt-1"><strong>Qué hacés:</strong> {step.action}</p>
        {step.customer !== "—" && <p className="mt-1 text-emerald-800 dark:text-emerald-300"><strong>Cliente:</strong> {step.customer}</p>}
      </article>)}
      <p className="text-xs text-muted-foreground sm:col-span-2 xl:col-span-3">Si un producto se terminó, desactivalo en Administración → Productos («Disponible para vender»): el asistente de WhatsApp y el QR dejan de ofrecerlo. Los avisos al cliente salen solos por WhatsApp (si pidió por ahí) o por notificación en el teléfono (si pidió por el QR de la mesa).</p>
    </div>}
  </section>
}
