import { cn } from '../../utils/classNames.js'

export function Input({
  label,
  hint,
  error,
  className,
  containerClassName,
  multiline = false,
  as,
  rows = 4,
  children,
  ...props
}) {
  const Component = as || (multiline ? 'textarea' : 'input')
  const isInputElement = Component === 'input'

  return (
    <label className={cn('block space-y-2', containerClassName)}>
      {label ? <span className="block text-sm font-medium text-slate-200">{label}</span> : null}
      {isInputElement ? (
        <Component
          className={cn(
            'w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
            multiline && 'min-h-[6rem] resize-y',
            error && 'border-rose-400/70 focus:border-rose-300 focus:ring-rose-400/20',
            className,
          )}
          {...props}
        />
      ) : (
        <Component
          rows={multiline ? rows : undefined}
          className={cn(
            'w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
            multiline && 'min-h-[6rem] resize-y',
            error && 'border-rose-400/70 focus:border-rose-300 focus:ring-rose-400/20',
            className,
          )}
          {...props}
        >
          {children}
        </Component>
      )}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-slate-400">{hint}</p> : null}
    </label>
  )
}