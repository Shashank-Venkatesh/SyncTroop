import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useSocket } from './useSocket.js'
import { getPhaseDuration } from '../utils/pomodoro.js'

export function useSharedTimer(roomCode) {
  const { state, actions } = useApp()
  const { emitEvent } = useSocket()

  const timer = state.sharedTimer
  const currentUser = state.user
  const isCreator = Boolean(currentUser && state.room && state.room.creatorId === currentUser.id)

  useEffect(() => {
    if (!timer.isRunning) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      actions.tickSharedTimer()
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timer.isRunning, actions])

  useEffect(() => {
    if (!roomCode || !currentUser) {
      return
    }

    if (timer.isRunning && isCreator) {
      // Throttle timer sync: emit every 10 seconds, or near the end (<= 2 seconds),
      // to avoid high socket traffic and database writes.
      const shouldSync = timer.secondsLeft % 10 === 0 || timer.secondsLeft <= 2
      if (shouldSync) {
        emitEvent('sync-timer', {
          roomCode,
          timer,
          senderId: currentUser.id,
        })
      }
    }
  }, [roomCode, timer.isRunning, timer.phase, timer.secondsLeft, timer.cycleCount, isCreator, emitEvent, currentUser])

  const start = () => {
    if (!isCreator || timer.isRunning || !currentUser) {
      return
    }

    actions.startSharedTimer(currentUser.id)
    emitEvent('start-timer', {
      roomCode,
      timer: {
        ...timer,
        isRunning: true,
        startedBy: currentUser.id,
      },
      senderId: currentUser.id,
    })
  }

  const reset = () => {
    if (!isCreator) {
      return
    }

    actions.resetSharedTimer()
    emitEvent('sync-timer', {
      roomCode,
      timer: {
        phase: 'focus',
        secondsLeft: getPhaseDuration('focus', state.settings),
        isRunning: false,
        startedBy: null,
        cycleCount: 0,
        lastUpdatedAt: Date.now(),
      },
      senderId: currentUser?.id,
    })
  }

  return {
    timer,
    isCreator,
    start,
    reset,
  }
}