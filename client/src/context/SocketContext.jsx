import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useApp } from './AppContext.jsx'

const SocketContext = createContext(null)

function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin
}

export function SocketProvider({ children }) {
  const { state, actions } = useApp()
  const [socketInstance] = useState(() =>
    io(getSocketUrl(), {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    }),
  )
  const [connectionState, setConnectionState] = useState('connecting')
  const currentUserIdRef = useRef(state.user?.id)

  useEffect(() => {
    currentUserIdRef.current = state.user?.id
  }, [state.user?.id])

  useEffect(() => {
    const handleConnect = () => setConnectionState('connected')
    const handleDisconnect = () => setConnectionState('disconnected')
    const handleConnectError = () => setConnectionState('error')

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

      actions.upsertMember(payload.member || payload)
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

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('connect_error', handleConnectError)
    socketInstance.on('create-room', handleCreateRoom)
    socketInstance.on('join-room', handleJoinRoom)
    socketInstance.on('start-timer', handleStartTimer)
    socketInstance.on('sync-timer', handleSyncTimer)
    socketInstance.on('task-update', handleTaskUpdate)
    socketInstance.on('member-joined', handleMemberJoined)
    socketInstance.on('member-left', handleMemberLeft)
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
      socketInstance.off('member-joined', handleMemberJoined)
      socketInstance.off('member-left', handleMemberLeft)
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

export function useSocket() {
  const context = useContext(SocketContext)

  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }

  return context
}