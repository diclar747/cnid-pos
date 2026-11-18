import Link from "next/link"
import { Store, UserRound } from "lucide-react"
import { BrandLogo } from "../components/brand-logo"

export default function MarketplaceHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/marketplace" className="flex items-center gap-2.5" aria-label="RestoPOS, restaurantes">
          <BrandLogo size="sm" tagline />
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium sm:gap-5" aria-label="Marketplace">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300"><Store className="h-4 w-4" /><span className="hidden sm:inline">Restaurantes</span></Link>
          <Link href="/" className="hidden text-slate-600 hover:text-indigo-600 md:inline dark:text-slate-300">Para restaurantes</Link>
          <Link href="/login" className="hidden text-slate-500 hover:text-indigo-600 sm:inline dark:text-slate-400" title="Ingreso del personal del restaurante">Acceso local</Link>
          <Link href="/cuenta" className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"><UserRound className="h-4 w-4" />Mi cuenta</Link>
        </nav>
      </div>
    </header>
  )
}
