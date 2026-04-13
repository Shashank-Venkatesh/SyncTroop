import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/classNames.js'
import { Button } from './Button.jsx'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center px-4 py-6 transition duration-200',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      onMouseDown={() => onClose?.()}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      <div
        className={cn(
          'relative w-full rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl transition-all duration-200',
          maxWidth,
          open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title ? <h2 className="text-2xl font-semibold text-white">{title}</h2> : null}
            {description ? <p className="text-sm text-slate-400">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </div>

        <div className="mt-6">{children}</div>

        {footer ? <div className="mt-6 border-t border-white/10 pt-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}