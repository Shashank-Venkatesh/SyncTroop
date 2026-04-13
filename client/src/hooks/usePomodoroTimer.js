import { useEffect, useMemo, useRef, useState } from 'react'
import { createInitialSharedTimer, getNextPhase, getPhaseDuration, getPhaseLabel, PHASES } from '../utils/pomodoro.js'

export function usePomodoroTimer(settings, options = {}) {
  const initialTimer = useMemo(() => createInitialSharedTimer(settings), [settings])
  const [phase, setPhase] = useState(initialTimer.phase)
  const [secondsLeft, setSecondsLeft] = useState(initialTimer.secondsLeft)
  const [isRunning, setIsRunning] = useState(false)
  const [completedCycles, setCompletedCycles] = useState(initialTimer.cycleCount)

  const settingsRef = useRef(settings)
  const phaseRef = useRef(phase)
  const cyclesRef = useRef(completedCycles)
  const onPhaseCompleteRef = useRef(options.onPhaseComplete)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    cyclesRef.current = completedCycles
  }, [completedCycles])

  useEffect(() => {
    onPhaseCompleteRef.current = options.onPhaseComplete
  }, [options.onPhaseComplete])

  useEffect(() => {
    if (isRunning) {
      return
    }

    setSecondsLeft(getPhaseDuration(phaseRef.current, settings))
  }, [settings, isRunning])

  useEffect(() => {
    if (!isRunning) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds > 1) {
          return currentSeconds - 1
        }

        const nextSnapshot = getNextPhase(phaseRef.current, cyclesRef.current, settingsRef.current)
        const completedPhase = phaseRef.current

        if (completedPhase === PHASES.FOCUS) {
          cyclesRef.current = nextSnapshot.completedCycles
          setCompletedCycles(nextSnapshot.completedCycles)
        }

        phaseRef.current = nextSnapshot.nextPhase
        setPhase(nextSnapshot.nextPhase)

        onPhaseCompleteRef.current?.({
          completedPhase,
          nextPhase: nextSnapshot.nextPhase,
          completedCycles: nextSnapshot.completedCycles,
        })

        return nextSnapshot.duration
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRunning])

  const start = () => setIsRunning(true)
  const stop = () => setIsRunning(false)
  const reset = () => {
    const freshTimer = createInitialSharedTimer(settingsRef.current)

    setIsRunning(false)
    setPhase(freshTimer.phase)
    setCompletedCycles(0)
    phaseRef.current = freshTimer.phase
    cyclesRef.current = 0
    setSecondsLeft(freshTimer.secondsLeft)
  }

  const skipPhase = () => {
    const nextSnapshot = getNextPhase(phaseRef.current, cyclesRef.current, settingsRef.current)

    if (phaseRef.current === PHASES.FOCUS) {
      cyclesRef.current = nextSnapshot.completedCycles
      setCompletedCycles(nextSnapshot.completedCycles)
    }

    phaseRef.current = nextSnapshot.nextPhase
    setPhase(nextSnapshot.nextPhase)
    setSecondsLeft(nextSnapshot.duration)
  }

  return {
    phase,
    secondsLeft,
    isRunning,
    completedCycles,
    currentDuration: getPhaseDuration(phase, settings),
    phaseLabel: getPhaseLabel(phase),
    start,
    stop,
    reset,
    skipPhase,
    setPhase,
    setSecondsLeft,
  }
}