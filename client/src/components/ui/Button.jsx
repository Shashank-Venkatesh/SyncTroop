import { cn } from '../../utils/classNames.js'

const variantClasses = {
  primary:
    'bg-gradient-to-r from-brand-400 to-brand-500 text-slate-950 shadow-glow hover:from-brand-300 hover:to-brand-400',
  secondary:
    'border border-white/10 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/10',
  ghost:
    'text-slate-200 hover:bg-white/8 hover:text-white',
  outline:
    'border border-brand-400/40 bg-transparent text-brand-100 hover:border-brand-300 hover:bg-brand-400/10',
  danger:
    'bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 border border-rose-400/20',
  glass:
    'border border-white/10 bg-white/6 text-white backdrop-blur-md hover:bg-white/10',
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
}

export function Button({
  children,
  className,
  size = 'md',
  variant = 'primary',
  type = 'button',
  fullWidth = false,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}