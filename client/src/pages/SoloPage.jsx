import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Button } from '../components/ui/Button.jsx'
import { BrandMark } from '../components/ui/BrandMark.jsx'
import { Card } from '../components/ui/Card.jsx'
import { TimerDisplay } from '../components/pomodoro/TimerDisplay.jsx'
import { usePomodoroTimer } from '../hooks/usePomodoroTimer.js'
import { useWhiteNoise } from '../hooks/useWhiteNoise.js'
import { getPhaseAccent, getPhaseLabel, getProgressFraction, PHASES } from '../utils/pomodoro.js'

const emptyTaskDraft = {
  title: '',
  note: '',
}

function requestTimerNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') {
    return
  }

  Notification.requestPermission().catch(() => {})
}

export function SoloPage() {
  const { state, actions } = useApp()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [taskDraft, setTaskDraft] = useState(emptyTaskDraft)
  const [tasks, setTasks] = useState([])

  const timer = usePomodoroTimer(state.settings, {
    onPhaseComplete: ({ completedPhase, nextPhase, completedCycles }) => {
      const completedLabel = getPhaseLabel(completedPhase)
      const nextLabel = getPhaseLabel(nextPhase)
      const message = completedPhase === PHASES.FOCUS
        ? `Focus complete. ${nextLabel} started.`
        : `${completedLabel} finished. Back to focus.`

      setNotice(`${message} Completed cycles: ${completedCycles}.`)

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('SyncTroop session update', {
            body: message,
          })
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('SyncTroop session update', {
                body: message,
              })
            }
          }).catch(() => {})
        }
      }
    },
  })

  useWhiteNoise(state.settings.whiteNoise)

  useEffect(() => {
    if (!notice) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setNotice(''), 3800)

    return () => window.clearTimeout(timeoutId)
  }, [notice])

  const progress = getProgressFraction(timer.secondsLeft, timer.currentDuration)
  const activeTaskCount = tasks.filter((task) => !task.completed).length

  const handleStartStop = () => {
    requestTimerNotificationPermission()

    if (timer.isRunning) {
      timer.stop()
      return
    }

    timer.start()
  }

  const handleTaskDraftChange = (event) => {
    const { name, value } = event.target

    setTaskDraft((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleAddTask = (event) => {
    event.preventDefault()

    const title = taskDraft.title.trim()
    const note = taskDraft.note.trim()

    if (!title) {
      return
    }

    setTasks((current) => [
      {
        id: `${Date.now()}-${current.length + 1}`,
        title,
        note,
        completed: false,
      },
      ...current,
    ])
    setTaskDraft(emptyTaskDraft)
  }

  const handleToggleTask = (taskId) => {
    setTasks((current) => current.map((task) => (
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )))
  }

  const handleDeleteTask = (taskId) => {
    setTasks((current) => current.filter((t) => t.id !== taskId))
  }

  const details = (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        Cycle {timer.completedCycles + 1} of 4
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        {state.settings.focusMinutes} / {state.settings.shortBreakMinutes} / {state.settings.longBreakMinutes} min
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        Long break after 4 cycles
      </span>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(47,212,172,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,159,45,0.15),transparent_25%),linear-gradient(180deg,rgba(7,17,31,0.96),rgba(5,11,20,1))]" />
      <div className="absolute left-[-5rem] top-20 h-64 w-64 rounded-full bg-brand-400/12 blur-3xl animate-drift" />
      <div className="absolute right-[-4rem] top-32 h-72 w-72 rounded-full bg-accent-400/10 blur-3xl animate-drift" />

      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" size="sm" onClick={() => navigate('/')}>
              Back to home
            </Button>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
              Solo mode
            </span>
            <Button variant="secondary" size="sm" onClick={actions.openSettingsModal}>
              Global settings
            </Button>
            <Button
              variant={state.settings.whiteNoise ? 'outline' : 'glass'}
              size="sm"
              onClick={() => actions.updateSettings({ whiteNoise: !state.settings.whiteNoise })}
            >
              {state.settings.whiteNoise ? 'White noise on' : 'White noise off'}
            </Button>
          </div>
        </header>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-brand-200">Solo focus</p>
            <h1 className="text-4xl font-semibold text-white sm:text-5xl">Stay in one clean loop.</h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              Reverse countdown, adjustable sessions, automatic long breaks, optional white noise, and browser notifications for each phase change.
            </p>
          </div>

          {notice ? (
            <div className="rounded-3xl border border-brand-400/20 bg-brand-400/10 px-4 py-4 text-sm text-brand-50">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            <Card className="h-full">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Session summary</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ['Focus', `${state.settings.focusMinutes} min`],
                  ['Short break', `${state.settings.shortBreakMinutes} min`],
                  ['Long break', `${state.settings.longBreakMinutes} min`],
                  ['Cycles', 'Long break after 4'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="h-full">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Focus guide</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>Start the timer to run a reverse countdown for the current phase.</p>
                <p>When focus ends, the next break starts automatically and browser notifications fire if you allow them.</p>
                <p>The global settings modal updates all timer defaults across the app.</p>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 items-stretch">
          <TimerDisplay
            className="h-full"
            title="Pomodoro timer"
            subtitle="Focus blocks transition into short or long breaks automatically once the current phase ends."
            phaseLabel={timer.phaseLabel}
            secondsLeft={timer.secondsLeft}
            totalSeconds={timer.currentDuration}
            progress={progress}
            accent={getPhaseAccent(timer.phase)}
            details={details}
            actions={(
              <>
                <Button onClick={handleStartStop}>{timer.isRunning ? 'Stop' : 'Start'}</Button>
                <Button variant="secondary" onClick={timer.reset}>
                  Reset
                </Button>
              </>
            )}
          />

          <Card className="space-y-5 h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Task list</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">What needs to get done?</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {activeTaskCount} open
              </div>
            </div>

            <form className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4" onSubmit={handleAddTask}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">Task</span>
                <input
                  name="title"
                  value={taskDraft.title}
                  onChange={handleTaskDraftChange}
                  placeholder="Write the report summary"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-300/40 focus:outline-none focus:ring-2 focus:ring-brand-300/20"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">Note</span>
                <textarea
                  name="note"
                  value={taskDraft.note}
                  onChange={handleTaskDraftChange}
                  placeholder="Optional detail, checklist, or next step"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-300/40 focus:outline-none focus:ring-2 focus:ring-brand-300/20"
                />
              </label>

              <Button type="submit" size="sm" fullWidth>
                Add task
              </Button>
            </form>

            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/60">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-300/30"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-brand-400 focus:ring-brand-400/30"
                    />

                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-white ${task.completed ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </p>
                      {task.note ? <p className="mt-1 text-sm leading-6 text-slate-400">{task.note}</p> : null}
                    </div>

                    <div className="ml-3 flex items-start">
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-400"
                        aria-label={`Delete task ${task.title}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-400">
                  Add a few tasks here and keep the list scrollable as it grows.
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
