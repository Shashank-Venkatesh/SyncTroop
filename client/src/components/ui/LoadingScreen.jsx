import { createPortal } from 'react-dom'
import { cn } from '../../utils/classNames.js'

function PrismMark() {
  return (
    <div className="relative h-32 w-32 sm:h-36 sm:w-36">
      <div className="absolute inset-0 rounded-full bg-brand-400/12 blur-3xl motion-safe:animate-pulse" />

      <div className="absolute inset-2 rounded-full border border-white/10 bg-white/5 shadow-glow backdrop-blur-sm motion-safe:animate-[spin_18s_linear_infinite]" />
      <div className="absolute inset-5 rounded-full border border-brand-300/20 bg-slate-950/72 shadow-[inset_0_0_42px_rgba(255,255,255,0.06)]" />

      <div className="absolute inset-0 motion-safe:animate-[spin_16s_linear_infinite]">
        <span className="absolute left-1/2 top-1.5 h-12 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-200/90 via-white/45 to-transparent blur-[1px]" />
        <span className="absolute right-3 top-1/2 h-12 w-2 -translate-y-1/2 rounded-full bg-gradient-to-b from-accent-300/90 via-white/40 to-transparent blur-[1px]" />
        <span className="absolute left-3 top-1/2 h-12 w-2 -translate-y-1/2 rounded-full bg-gradient-to-b from-white/90 via-brand-300/45 to-transparent blur-[1px]" />
        <span className="absolute bottom-2.5 left-1/2 h-12 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-white/70 via-accent-300/35 to-transparent blur-[1px]" />
      </div>

      <div className="absolute inset-8 rounded-[1.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.2),rgba(47,212,172,0.08),rgba(255,159,45,0.16))] shadow-[0_0_40px_rgba(255,255,255,0.08)] backdrop-blur-md" style={{ clipPath: 'polygon(50% 0%, 91% 17%, 100% 50%, 91% 83%, 50% 100%, 9% 83%, 0% 50%, 9% 17%)' }} />
      <div className="absolute inset-[2.55rem] rotate-45 rounded-[1rem] border border-white/20 bg-slate-950/86 shadow-inner" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />

      <div className="absolute inset-x-8 top-1/2 h-8 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-300/0 via-white/55 to-accent-300/0 blur-xl motion-safe:animate-pulse" />
      <div className="absolute left-1/2 top-1/2 h-16 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/90 to-transparent opacity-90 blur-[1px]" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-16 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-90 blur-[1px]" />
    </div>
  )
}

export function LoadingScreen({ open, title = 'Prism loading', message = 'Syncing the room.', hint = '' }) {
  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center px-4 py-6',
      )}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,212,172,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(255,159,45,0.12),transparent_24%),linear-gradient(180deg,rgba(3,8,16,0.92),rgba(5,11,20,0.98))] backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.04)_100%)] opacity-70" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/88 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex justify-center">
          <PrismMark />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.34em] text-brand-200">Prism loading</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
        {hint ? <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">{hint}</p> : null}
      </div>
    </div>,
    document.body,
  )
}