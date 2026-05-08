import { useEffect, useState } from 'react'
import { cn } from '../../utils/classNames.js'

function NotificationToast({ notification, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setIsVisible(true))
    const timeoutId = window.setTimeout(() => {
      onDismiss?.(notification.id)
    }, notification.duration || 3500)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(timeoutId)
    }
  }, [notification.duration, notification.id, onDismiss])

  const toneStyles = {
    info: 'border-sky-400/25 bg-sky-500/12 text-sky-50',
    success: 'border-emerald-400/25 bg-emerald-500/12 text-emerald-50',
    warning: 'border-amber-400/25 bg-amber-500/12 text-amber-50',
    error: 'border-rose-400/25 bg-rose-500/12 text-rose-50',
  }

  const badgeStyles = {
    info: 'bg-sky-400/15 text-sky-100',
    success: 'bg-emerald-400/15 text-emerald-100',
    warning: 'bg-amber-400/15 text-amber-100',
    error: 'bg-rose-400/15 text-rose-100',
  }

  return (
    <div
      className={cn(
        'pointer-events-auto w-full rounded-3xl border px-4 py-4 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-300',
        toneStyles[notification.type] || toneStyles.info,
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]', badgeStyles[notification.type] || badgeStyles.info)}>
          Live
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{notification.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-200/90">{notification.message}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10 hover:text-white"
          onClick={() => onDismiss?.(notification.id)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function NotificationStack({ notifications, onDismiss }) {
  if (!notifications?.length) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {notifications.map((notification) => (
        <NotificationToast key={notification.id} notification={notification} onDismiss={onDismiss} />
      ))}
    </div>
  )
}