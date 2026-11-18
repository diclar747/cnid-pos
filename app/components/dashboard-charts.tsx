"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Cell,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { buildDashboardAnalytics } from "@/lib/dashboard-analytics"

type Analytics = ReturnType<typeof buildDashboardAnalytics>
type TrendMetric = "amount" | "orders"

const money = (value: number) => new Intl.NumberFormat("es-PY", {
  style: "currency", currency: "PYG", maximumFractionDigits: 0,
}).format(value)
const shortNumber = (value: number) => new Intl.NumberFormat("es-PY", {
  notation: "compact", maximumFractionDigits: 1,
}).format(value)
const shortDate = (day: string) => new Intl.DateTimeFormat("es-PY", {
  day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(day + "T12:00:00Z"))
const tooltipStyle = {
  backgroundColor: "#0f172a",
  color: "#fff",
  border: "1px solid #334155",
  borderRadius: 16,
  boxShadow: "0 20px 35px -18px rgba(15,23,42,.55)",
}
export const paymentColors = ["#6366f1", "#06b6d4", "#f59e0b", "#94a3b8"]

export function SalesTrendChart({ timeline, metric, showPrevious }: {
  timeline: Analytics["timeline"]
  metric: TrendMetric
  showPrevious: boolean
}) {
  const isMoney = metric === "amount"
  return <div className="h-[270px] w-full sm:h-[320px]" role="img" aria-label={isMoney ? "Gráfico de ingresos diarios" : "Gráfico de operaciones diarias"}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={timeline} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboard-sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.34} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.015} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(value) => shortDate(String(value))} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} dy={10} />
        <YAxis tickFormatter={(value) => shortNumber(Number(value))} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: "#cbd5e1", marginBottom: 8 }}
          itemStyle={{ color: "#fff" }}
          labelFormatter={(value) => shortDate(String(value))}
          formatter={(value, name) => [isMoney ? money(Number(value)) : String(value), String(name)]}
        />
        <Area type="monotone" dataKey={metric} name="Período actual" stroke="#6366f1" strokeWidth={3} fill="url(#dashboard-sales-fill)" activeDot={{ r: 5, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }} />
        {showPrevious && <Line type="monotone" dataKey={isMoney ? "previousAmount" : "previousOrders"} name="Período anterior" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} />}
      </ComposedChart>
    </ResponsiveContainer>
  </div>
}

export function WeekdayChart({ weekdays }: { weekdays: Analytics["weekdays"] }) {
  return <div className="h-[260px] w-full" role="img" aria-label="Gráfico de ventas por día de la semana">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={weekdays} layout="vertical" margin={{ top: 0, right: 13, bottom: 0, left: 4 }} barSize={15}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 5" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => shortNumber(Number(value))} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis dataKey="name" type="category" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#cbd5e1" }} formatter={(value) => [money(Number(value)), "Ventas"]} cursor={{ fill: "rgba(99,102,241,.06)" }} />
        <Bar dataKey="amount" fill="#818cf8" radius={[0, 7, 7, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
}

export function PaymentChart({ methods }: { methods: Analytics["paymentMethods"] }) {
  if (!methods.length) return <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">Sin ventas en este período</div>
  return <div className="relative h-[220px] w-full" role="img" aria-label="Gráfico de ingresos por medio de pago">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={methods} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={64} outerRadius={91} paddingAngle={methods.length > 1 ? 4 : 0} stroke="none">
          {methods.map((method, index) => <Cell key={method.key} fill={paymentColors[index % paymentColors.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#fff" }} formatter={(value) => money(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Medios</span>
      <strong className="text-2xl font-bold text-slate-800 dark:text-white">{methods.length}</strong>
    </div>
  </div>
}
