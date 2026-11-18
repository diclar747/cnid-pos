"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { LaptopFrame, PhoneFrame } from "./device-frame"

// Reproductor de recorridos animados con capturas reales del sistema.
// Cada cuadro hace un acercamiento suave hacia la zona destacada y muestra un subtítulo.

export interface DemoFrame {
  src: string
  alt: string
  caption: string
  device?: "desktop" | "phone" | "ticket"
  /** Punto (en %) hacia donde se acerca la cámara y cuánto. */
  focus?: { x: number; y: number; zoom: number }
  /** Recuadro destacado, en % de la captura. */
  highlight?: { x: number; y: number; w: number; h: number }
}

export interface DemoChapter {
  id: string
  title: string
  summary: string
  frames: DemoFrame[]
}

const FRAME_MS = 5200

export default function DemoPlayer({ chapters }: { chapters: DemoChapter[] }) {
  const [chapter, setChapter] = useState(0)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)

  const current = chapters[chapter]
  const shot = current.frames[frame]

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => { setReducedMotion(query.matches); if (query.matches) setPlaying(false) }
    apply()
    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
  }, [])

  // Solo reproduce cuando el reproductor está a la vista y la pestaña activa.
  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const goTo = useCallback((nextChapter: number, nextFrame = 0) => {
    const c = (nextChapter + chapters.length) % chapters.length
    setChapter(c)
    setFrame(Math.max(0, Math.min(nextFrame, chapters[c].frames.length - 1)))
    elapsed.current = 0
    setProgress(0)
  }, [chapters])

  const next = useCallback(() => {
    if (frame < current.frames.length - 1) goTo(chapter, frame + 1)
    else goTo(chapter + 1, 0)
  }, [chapter, frame, current.frames.length, goTo])

  const previous = useCallback(() => {
    if (frame > 0) goTo(chapter, frame - 1)
    else goTo(chapter - 1, chapters[(chapter - 1 + chapters.length) % chapters.length].frames.length - 1)
  }, [chapter, frame, chapters, goTo])

  // Acercamiento de cámara al cambiar de cuadro.
  useEffect(() => {
    setZoomed(false)
    if (reducedMotion) return
    const id = window.setTimeout(() => setZoomed(true), 60)
    return () => window.clearTimeout(id)
  }, [chapter, frame, reducedMotion])

  // Avance automático.
  useEffect(() => {
    if (!playing || !visible) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      if (document.visibilityState === "visible") elapsed.current += now - last
      last = now
      const p = Math.min(1, elapsed.current / FRAME_MS)
      setProgress(p)
      if (p >= 1) { next(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, visible, next])

  // Precarga del cuadro siguiente.
  useEffect(() => {
    const following = current.frames[frame + 1] ?? chapters[(chapter + 1) % chapters.length].frames[0]
    const image = new Image()
    image.src = following.src
  }, [chapter, frame, current.frames, chapters])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") { event.preventDefault(); next() }
    else if (event.key === "ArrowLeft") { event.preventDefault(); previous() }
    else if (event.key === " " && event.target === event.currentTarget) { event.preventDefault(); setPlaying((p) => !p) }
  }

  const focus = shot.focus ?? { x: 50, y: 50, zoom: 1.04 }
  const image = (
    <div className="relative h-full w-full overflow-hidden">
      <img
        key={shot.src + chapter + frame}
        src={shot.src}
        alt={shot.alt}
        className="h-full w-full object-cover object-top"
        style={{
          transformOrigin: `${focus.x}% ${focus.y}%`,
          transform: zoomed ? `scale(${focus.zoom})` : "scale(1)",
          transition: reducedMotion ? "none" : `transform ${FRAME_MS}ms cubic-bezier(.22,.61,.36,1)`,
        }}
      />
      {shot.highlight && (
        <span
          aria-hidden
          className={`pointer-events-none absolute rounded-xl ring-4 ring-amber-400/90 ${reducedMotion ? "" : "animate-pulse"}`}
          style={{
            left: `${shot.highlight.x}%`, top: `${shot.highlight.y}%`, width: `${shot.highlight.w}%`, height: `${shot.highlight.h}%`,
            transformOrigin: `${focus.x}% ${focus.y}%`,
            transform: zoomed ? `scale(${focus.zoom})` : "scale(1)",
            transition: reducedMotion ? "none" : `transform ${FRAME_MS}ms cubic-bezier(.22,.61,.36,1)`,
            boxShadow: "0 0 0 9999px rgba(15,23,42,.18)",
          }}
        />
      )}
    </div>
  )

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="reproductor de demostración"
      aria-label="Recorrido por RestoPOS"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="grid gap-6 rounded-[2rem] outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/60 lg:grid-cols-[18rem_1fr]"
    >
      <div role="tablist" aria-label="Capítulos" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {chapters.map((item, index) => {
          const active = index === chapter
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={active}
              onClick={() => { goTo(index); setPlaying(!reducedMotion) }}
              className={`min-w-[13rem] rounded-2xl border p-4 text-left transition lg:min-w-0 ${active
                ? "border-indigo-400 bg-white shadow-lg shadow-indigo-200/60 dark:border-indigo-500 dark:bg-slate-900 dark:shadow-none"
                : "border-transparent bg-white/50 hover:bg-white dark:bg-slate-900/40 dark:hover:bg-slate-900"}`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                {active && playing && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
              </span>
              <span className="mt-1 block font-bold text-slate-900 dark:text-white">{item.title}</span>
              <span className="mt-1 hidden text-sm text-slate-600 dark:text-slate-400 lg:block">{item.summary}</span>
              {active && (
                <span className="mt-3 flex gap-1" aria-hidden>
                  {item.frames.map((_, i) => (
                    <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <span className="block h-full rounded-full bg-indigo-600" style={{ width: i < frame ? "100%" : i === frame ? `${progress * 100}%` : "0%" }} />
                    </span>
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="min-w-0">
        <div className="relative rounded-[2rem] bg-gradient-to-br from-indigo-100 via-white to-violet-100 p-4 sm:p-8 dark:from-indigo-950/60 dark:via-slate-900 dark:to-violet-950/50">
          {shot.device === "phone"
            ? <PhoneFrame className="max-w-[15rem] sm:max-w-[17rem]">{image}</PhoneFrame>
            : shot.device === "ticket"
              ? <div className="mx-auto flex aspect-[16/10] max-h-[32rem] items-center justify-center">
                  <img
                    key={shot.src + chapter + frame}
                    src={shot.src}
                    alt={shot.alt}
                    className="h-full max-h-[30rem] w-auto rounded-md bg-white object-contain shadow-2xl shadow-slate-900/25"
                    style={{ transform: zoomed ? "translateY(0) rotate(-1.5deg)" : "translateY(24px) rotate(0deg)", transition: reducedMotion ? "none" : "transform 1200ms cubic-bezier(.22,.61,.36,1)" }}
                  />
                </div>
              : <LaptopFrame>{image}</LaptopFrame>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={previous} aria-label="Cuadro anterior" className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pausar" : "Reproducir"} className="rounded-full bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={next} aria-label="Cuadro siguiente" className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <ChevronRight className="h-5 w-5" />
          </button>
          <p aria-live="polite" className="min-w-0 flex-1 basis-64 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="mr-2 font-bold text-indigo-600 dark:text-indigo-300">{current.title}</span>{shot.caption}
          </p>
        </div>
      </div>
    </div>
  )
}
