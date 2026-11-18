"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "../../../components/protected-route"
import { ticketPrintCss } from "../../../components/ticket-75mm"
import { useCompany } from "../../../context/company-context"
import { apiRequest } from "@/lib/api-client"

type Report = {
  session: { id: number; status: string; openingAmount: number; openedBy: string; openedAt: string; closedBy: string; closedAt: string | null
    expectedCash: number | null; countedCash: number | null; difference: number | null; notes: string }
  summary: { openingAmount: number; byMethod: { method: string; name: string; confirmed: number; pending: number; rejected: number; count: number }[]
    salesTotal: number; salesCount: number; incomes: number; expenses: number; cashSales: number; cashIncomes: number; cashExpenses: number; expectedCash: number }
  movements: { id: number; kind: string; amount: number; description: string; createdAt: string }[]
}

const money = (value: number) => Math.round(value).toLocaleString("es-PY")
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

// Arqueo de caja en 75 mm: resumen por medio de pago, movimientos y diferencia.
export default function CashReportPage() {
  const { id } = useParams<{ id: string }>()
  const { companyConfig } = useCompany()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!/^\d+$/.test(id)) { setError("Caja inválida"); return }
    apiRequest<Report>(`/api/cash/${id}`).then(setReport).catch((problem) => setError(problem instanceof Error ? problem.message : "No se pudo abrir el arqueo"))
  }, [id])
  const row = (label: string, value: string, bold = false) => <p className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}><span>{label}</span><span>{value}</span></p>
  const s = report?.summary
  const closed = report?.session.status === "closed"
  return <ProtectedRoute requiredPermissions={["manage_sales"]}><main className="min-h-screen bg-slate-100 p-4 sm:p-8">
    <div className="print-actions mx-auto mb-4 flex max-w-[300px] justify-between gap-2">
      <Button variant="outline" onClick={() => window.close()}><X className="mr-2 h-4 w-4" /> Cerrar</Button>
      <Button onClick={() => window.print()} disabled={!report}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
    </div>
    {error && <p className="mx-auto max-w-[300px] rounded-lg bg-red-100 p-4 text-red-800">{error}</p>}
    {report && s && <article className="ticket-75 mx-auto max-w-[300px] bg-white p-4 font-mono text-[12px] leading-snug text-black shadow">
      <h1 className="text-center text-sm font-bold uppercase">{companyConfig.name || "RestoPOS"}</h1>
      <p className="text-center">{closed ? "ARQUEO DE CAJA" : "CORTE PARCIAL DE CAJA"} #{report.session.id}</p>
      <hr className="my-2 border-dashed border-black" />
      {row("Apertura", when(report.session.openedAt))}
      {row("Abrió", report.session.openedBy)}
      {closed && row("Cierre", when(report.session.closedAt))}
      {closed && row("Cerró", report.session.closedBy)}
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">VENTAS POR MEDIO ({s.salesCount})</p>
      {s.byMethod.map((item) => <div key={item.method}>{row(`${item.name} (${item.count})`, money(item.confirmed))}
        {item.pending > 0 && row("  por verificar", money(item.pending))}{item.rejected > 0 && row("  rechazado", money(item.rejected))}</div>)}
      {row("Total ventas", money(s.salesTotal), true)}
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">MOVIMIENTOS</p>
      {report.movements.map((item) => row(`${item.kind === "income" ? "+" : "-"} ${item.description}`.slice(0, 28), money(item.amount)))}
      {!report.movements.length && <p>Sin movimientos</p>}
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">EFECTIVO</p>
      {row("Inicial", money(s.openingAmount))}
      {row("+ Ventas", money(s.cashSales))}
      {row("+ Ingresos", money(s.cashIncomes))}
      {row("- Egresos", money(s.cashExpenses))}
      {row("Esperado", money(closed ? report.session.expectedCash ?? s.expectedCash : s.expectedCash), true)}
      {closed && row("Contado", money(report.session.countedCash ?? 0), true)}
      {closed && row("Diferencia", `${(report.session.difference ?? 0) > 0 ? "+" : ""}${money(report.session.difference ?? 0)}`, true)}
      {report.session.notes && <p className="mt-2">Notas: {report.session.notes}</p>}
      <p className="mt-6 text-center">______________________<br />Firma</p>
      <p className="mt-2 text-center text-[10px]">Impreso {when(new Date().toISOString())}</p>
    </article>}
    <style jsx global>{ticketPrintCss}</style>
  </main></ProtectedRoute>
}
