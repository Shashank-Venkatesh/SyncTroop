import { Server as SocketIOServer } from 'socket.io'
import Room from './models/Room.js'
import { normalizeRoomCode } from './utils/roomUtils.js'

function toId(value) {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || '')
  }

  return value ? String(value) : ''
}

function joinSocketRoom(socket, payload = {}) {
  const roomCode = normalizeRoomCode(payload.roomCode || payload.room?.code || payload.code)

  if (!roomCode) {
    return ''
  }

  socket.join(roomCode)
  socket.data.roomCode = roomCode

  const senderId = toId(payload.senderId || payload.member?.id || payload.memberId || payload.user?.id || payload.room?.creatorId)

  if (senderId) {
    socket.data.userId = senderId
  }

  return roomCode
}

function normalizeMemberPayload(payload = {}) {
  const source = payload.member && typeof payload.member === 'object' ? payload.member : payload
  const id = toId(source.id || source._id || source.userId || payload.senderId)
  const roomCreatorId = toId(payload.room?.creatorId || payload.room?.creator)

  return {
    id,
    name: String(source.name || source.username || '').trim(),
    email: source.email ? String(source.email) : '',
    avatar: source.avatar ? String(source.avatar) : '',
    role: source.role === 'creator' || (roomCreatorId && roomCreatorId === id) ? 'creator' : 'member',
    status: source.status === 'away' ? 'away' : 'online',
  }
}

function normalizeMessagePayload(payload = {}) {
  const source = payload.message && typeof payload.message === 'object' ? payload.message : payload
  const messageText = String(source.message || source.text || '').trim()

  return {
    id: toId(source.id || source._id),
    userId: toId(source.userId || source.user?.id || payload.senderId),
    username: String(source.username || source.user?.name || '').trim(),
    avatar: source.avatar ? String(source.avatar) : source.user?.avatar ? String(source.user.avatar) : '',
    message: messageText,
    timestamp: source.timestamp || new Date().toISOString(),
    workFocused: source.workFocused !== false,
  }
}

function normalizeTimerPayload(payload = {}) {
  const source = payload.timer && typeof payload.timer === 'object' ? payload.timer : payload

  return {
    phase: source.phase || 'focus',
    secondsLeft: Number.isFinite(Number(source.secondsLeft)) ? Number(source.secondsLeft) : 1500,
    isRunning: Boolean(source.isRunning),
    startedBy: source.startedBy ? String(source.startedBy) : null,
    cycleCount: Number.isFinite(Number(source.cycleCount)) ? Number(source.cycleCount) : 0,
    lastUpdatedAt: source.lastUpdatedAt || Date.now(),
  }
}

async function upsertRoomMember(roomCode, memberPayload) {
  const room = await Room.findOne({ code: roomCode })

  if (!room || !memberPayload.id) {
    return null
  }

  const existingMember = room.members.find((member) => member.user.toString() === memberPayload.id)

  if (existingMember) {
    existingMember.role = memberPayload.role || existingMember.role || 'member'
    existingMember.status = memberPayload.status || 'online'
  } else {
    room.members.push({
      user: memberPayload.id,
      role: memberPayload.role || 'member',
      status: memberPayload.status || 'online',
    })
  }

  await room.save()

  return memberPayload
}

async function markRoomMemberAway(roomCode, memberId) {
  const room = await Room.findOne({ code: roomCode })

  if (!room || !memberId) {
    return false
  }

  const existingMember = room.members.find((member) => member.user.toString() === memberId)

  if (!existingMember) {
    return false
  }

  existingMember.status = 'away'
  await room.save()

  return true
}

async function saveRoomMessage(roomCode, messagePayload) {
  const room = await Room.findOne({ code: roomCode })

  if (!room || !messagePayload.userId || !messagePayload.message) {
    return null
  }

  const message = room.messages.create({
    user: messagePayload.userId,
    message: messagePayload.message,
    workFocused: messagePayload.workFocused,
  })

  room.messages.push(message)
  await room.save()

  return {
    id: message._id.toString(),
    userId: messagePayload.userId,
    username: messagePayload.username,
    avatar: messagePayload.avatar,
    message: messagePayload.message,
    timestamp: message.createdAt,
    workFocused: messagePayload.workFocused,
  }
}

