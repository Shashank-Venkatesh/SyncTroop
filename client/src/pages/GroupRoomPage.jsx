import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BrandMark } from '../components/ui/BrandMark.jsx'
import { Avatar } from '../components/ui/Avatar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Tooltip } from '../components/ui/Tooltip.jsx'
import { TimerDisplay } from '../components/pomodoro/TimerDisplay.jsx'
import { TasksCard } from '../components/group/TasksCard.jsx'
import { ChatCard } from '../components/group/ChatCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useSharedTimer } from '../hooks/useSharedTimer.js'
import { useNetworkStatus } from '../hooks/useNetworkStatus.js'
import { useSocket } from '../hooks/useSocket.js'
import { joinRoom } from '../services/api.js'
import { cn } from '../utils/classNames.js'
import { getPhaseAccent, getProgressFraction, getPhaseLabel } from '../utils/pomodoro.js'

function getCrewStatusTone(status) {
  switch (status) {
    case 'away':
      return 'bg-accent-400/15 text-accent-100'
    case 'offline':
      return 'bg-white/8 text-slate-300'
    default:
      return 'bg-emerald-400/15 text-emerald-100'
  }
}

function getCrewStatusLabel(status) {
  switch (status) {
    case 'away':
      return 'Away'
    case 'offline':
      return 'Disconnected'
    default:
      return 'Online'
  }
}

