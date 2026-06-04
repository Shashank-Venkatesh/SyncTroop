import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useApp } from './AppContext.jsx'

export const SocketContext = createContext(null)

function normalizeHttpUrl(value) {
  if (!value || typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const protocol = import.meta.env.DEV ? 'http://' : 'https://'
  return `${protocol}${trimmed}`
}

function getSocketUrl() {
  // If running locally, route socket connections through the local proxy/origin
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.log('[Socket] Localhost detected, routing socket connection to:', window.location.origin)
    return window.location.origin
  }

  // Try explicit socket URL first
  const explicitSocketUrl = normalizeHttpUrl(import.meta.env.VITE_SOCKET_URL)

  if (explicitSocketUrl) {
    return explicitSocketUrl
  }

  // Try explicit API URL
  const explicitApiUrl = normalizeHttpUrl(import.meta.env.VITE_API_URL)

  if (explicitApiUrl) {
    try {
      const parsedUrl = new URL(explicitApiUrl)

      if (parsedUrl.pathname.endsWith('/api')) {
        parsedUrl.pathname = parsedUrl.pathname.slice(0, -4) || '/'
      }

      parsedUrl.search = ''
      parsedUrl.hash = ''

      const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '')}`
      console.log('[Socket] Using URL from VITE_API_URL:', baseUrl)
      return baseUrl
    } catch (err) {
      console.error('[Socket] Invalid VITE_API_URL:', explicitApiUrl, err)
    }
  }

  if (typeof window === 'undefined') {
    return ''
  }

  // In development, use localhost:3000; in production, use current origin
  const defaultUrl = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin
  console.log('[Socket] Using default URL:', defaultUrl)
  return defaultUrl
}

function getStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem('synctroop:token') || ''
}

export function SocketProvider({ children }) {
  const { state, actions } = useApp()
  const [socketInstance] = useState(() =>
    io(getSocketUrl(), {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      secure: import.meta.env.PROD,
      rejectUnauthorized: false,
      auth: {
        token: getStoredToken(),
      },
    }),
  )
  const [connectionState, setConnectionState] = useState('disconnected')
  const currentUserIdRef = useRef(state.user?.id)
  const disconnectTimerRef = useRef(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    currentUserIdRef.current = state.user?.id
  }, [state])

  // Synchronise socket auth whenever the user changes. This runs as an
  // effect, but the connect logic below also sets auth *synchronously*
  // right before calling .connect() to close the React-batching race.
  useEffect(() => {
    const token = getStoredToken()
    socketInstance.auth = token ? { token } : {}
  }, [socketInstance, state.user?.id])

  // Connect the socket when a room becomes active; disconnect (with a
  // small debounce) when the room is cleared.  The debounce prevents a
  // spurious disconnect → reconnect cycle during lobby → room navigation
  // where state.room briefly becomes null between setRoomBundle calls.
  useEffect(() => {
    const hasActiveRoom = Boolean(state.room?.code)

    if (hasActiveRoom) {
      // Cancel any pending disconnect
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
      }

      if (!socketInstance.connected) {
        // Set auth token synchronously right before connecting to prevent
        // the race condition where React batches the auth-update effect
        // after this connect effect, causing the socket to handshake with
        // a stale or empty token.
        const token = getStoredToken()
        socketInstance.auth = token ? { token } : {}
        socketInstance.connect()
      }
      return
    }

    // Debounce disconnect — wait 1.5s to ensure this isn't a transient
    // state transition during navigation (e.g. lobby → room page).
    if (socketInstance.connected && !disconnectTimerRef.current) {
      disconnectTimerRef.current = setTimeout(() => {
        disconnectTimerRef.current = null
        // Re-check: room may have been set again during the delay
        if (!stateRef.current.room?.code) {
          socketInstance.disconnect()
        }
      }, 1500)
    }

    return () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
      }
    }
  }, [socketInstance, state.room?.code])

  useEffect(() => {
    const handleConnect = () => setConnectionState('connected')
    const handleDisconnect = () => setConnectionState('disconnected')
    const handleConnectError = (error) => {
      console.error('[Socket] Connection error:', error?.message || error)
      setConnectionState('error')

      if (error?.message === 'UNAUTHORIZED') {
        console.warn('[Socket] Unauthorized connection attempt. Clearing token.')
        if (typeof window !== 'undefined') {
          localStorage.removeItem('synctroop:user')
          localStorage.removeItem('synctroop:token')
          actions.clearUser()
          actions.clearRoom()
          window.location.href = '/'
        }
      }
    }

    const handleCreateRoom = (payload) => {
      if (!payload) {
        return
      }

      if (payload.room || payload.members || payload.tasks || payload.messages) {
        actions.setRoomBundle(payload)
        return
      }

      if (payload.code) {
        actions.setRoomBundle({
          room: payload,
          members: payload.members || [],
          tasks: payload.tasks || [],
          messages: payload.messages || [],
          sharedTimer: payload.sharedTimer,
        })
      }
    }

    const handleJoinRoom = (payload) => {
      if (!payload) {
        return
      }

      if (payload.room || payload.members || payload.tasks || payload.messages) {
        actions.setRoomBundle(payload)
        return
      }

      if (payload.code) {
        actions.setRoomBundle({
          room: payload,
          members: payload.members || [],
          tasks: payload.tasks || [],
          messages: payload.messages || [],
          sharedTimer: payload.sharedTimer,
        })
      }
    }

    const handleStartTimer = (payload) => {
      if (!payload) {
        return
      }

      if (payload.senderId && currentUserIdRef.current && payload.senderId === currentUserIdRef.current) {
        return
      }

      actions.syncSharedTimer({
        ...payload.timer,
        isRunning: true,
      })
    }

    const handleSyncTimer = (payload) => {
      if (!payload) {
        return
      }

      if (payload.senderId && currentUserIdRef.current && payload.senderId === currentUserIdRef.current) {
        return
      }

      const receivedTimer = payload.timer || payload
      const localTimer = stateRef.current.sharedTimer

      // Avoid jitter: only sync if phase/running state changes, or time difference is > 2 seconds
      const timeDiff = Math.abs((localTimer.secondsLeft || 0) - (receivedTimer.secondsLeft || 0))
      const stateChanged = localTimer.isRunning !== receivedTimer.isRunning || localTimer.phase !== receivedTimer.phase

      if (stateChanged || timeDiff > 2) {
        actions.syncSharedTimer(receivedTimer)
      }
    }

    const handleTaskUpdate = (payload) => {
      if (!payload) {
        return
      }

      if (Array.isArray(payload.tasks)) {
        actions.setTasks(payload.tasks)
        return
      }

      actions.upsertTask(payload.task || payload)
    }

    const handleMemberJoined = (payload) => {
      if (!payload) {
        return
      }

      const member = payload.member || payload
      const memberId = member?.id || payload.id

      // Check if this member was already in our list and online to prevent spam
      const existingMember = stateRef.current.members.find(m => m.id === memberId)
      const isAlreadyOnline = existingMember && existingMember.status === 'online'

      actions.upsertMember(member)

      if (memberId && currentUserIdRef.current && memberId === currentUserIdRef.current) {
        return
      }

      if (!isAlreadyOnline) {
        const notification = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'success',
          title: 'Member joined',
          message: `${member?.name || 'A teammate'} joined the room.`,
          duration: 3200,
        }
        actions.addNotification(notification)
      }
    }

    const handleInitialMemberList = (payload) => {
      if (!payload || !Array.isArray(payload.members)) {
        return
      }
      actions.setMembers(payload.members)
    }

    const handleMemberLeft = (payload) => {
      const memberId = payload?.memberId || payload?.id

      if (memberId) {
        const existingMember = stateRef.current.members.find(m => m.id === memberId)
        actions.removeMember(memberId)

        if (existingMember && memberId !== currentUserIdRef.current) {
          const notification = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'info',
            title: 'Member left',
            message: `${existingMember.name || 'A teammate'} left the room.`,
            duration: 3200,
          }
          actions.addNotification(notification)
        }
      }
    }

    const handleChatMessage = (payload) => {
      if (!payload) {
        return
      }

      actions.addMessage(payload.message || payload)
    }

    const handleMemberStatus = (payload) => {
      if (!payload?.member) {
        return
      }

      const member = payload.member
      const existingMember = stateRef.current.members.find(m => m.id === member.id)

      actions.upsertMember(member)

      if (member.id && currentUserIdRef.current && member.id === currentUserIdRef.current) {
        return
      }

      if (existingMember && existingMember.status !== member.status) {
        const notification = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'info',
          title: member.status === 'away' ? 'Member away' : 'Member back',
          message: `${member.name || 'A teammate'} is now ${member.status === 'away' ? 'away' : 'online'}.`,
          duration: 3200,
        }
        actions.addNotification(notification)
      }
    }

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('connect_error', handleConnectError)
    socketInstance.on('create-room', handleCreateRoom)
    socketInstance.on('join-room', handleJoinRoom)
    socketInstance.on('start-timer', handleStartTimer)
    socketInstance.on('sync-timer', handleSyncTimer)
    socketInstance.on('task-update', handleTaskUpdate)
    socketInstance.on('initial-member-list', handleInitialMemberList)
    socketInstance.on('member-joined', handleMemberJoined)
    socketInstance.on('member-left', handleMemberLeft)
    socketInstance.on('member-status', handleMemberStatus)
    socketInstance.on('chat-message', handleChatMessage)

    return () => {
      socketInstance.off('connect', handleConnect)
      socketInstance.off('disconnect', handleDisconnect)
      socketInstance.off('connect_error', handleConnectError)
      socketInstance.off('create-room', handleCreateRoom)
      socketInstance.off('join-room', handleJoinRoom)
      socketInstance.off('start-timer', handleStartTimer)
      socketInstance.off('sync-timer', handleSyncTimer)
      socketInstance.off('task-update', handleTaskUpdate)
      socketInstance.off('initial-member-list', handleInitialMemberList)
      socketInstance.off('member-joined', handleMemberJoined)
      socketInstance.off('member-left', handleMemberLeft)
      socketInstance.off('member-status', handleMemberStatus)
      socketInstance.off('chat-message', handleChatMessage)
      socketInstance.disconnect()
    }
  }, [actions, socketInstance])

  // Helper: ensure socket is connected then emit join-room for the given
  // room code. If the socket is already connected, the emit fires
  // immediately; otherwise it waits for the 'connect' event first.
  const joinSocketRoom = useCallback(
    (roomCode) => {
      if (!roomCode) return

      const doEmit = () => {
        console.log('[Socket] Emitting join-room for room:', roomCode)
        socketInstance.emit('join-room', {
          roomCode,
          senderId: currentUserIdRef.current,
        })
      }

      if (socketInstance.connected) {
        doEmit()
      } else {
        // Ensure auth is set, then connect and wait
        const token = getStoredToken()
        socketInstance.auth = token ? { token } : {}

        const onConnect = () => {
          socketInstance.off('connect', onConnect)
          doEmit()
        }
        socketInstance.on('connect', onConnect)

        if (!socketInstance.connecting) {
          socketInstance.connect()
        }
      }
    },
    [socketInstance],
  )

  const value = useMemo(
    () => ({
      socket: socketInstance,
      connected: connectionState === 'connected',
      connectionState,
      emitEvent: (eventName, payload) => {
        socketInstance?.emit(eventName, payload)
      },
      joinSocketRoom,
    }),
    [connectionState, socketInstance, joinSocketRoom],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}