import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/ui/BrandMark.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useApp } from '../context/AppContext.jsx'
import { createRoom, joinRoom } from '../services/api.js'

export function GroupLobbyPage() {
  const { state, actions } = useApp()
  const navigate = useNavigate()
  const userFirstName = state.user?.name?.split(' ')[0] || 'My'
  const [roomName, setRoomName] = useState(`${userFirstName}'s room`)
  const [roomCode, setRoomCode] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState(null)

  const activeRoom = useMemo(() => state.room, [state.room])

  useEffect(() => {
    if (!state.user) {
      actions.openAuthModal('group', 'login')
      navigate('/', { replace: true })
    }
  }, [actions, navigate, state.user])

  useEffect(() => {
    setRoomName(`${userFirstName}'s room`)
  }, [userFirstName])

  const handleCreateRoom = async () => {
    if (!state.user) {
      actions.openAuthModal('group', 'login')
      navigate('/', { replace: true })
      return
    }

    setBusyAction('create')
    setStatus('')
    setError('')

    try {
      const payload = {
        roomName: roomName.trim() || `${state.user.name.split(' ')[0]}'s Focus Room`,
      }

      const bundle = await createRoom(payload)

      actions.setRoomBundle(bundle)

      navigate(`/group/${bundle.room.code}`)
      setStatus(`Room ${bundle.room.code} created.`)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not create the room right now.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleJoinRoom = async () => {
    if (!state.user) {
      actions.openAuthModal('group', 'login')
      navigate('/', { replace: true })
      return
    }

    const normalizedRoomCode = roomCode.trim().toUpperCase()

    if (!normalizedRoomCode) {
      setError('Enter a room code to join.')
      return
    }

    setBusyAction('join')
    setStatus('')
    setError('')

    try {
      const response = await joinRoom({
        roomCode: normalizedRoomCode,
      })

      const { room } = response

      actions.setRoomBundle(response)

      navigate(`/group/${room.code}`)
      setStatus(`Joined room ${room.code}.`)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not join that room.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(47,212,172,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,159,45,0.14),transparent_26%),linear-gradient(180deg,rgba(7,17,31,0.96),rgba(5,11,20,1))]" />

      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
              Back to home
            </Button>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
              Current room: {activeRoom?.code || 'none'}
            </div>
          </div>
        </header>

        <section className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.32em] text-brand-200">Group lobby</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Create a room or jump into an existing one.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            The room creator controls the timer. Everyone sees the same countdown, shared tasks,
            member presence, and realtime chat.
          </p>
        </section>

        {status ? (
          <div className="rounded-3xl border border-brand-400/20 bg-brand-400/10 px-4 py-4 text-sm text-brand-50">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Create room</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Spin up a new group session</h2>
            </div>

            <Input
              label="Room name"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Thursday planning room"
            />

            <Button
              fullWidth
              size="lg"
              onClick={handleCreateRoom}
              disabled={busyAction === 'create'}
            >
              {busyAction === 'create' ? 'Creating...' : 'Create Room'}
            </Button>

            <p className="text-sm leading-6 text-slate-400">
              A fresh room code is generated automatically. The creator starts the synced timer
              and can assign tasks.
            </p>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Join room</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Enter a room code</h2>
            </div>

            <Input
              label="Room code"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
            />

            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onClick={handleJoinRoom}
              disabled={busyAction === 'join'}
            >
              {busyAction === 'join' ? 'Joining...' : 'Join Room'}
            </Button>

            <p className="text-sm leading-6 text-slate-400">
              Everyone in the room shares timer updates, task state, member presence, and chat
              messages in realtime.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}