export function GroupRoomPage() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { emitEvent, connectionState, joinSocketRoom } = useSocket()
  const networkStatus = useNetworkStatus()
  const [roomPanel, setRoomPanel] = useState('rules')
  const [isRoomCodeCopied, setIsRoomCodeCopied] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const socketRoomSyncKeyRef = useRef('')

  const currentUser = state.user
  const currentUserId = currentUser?.id || null
  const isCreator = Boolean(state.room?.creatorId && currentUser?.id && state.room.creatorId === currentUser.id)
  const canOpenGlobalSettings = isCreator
  const sharedTimer = useSharedTimer(roomCode)

  const room = useMemo(() => state.room, [state.room])
  const roomDisplayCode = room?.code || roomCode || ''
  const hasInternet = networkStatus.isOnline !== false
  const connectionLabel = hasInternet && connectionState === 'connected' ? 'connected' : 'disconnected'
  const crewMembers = useMemo(() => {
    return [...state.members].sort((left, right) => {
      if (left.id === currentUserId) {
        return -1
      }

      if (right.id === currentUserId) {
        return 1
      }

      if (left.role === 'creator' && right.role !== 'creator') {
        return -1
      }

      if (right.role === 'creator' && left.role !== 'creator') {
        return 1
      }

      return left.name.localeCompare(right.name)
    })
  }, [currentUserId, state.members])

  const hydratedRoomRef = useRef(null)
  const currentUserRef = useRef(currentUser)

  // Keep currentUserRef in sync
  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  // Step 1: Hydrate room data from the API. This MUST complete before we
  // attempt to join the Socket.io room, otherwise the socket join-room
  // event may use a stale room code from a previous session.
  useEffect(() => {
    let isActive = true

    async function hydrateRoom() {
      const user = currentUserRef.current
      
      if (!roomCode || !user) {
        navigate('/group', { replace: true })
        return
      }

      // Only hydrate once per room to avoid duplicate API calls
      if (hydratedRoomRef.current === roomCode) {
        return
      }
      hydratedRoomRef.current = roomCode

      try {
        // Call joinRoom to ensure user is synced with server's member list
        const bundle = await joinRoom({ roomCode, user })

        if (!isActive) {
          return
        }

        console.log('[GroupRoom] Room bundle received:', {
          roomCode: bundle.room?.code,
          creatorId: bundle.room?.creatorId,
          creatorName: bundle.room?.creatorName,
          membersCount: bundle.members?.length,
          tasksCount: bundle.tasks?.length,
        })

        // Set the room bundle with all the data from the server
        actions.setRoomBundle(bundle)

        // Mark hydration as complete — this unblocks the socket join effect
        setIsHydrated(true)
      } catch (err) {
        if (!isActive) {
          return
        }

        console.error('[GroupRoom] Failed to load room:', err?.message || err)
        actions.clearRoom()
        navigate('/group', { replace: true })
      }
    }

    hydrateRoom()

    return () => {
      isActive = false
    }
  }, [roomCode, navigate, actions])

  // Step 2: Join the Socket.io room ONLY after hydration has confirmed the
  // room exists on the server. Uses joinSocketRoom() which handles the
  // connect → auth → emit sequence atomically, preventing the race where
  // join-room fires before the socket is authenticated or connected.
  useEffect(() => {
    if (!isHydrated || !roomCode || !currentUser?.id) {
      return
    }

    const syncKey = `${roomCode}:${currentUser.id}`

    if (socketRoomSyncKeyRef.current === syncKey) {
      return
    }

    socketRoomSyncKeyRef.current = syncKey

    // Use the helper that guarantees auth + connection before emitting
    joinSocketRoom(roomCode)
  }, [isHydrated, roomCode, currentUser?.id, joinSocketRoom])

  // Reset socket sync key when socket disconnects so we re-join on reconnect
  useEffect(() => {
    if (connectionState !== 'connected') {
      socketRoomSyncKeyRef.current = ''
    }
  }, [connectionState])

  useEffect(() => {
    if (!room?.code || room?.code !== roomCode) {
      socketRoomSyncKeyRef.current = ''
    }
  }, [room?.code, roomCode])

  // Reset hydration state when component unmounts or room changes
  useEffect(() => {
    return () => {
      setIsHydrated(false)
      if (roomCode !== hydratedRoomRef.current) {
        hydratedRoomRef.current = null
      }
    }
  }, [roomCode])

  useEffect(() => {
    if (!isRoomCodeCopied) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setIsRoomCodeCopied(false), 1600)

    return () => window.clearTimeout(timeoutId)
  }, [isRoomCodeCopied])

  const handleToggleTimer = () => {
    if (sharedTimer.timer.isRunning) {
      return
    }

    sharedTimer.start()
  }

  const handleResetTimer = () => {
    sharedTimer.reset()
  }

  const handleCopyRoomCode = async () => {
    if (!roomDisplayCode) {
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomDisplayCode)
      } else {
        const temporaryInput = document.createElement('textarea')
        temporaryInput.value = roomDisplayCode
        temporaryInput.setAttribute('readonly', '')
        temporaryInput.style.position = 'absolute'
        temporaryInput.style.left = '-9999px'
        document.body.appendChild(temporaryInput)
        temporaryInput.select()
        document.execCommand('copy')
        document.body.removeChild(temporaryInput)
      }

      setIsRoomCodeCopied(true)
    } catch {
      setIsRoomCodeCopied(false)
    }
  }

  const handleCreateTask = ({ title, assignedToId }) => {
    if (!currentUser?.id) {
      return
    }

    // Validate task title
    if (!title || !title.trim()) {
      return
    }

    const assignee = state.members.find((member) => member.id === assignedToId) || currentUser

    const nextTask = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Math.random().toString(36).slice(2, 10)}`,
      title: title.trim(),
      assignedToId: assignee.id,
      assignedToName: assignee.name,
      completed: false,
      completedBy: null,
      updatedAt: new Date().toISOString(),
    }

    actions.upsertTask(nextTask)
    emitEvent('task-update', {
      roomCode,
      action: 'create',
      task: nextTask,
      senderId: currentUser.id,
    })
  }

  const handleToggleTask = (task) => {
    if (!currentUser?.id) {
      return
    }

    const nextTask = {
      ...task,
      completed: !task.completed,
      completedBy: task.completed ? null : currentUser.name,
      updatedAt: new Date().toISOString(),
    }

    actions.upsertTask(nextTask)
    emitEvent('task-update', {
      roomCode,
      action: 'toggle',
      task: nextTask,
      senderId: currentUser.id,
    })
  }

  const handleDeleteTask = (task) => {
    const nextTasks = state.tasks.filter((t) => t.id !== task.id)

    actions.setTasks(nextTasks)
    emitEvent('task-update', {
      roomCode,
      action: 'delete',
      taskId: task.id,
      tasks: nextTasks,
      senderId: currentUser.id,
    })
  }

  const handleSendMessage = ({ message, workFocused }) => {
    if (!currentUser?.id) {
      return
    }

    // Validate message
    if (!message || !message.trim()) {
      return
    }

    const nextMessage = {
      userId: currentUser.id,
      username: currentUser.name,
      avatar: currentUser.avatar,
      message: message.trim(),
      workFocused,
    }

    emitEvent('chat-message', {
      roomCode,
      message: nextMessage,
      senderId: currentUser.id,
    })
  }

  const handleLeaveRoom = () => {
    if (!currentUser?.id) {
      actions.clearRoom()
      navigate('/group')
      return
    }

    emitEvent('member-left', {
      roomCode,
      memberId: currentUser.id,
      senderId: currentUser.id,
    })
    hydratedRoomRef.current = null // Reset hydration state when leaving
    actions.clearRoom()
    navigate('/group')
  }

  const timerProgress = getProgressFraction(sharedTimer.timer.secondsLeft, sharedTimer.timer.phase === 'focus'
    ? state.settings.focusMinutes * 60
    : sharedTimer.timer.phase === 'shortBreak'
      ? state.settings.shortBreakMinutes * 60
      : state.settings.longBreakMinutes * 60)
  const timerTotalSeconds = sharedTimer.timer.phase === 'focus'
    ? state.settings.focusMinutes * 60
    : sharedTimer.timer.phase === 'shortBreak'
      ? state.settings.shortBreakMinutes * 60
      : state.settings.longBreakMinutes * 60
  const timerInfoCards = [
    {
      label: 'Focus timer',
      value: `${state.settings.focusMinutes} min`,
      helper: 'Current work block length',
    },
    {
      label: 'Short break',
      value: `${state.settings.shortBreakMinutes} min`,
      helper: 'Between sprint resets',
    },
    {
      label: 'Long break',
      value: `${state.settings.longBreakMinutes} min`,
      helper: `After ${state.settings.cyclesBeforeLongBreak} sprints`,
    },
    {
      label: 'Sprints done',
      value: String(sharedTimer.timer.cycleCount),
      helper: 'Completed focus rounds',
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(47,212,172,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,159,45,0.14),transparent_24%),linear-gradient(180deg,rgba(7,17,31,0.96),rgba(5,11,20,1))]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <BrandMark />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-300">Room {roomDisplayCode}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full border border-white/10 bg-white/10 px-2.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-100 hover:bg-white/15"
                onClick={handleCopyRoomCode}
                aria-label="Copy room code"
              >
                {isRoomCodeCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <span className={cn(
              'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em]',
              connectionLabel === 'connected'
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                : 'border-white/10 bg-white/5 text-slate-300',
            )}>
              {connectionLabel}
            </span>
            {!hasInternet ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-100">
                internet offline
              </span>
            ) : null}
            {canOpenGlobalSettings ? (
              <Button variant="secondary" size="sm" onClick={actions.openSettingsModal}>
                Global settings
              </Button>
            ) : null}
            <Button variant="danger" size="sm" onClick={handleLeaveRoom}>
              Leave room
            </Button>
          </div>
        </header>

        <section className="space-y-6">
          <div className="space-y-3 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-brand-200">Group room</p>
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-4xl font-semibold text-white sm:text-5xl">{room?.name || 'Realtime focus room'}</h1>
              <Tooltip
                label="Room overview"
                content="The room creator controls a single shared Pomodoro timer. Tasks, members, and chat stay synced through Socket.io listeners."
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] xl:items-stretch">
            <TimerDisplay
              className="h-full"
              title="Focus session"
              subtitle="Shared clock for the room. Start and reset stay with the creator, while everyone tracks the same phase."
              phaseLabel={getPhaseLabel(sharedTimer.timer.phase)}
              secondsLeft={sharedTimer.timer.secondsLeft}
              totalSeconds={timerTotalSeconds}
              progress={timerProgress}
              accent={getPhaseAccent(sharedTimer.timer.phase)}
              infoCards={timerInfoCards}
              actions={
                <>
                  <Button onClick={handleToggleTimer} disabled={!sharedTimer.isCreator || sharedTimer.timer.isRunning}>
                    {sharedTimer.timer.isRunning ? 'Running' : sharedTimer.isCreator ? 'Start timer' : 'Creator only'}
                  </Button>
                  <Button variant="secondary" onClick={handleResetTimer} disabled={!sharedTimer.isCreator}>
                    Reset
                  </Button>
                </>
              }
            />

            <TasksCard
              tasks={state.tasks}
              members={state.members}
              currentUser={currentUser}
              isCreator={isCreator}
              onCreateTask={handleCreateTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-stretch">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Room space</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Rules and crew</h3>
              </div>

              <div className="inline-grid w-full max-w-[15rem] grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1">
                {[
                  { id: 'rules', label: 'Rules' },
                  { id: 'crew', label: 'Crew' },
                ].map((option) => {
                  const active = roomPanel === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRoomPanel(option.id)}
                      className={cn(
                        'w-full rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition',
                        active ? 'bg-brand-400/20 text-white shadow-float' : 'text-slate-400 hover:text-slate-200',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="min-h-[14rem] rounded-3xl border border-white/10 bg-white/5 p-4 transition-[min-height] duration-300">
              {roomPanel === 'rules' ? (
                <div className="space-y-3 text-sm leading-6 text-slate-300">
                  <p>Only the creator can start the shared timer.</p>
                  <p>The timer never pauses; it moves from focus to break automatically.</p>
                  <p>Every task completion, member update, and chat message is mirrored to the room.</p>
                </div>
              ) : crewMembers.length > 0 ? (
                <div className="overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-full justify-center">
                    <div className="flex w-max gap-3 snap-x snap-mandatory">
                      {crewMembers.map((member) => (
                        <div
                          key={member.id}
                          className={cn(
                            'min-w-[12rem] snap-start rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-float',
                            member.id === currentUser.id && 'border-brand-400/30 bg-brand-400/10',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar src={member.avatar} name={member.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{member.name}</p>
                              <p className="truncate text-xs text-slate-400">{member.email}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
                                getCrewStatusTone(member.status),
                              )}
                            >
                              {getCrewStatusLabel(member.status)}
                            </span>
                            {member.role === 'creator' ? (
                              <span className="rounded-full bg-brand-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-100">
                                Creator
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                  No crew members are connected yet.
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Members', `${state.members.length} joined`],
                ['Tasks', `${state.tasks.length} active`],
                ['Chat', `${state.messages.length} messages`],
                ['Status', connectionLabel],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <ChatCard
            messages={state.messages}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
              connected={connectionLabel === 'connected'}
          />
        </section>
      </div>
    </div>
  )
}