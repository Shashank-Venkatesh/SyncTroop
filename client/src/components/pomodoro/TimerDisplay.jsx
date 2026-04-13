import { Card } from '../ui/Card.jsx'
import { cn } from '../../utils/classNames.js'
import { formatTime } from '../../utils/pomodoro.js'

export function TimerDisplay({
  title,
  subtitle,
  phaseLabel,
  secondsLeft,
  totalSeconds,
  progress,
  accent = 'from-brand-300 via-brand-400 to-brand-500',
  details,
  infoCards,
  actions,
  className,
}) {
  const fillPercentage = Math.max(0, Math.min(1, progress || 0)) * 360

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,212,172,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,159,45,0.12),transparent_28%)]" />
      <div className="relative flex flex-col gap-8">
        <div className="space-y-4 lg:max-w-2xl">
          {phaseLabel ? (
            <span className={cn('inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-950', accent)}>
              {phaseLabel}
            </span>
          ) : null}
          {title ? <h3 className="text-3xl font-semibold tracking-tight text-white">{title}</h3> : null}
          {subtitle ? <p className="max-w-xl text-sm leading-6 text-slate-400">{subtitle}</p> : null}
          {details ? <div className="pt-2">{details}</div> : null}
        </div>

        <div className="flex flex-col items-center gap-4 self-center">
          <div
            className="relative flex h-72 w-72 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)] sm:h-80 sm:w-80 lg:h-[22rem] lg:w-[22rem]"
            style={{
              backgroundImage: `conic-gradient(rgba(47,212,172,0.95) ${fillPercentage}deg, rgba(255,255,255,0.08) 0deg)`,
            }}
          >
            <div className="flex h-[calc(100%-1.6rem)] w-[calc(100%-1.6rem)] flex-col items-center justify-center rounded-full border border-white/10 bg-slate-950/95 text-center">
              <p className="text-[0.7rem] uppercase tracking-[0.34em] text-slate-400 sm:text-xs">Time left</p>
              <p className="mt-2 font-mono text-6xl font-semibold tracking-tight text-white sm:text-7xl">{formatTime(secondsLeft)}</p>
              {totalSeconds ? (
                <p className="mt-3 text-sm text-slate-400 sm:mt-4">
                  {Math.round(fillPercentage / 3.6)}% complete
                </p>
              ) : null}
            </div>
          </div>

          {infoCards?.length ? (
            <div className="w-full">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {infoCards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-float">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                    {card.helper ? <p className="mt-1 text-sm leading-6 text-slate-400">{card.helper}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {actions ? <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        </div>
      </div>
    </Card>
  )
}