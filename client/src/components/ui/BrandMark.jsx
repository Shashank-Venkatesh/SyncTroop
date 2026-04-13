import { cn } from '../../utils/classNames.js'

export function BrandMark({ compact = false, className }) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-300 via-brand-400 to-accent-400 shadow-glow">
        <div className="h-4 w-4 rounded-lg bg-slate-950/90" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white/70 animate-glow" />
      </div>
      {!compact ? (
        <div>
          <p className="text-lg font-semibold tracking-tight text-white">SyncTroop</p>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Pomodoro, synced</p>
        </div>
      ) : null}
    </div>
  )
}