import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useApp } from './AppContext.jsx'

export const SocketContext = createContext(null)

function getSocketUrl() {
  // Try explicit socket URL first
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
  
  if (explicitSocketUrl && /^https?:\/\//i.test(explicitSocketUrl)) {
    return explicitSocketUrl;
  }

  // Try explicit API URL
  const explicitApiUrl = import.meta.env.VITE_API_URL;
  
  if (explicitApiUrl && /^https?:\/\//i.test(explicitApiUrl)) {
    try {
      const parsedUrl = new URL(explicitApiUrl);
      
      if (parsedUrl.pathname.endsWith('/api')) {
        parsedUrl.pathname = parsedUrl.pathname.slice(0, -4) || '/';
      }
      
      parsedUrl.search = '';
      parsedUrl.hash = '';
      
      const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '')}`;
      console.log('[Socket] Using URL from VITE_API_URL:', baseUrl);
      return baseUrl;
    } catch (err) {
      console.error('[Socket] Invalid VITE_API_URL:', explicitApiUrl, err);
    }
  }

  // In development, use localhost:3000; in production, use current origin
  const defaultUrl = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
  console.log('[Socket] Using default URL:', defaultUrl);
  return defaultUrl;
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

  useEffect(() => {
    currentUserIdRef.current = state.user?.id
  }, [state.user?.id])

  useEffect(() => {
    const token = getStoredToken()
    socketInstance.auth = token ? { token } : {}
  }, [socketInstance, state.user?.id])

  useEffect(() => {
    const hasActiveRoom = Boolean(state.room?.code)

    if (hasActiveRoom) {
      if (!socketInstance.connected) {
        socketInstance.connect()
      }
      return
    }

    if (socketInstance.connected) {
      socketInstance.disconnect()
    }
  }, [socketInstance, state.room?.code])

  useEffect(() => {
    const handleConnect = () => setConnectionState('connected')
    const handleDisconnect = () => setConnectionState('disconnected')
    const handleConnectError = (error) => {
      console.error('[Socket] Connection error:', error?.message || error)
      setConnectionState('error')
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

      actions.syncSharedTimer(payload.timer || payload)
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

      actions.upsertMember(member)

      if (memberId && currentUserIdRef.current && memberId === currentUserIdRef.current) {
        return
      }

      const notification = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'success',
        title: 'Member joined',
        message: `${member?.name || 'A teammate'} joined the room.`,
        duration: 3200,
      }
      actions.addNotification(notification)
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
        actions.removeMember(memberId)
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

      actions.upsertMember(payload.member)
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

  const value = useMemo(
    () => ({
      socket: socketInstance,
      connected: connectionState === 'connected',
      connectionState,
      emitEvent: (eventName, payload) => {
        socketInstance?.emit(eventName, payload)
      },
    }),
    [connectionState, socketInstance],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}