async function updateRoomTimer(roomCode, timerPayload) {
  const room = await Room.findOne({ code: roomCode })

  if (!room) {
    return null
  }

  room.sharedTimer.phase = timerPayload.phase
  room.sharedTimer.secondsLeft = timerPayload.secondsLeft
  room.sharedTimer.isRunning = timerPayload.isRunning
  room.sharedTimer.startedBy = timerPayload.startedBy || null
  room.sharedTimer.cycleCount = timerPayload.cycleCount
  room.sharedTimer.lastUpdatedAt = timerPayload.lastUpdatedAt

  await room.save()

  return timerPayload
}

function handleSocketError(eventName, error) {
  console.error(`Socket event ${eventName} failed:`, error)
}

export function initializeSocket(server, { origin = 'http://localhost:5173' } = {}) {
  const io = new SocketIOServer(server, {
    cors: {
      origin,
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    socket.on('create-room', (payload = {}) => {
      joinSocketRoom(socket, payload)
    })

    socket.on('join-room', (payload = {}) => {
      joinSocketRoom(socket, payload)
    })

    socket.on('member-joined', async (payload = {}) => {
      try {
        const roomCode = joinSocketRoom(socket, payload)

        if (!roomCode) {
          return
        }

        const member = normalizeMemberPayload(payload)

        if (!member.id) {
          return
        }

        const savedMember = await upsertRoomMember(roomCode, member)

        if (savedMember) {
          socket.to(roomCode).emit('member-joined', {
            roomCode,
            member: savedMember,
            senderId: payload.senderId || savedMember.id,
          })
        }
      } catch (error) {
        handleSocketError('member-joined', error)
      }
    })

    socket.on('member-left', async (payload = {}) => {
      try {
        const roomCode = joinSocketRoom(socket, payload)

        if (!roomCode) {
          return
        }

        const memberId = toId(payload.memberId || payload.member?.id || payload.id || socket.data.userId || payload.senderId)

        if (!memberId) {
          return
        }

        const updated = await markRoomMemberAway(roomCode, memberId)

        if (updated) {
          socket.to(roomCode).emit('member-left', {
            roomCode,
            memberId,
            senderId: payload.senderId || memberId,
          })
        }
      } catch (error) {
        handleSocketError('member-left', error)
      }
    })

    socket.on('chat-message', async (payload = {}) => {
      try {
        const roomCode = joinSocketRoom(socket, payload)

        if (!roomCode) {
          return
        }

        const message = normalizeMessagePayload(payload)

        if (!message.userId || !message.message) {
          return
        }

        const savedMessage = await saveRoomMessage(roomCode, message)

        if (savedMessage) {
          socket.to(roomCode).emit('chat-message', {
            roomCode,
            message: savedMessage,
            senderId: payload.senderId || savedMessage.userId,
          })
        }
      } catch (error) {
        handleSocketError('chat-message', error)
      }
    })

    socket.on('task-update', (payload = {}) => {
      try {
        const roomCode = joinSocketRoom(socket, payload)

        if (!roomCode) {
          return
        }

        socket.to(roomCode).emit('task-update', payload)
      } catch (error) {
        handleSocketError('task-update', error)
      }
    })

    socket.on('start-timer', async (payload = {}) => {
      try {
        const roomCode = joinSocketRoom(socket, payload)

        if (!roomCode) {
          return
        }

        const timer = normalizeTimerPayload(payload)
        await updateRoomTimer(roomCode, timer)

        socket.to(roomCode).emit('start-timer', {
          roomCode,
          timer,
          senderId: payload.senderId || timer.startedBy,
        })
      } catch (error) {
        handleSocketError('start-timer', error)
      }
    })

    socket.on('sync-timer', async (payload = {}) => {
      try {
        const roomCode = joinSocketRoom(socket, payload)

        if (!roomCode) {
          return
        }

        const timer = normalizeTimerPayload(payload)
        await updateRoomTimer(roomCode, timer)

        socket.to(roomCode).emit('sync-timer', {
          roomCode,
          timer,
          senderId: payload.senderId || timer.startedBy,
        })
      } catch (error) {
        handleSocketError('sync-timer', error)
      }
    })
  })

  return io
}
