import Image from "next/image"
import Link from "next/link"
import credits from "../../public/menu-web/credits.json"

const photos = Object.entries(credits).sort(([a], [b]) => a.localeCompare(b, "es"))

export default function PhotoCreditsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/pos" className="text-sm font-semibold text-blue-700 hover:underline">← Volver al punto de venta</Link>
        <div className="mt-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 p-6 text-white shadow-xl sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Catálogo De la Casa</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Créditos de fotografías</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Estas fotos de Internet son ilustrativas. Los platos reales y su presentación pueden variar.
            Aquí se indican la fuente y la licencia de cada imagen utilizada en el catálogo.
          </p>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {photos.map(([slug, photo]) => (
            <article key={slug} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <Image src={photo.path} alt={photo.title} width={96} height={96} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 py-1">
                <h2 className="text-sm font-semibold capitalize">{slug.replaceAll("-", " ")}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{photo.title}</p>
                <p className="mt-1 text-xs text-slate-500">{photo.creator}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-blue-700">
                  <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Fuente ↗</a>
                  {photo.licenseUrl && <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Licencia {photo.license?.toUpperCase()} ↗</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
