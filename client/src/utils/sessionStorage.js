export const SESSION_KEYS = {
  user: 'synctroop:user',
  token: 'synctroop:token',
  room: 'synctroop:room',
  sharedTimer: 'synctroop:sharedTimer',
  preferredMaxMembers: 'synctroop:preferredMaxMembers',
  draftRoomCode: 'synctroop:draftRoomCode',
}

export function readSessionString(key, fallback = '') {
  if (typeof window === 'undefined') {
    return fallback
  }

  return window.sessionStorage.getItem(key) || fallback
}

export function writeSessionString(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  if (!value) {
    window.sessionStorage.removeItem(key)
    return
  }

  window.sessionStorage.setItem(key, value)
}

export function readSessionItem(key, fallback = null) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const storedValue = window.sessionStorage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : fallback
  } catch {
    return fallback
  }
}

export function writeSessionItem(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  if (value === null || value === undefined) {
    window.sessionStorage.removeItem(key)
    return
  }

  window.sessionStorage.setItem(key, JSON.stringify(value))
}

export function removeSessionItem(key) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(key)
}

export function clearAuthSession() {
  removeSessionItem(SESSION_KEYS.user)
  writeSessionString(SESSION_KEYS.token, '')
}

export function clearRoomSession() {
  removeSessionItem(SESSION_KEYS.room)
  removeSessionItem(SESSION_KEYS.sharedTimer)
}

export function clearSession() {
  clearAuthSession()
  clearRoomSession()
  removeSessionItem(SESSION_KEYS.preferredMaxMembers)
  removeSessionItem(SESSION_KEYS.draftRoomCode)
}
