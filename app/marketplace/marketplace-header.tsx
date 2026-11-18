import Link from "next/link"
import { Sparkles, Store } from "lucide-react"

export default function MarketplaceHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="RestoPOS, inicio">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30"><Sparkles className="h-5 w-5" /></span>
          <span className="text-xl font-black tracking-tight">Resto<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">POS</span></span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium sm:gap-5" aria-label="Marketplace">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300"><Store className="h-4 w-4" /><span className="hidden sm:inline">Restaurantes</span></Link>
          <Link href="/#funciones" className="hidden text-slate-600 hover:text-indigo-600 sm:inline dark:text-slate-300">Para restaurantes</Link>
          <Link href="/login" className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900">Ingresar</Link>
        </nav>
      </div>
    </header>
  )
}
