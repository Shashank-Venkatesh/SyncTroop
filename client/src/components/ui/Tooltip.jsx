import { useId } from 'react'
import { cn } from '../../utils/classNames.js'

export function Tooltip({ content, label = 'More info', align = 'left', className }) {
  const tooltipId = useId()

  return (
    <span className={cn('group relative inline-flex shrink-0', className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 transition hover:border-brand-300/30 hover:bg-brand-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70"
      >
        <span className="-translate-y-px text-sm font-bold italic leading-none" aria-hidden="true">
          i
        </span>
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-left text-xs leading-5 text-slate-200 shadow-2xl opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100',
          align === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {content}
      </span>
    </span>
  )
}