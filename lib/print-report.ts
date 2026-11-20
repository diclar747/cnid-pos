// Reporte imprimible: abre una ventana con el reporte en HTML limpio (A4) y lanza la impresión.
// Desde el diálogo de impresión se puede «Guardar como PDF».

export interface PrintTable { title?: string; headers: string[]; rows: (string | number)[][]; align?: ("left" | "right")[]; footer?: (string | number)[] }
export interface PrintReport { title: string; subtitle?: string; business?: string; summary?: { label: string; value: string }[]; tables: PrintTable[]; landscape?: boolean }

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[char] as string)
const show = (value: string | number) => typeof value === "number" ? value.toLocaleString("es-PY") : value

export function printReport(report: PrintReport) {
  const win = window.open("", "_blank")
  if (!win) { alert("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para este sitio."); return }
  const generated = new Date().toLocaleString("es-PY")
  const tables = report.tables.map((table) => {
    const align = (i: number) => table.align?.[i] === "right" ? ' class="r"' : ""
    return `${table.title ? `<h2>${escapeHtml(table.title)}</h2>` : ""}<table><thead><tr>${table.headers.map((head, i) => `<th${align(i)}>${escapeHtml(head)}</th>`).join("")}</tr></thead>
      <tbody>${table.rows.length ? table.rows.map((row) => `<tr>${row.map((cell, i) => `<td${align(i)}>${escapeHtml(show(cell))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${table.headers.length}" class="empty">Sin datos</td></tr>`}</tbody>
      ${table.footer ? `<tfoot><tr>${table.footer.map((cell, i) => `<td${align(i)}>${escapeHtml(show(cell))}</td>`).join("")}</tr></tfoot>` : ""}</table>`
  }).join("")
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>
    @page { size: A4 ${report.landscape ? "landscape" : "portrait"}; margin: 12mm; }
    * { box-sizing: border-box; } body { font: 11px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 12px; }
    h1 { font-size: 18px; margin: 0; } .sub { color: #475569; margin-top: 2px; } .meta { text-align: right; color: #64748b; font-size: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; margin-bottom: 12px; }
    .summary div { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; } .summary b { display: block; font-size: 14px; } .summary span { color: #64748b; font-size: 10px; text-transform: uppercase; }
    h2 { font-size: 13px; margin: 14px 0 6px; } table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    th { background: #eef2ff; text-align: left; font-weight: 600; padding: 5px 6px; border-bottom: 1px solid #c7d2fe; }
    td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; } tr { page-break-inside: avoid; }
    tfoot td { font-weight: 700; border-top: 2px solid #94a3b8; background: #f8fafc; } .r { text-align: right; white-space: nowrap; } .empty { text-align: center; color: #94a3b8; padding: 12px; }
    @media screen { body { padding: 16px; max-width: 1100px; margin: auto; } }
  </style></head><body><header><div><h1>${escapeHtml(report.title)}</h1>${report.subtitle ? `<div class="sub">${escapeHtml(report.subtitle)}</div>` : ""}</div>
    <div class="meta">${escapeHtml(report.business ?? "")}<br>Generado: ${escapeHtml(generated)}</div></header>
    ${report.summary?.length ? `<section class="summary">${report.summary.map((item) => `<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join("")}</section>` : ""}
    ${tables}<script>window.addEventListener("load", function () { setTimeout(function () { window.print() }, 250) })</script></body></html>`)
  win.document.close()
}
