import { useState } from 'react'
import { cn } from '../../utils/classNames.js'

function getInitials(name) {
  return String(name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

const sizeClasses = {
  xs: 'h-8 w-8 text-[10px]',
  sm: 'h-10 w-10 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
}

export function Avatar({ src, name, size = 'md', className }) {
  const [failedSources, setFailedSources] = useState({})

  const initials = getInitials(name)
  const hasError = Boolean(src && failedSources[src])

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/8 text-white',
        sizeClasses[size],
        className,
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => {
            setFailedSources((current) => ({
              ...current,
              [src]: true,
            }))
          }}
        />
      ) : (
        <span className="font-semibold tracking-wide">{initials}</span>
      )}
    </div>
  )
}