const OFF_TOPIC_KEYWORDS = [
  'game',
  'movie',
  'music',
  'party',
  'weekend',
  'vacation',
  'travel',
  'dinner',
  'lunch',
  'sports',
  'football',
  'basketball',
  'meme',
  'crypto',
  'drink',
  'coffee run',
]

export const PHASES = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
}

export function clampNumber(value, min, max) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return min
  }

  return Math.min(Math.max(numericValue, min), max)
}

export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatClockTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getPhaseLabel(phase) {
  switch (phase) {
    case PHASES.SHORT_BREAK:
      return 'Short Break'
    case PHASES.LONG_BREAK:
      return 'Long Break'
    default:
      return 'Focus Session'
  }
}

export function getPhaseAccent(phase) {
  switch (phase) {
    case PHASES.SHORT_BREAK:
      return 'from-brand-400 via-brand-300 to-cyan-300'
    case PHASES.LONG_BREAK:
      return 'from-accent-400 via-amber-300 to-yellow-200'
    default:
      return 'from-brand-300 via-teal-300 to-emerald-300'
  }
}

export function getPhaseDuration(phase, settings) {
  const focusMinutes = clampNumber(settings?.focusMinutes ?? 25, 1, 180)
  const shortBreakMinutes = clampNumber(settings?.shortBreakMinutes ?? 5, 1, 60)
  const longBreakMinutes = clampNumber(settings?.longBreakMinutes ?? 15, 1, 120)

  switch (phase) {
    case PHASES.SHORT_BREAK:
      return shortBreakMinutes * 60
    case PHASES.LONG_BREAK:
      return longBreakMinutes * 60
    default:
      return focusMinutes * 60
  }
}

export function getNextPhase(currentPhase, cycleCount, settings) {
  const cyclesBeforeLongBreak = clampNumber(settings?.cyclesBeforeLongBreak ?? 4, 1, 12)

  if (currentPhase === PHASES.FOCUS) {
    const completedCycles = cycleCount + 1
    const nextPhase = completedCycles % cyclesBeforeLongBreak === 0 ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK

    return {
      nextPhase,
      completedCycles,
      duration: getPhaseDuration(nextPhase, settings),
    }
  }

  return {
    nextPhase: PHASES.FOCUS,
    completedCycles: cycleCount,
    duration: getPhaseDuration(PHASES.FOCUS, settings),
  }
}

export function createInitialSharedTimer(settings) {
  return {
    phase: PHASES.FOCUS,
    secondsLeft: getPhaseDuration(PHASES.FOCUS, settings),
    isRunning: false,
    startedBy: null,
    cycleCount: 0,
    lastUpdatedAt: Date.now(),
  }
}

export function getProgressFraction(secondsLeft, totalSeconds) {
  if (!totalSeconds) {
    return 0
  }

  return Math.min(1, Math.max(0, 1 - secondsLeft / totalSeconds))
}

export function generateRoomCode(length = 6) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = new Uint32Array(length)

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values)

    return Array.from(values, (value) => characters[value % characters.length]).join('')
  }

  return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('')
}

export function getAvatarUrl(seed) {
  const normalizedSeed = encodeURIComponent(String(seed || 'SyncTroop'))

  return `https://api.dicebear.com/8.x/initials/svg?seed=${normalizedSeed}&backgroundColor=0f766e,0ea5e9,f97316&fontFamily=Space%20Grotesk`
}

export function isWorkFocusedMessage(message) {
  const normalizedMessage = String(message || '').toLowerCase()

  return !OFF_TOPIC_KEYWORDS.some((keyword) => normalizedMessage.includes(keyword))
}