import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import Room from './models/Room.js'
import User from './models/User.js'
import { normalizeRoomCode } from './utils/roomUtils.js'

function toId(value) {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || '')
  }

  return value ? String(value) : ''
}

function parseCookies(cookieHeader = '') {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce((accumulator, pair) => {
    const [rawKey, ...rawValue] = pair.split('=')
    const key = rawKey?.trim()

    if (!key) {
      return accumulator
    }

    accumulator[key] = decodeURIComponent(rawValue.join('=').trim())
    return accumulator
  }, {})
}

function extractSocketToken(socket) {
  const authorization = socket.handshake.headers?.authorization

  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim()
  }

  const cookies = parseCookies(socket.handshake.headers?.cookie)

  if (cookies.token) {
    return cookies.token
  }

  return typeof socket.handshake.auth?.token === 'string'
    ? socket.handshake.auth.token
    : ''
}

function resolveRoomCode(socket, payload = {}) {
  return normalizeRoomCode(payload.roomCode || payload.room?.code || payload.code || socket.data.roomCode)
}

async function canAccessRoom(roomCode, userId) {
  if (!roomCode || !userId) {
    return false
  }

  const room = await Room.findOne({
    code: roomCode,
    'members.user': userId,
  }).select('_id')

  return Boolean(room)
}

async function joinSocketRoom(socket, payload = {}, eventName = 'unknown') {
  const roomCode = resolveRoomCode(socket, payload)

  if (!roomCode) {
    return ''
  }

  const hasRoomAccess = await canAccessRoom(roomCode, socket.data.userId)

  if (!hasRoomAccess) {
    console.warn(
      `[Socket] ${eventName}: denied room access for user ${socket.data.userId} to room ${roomCode}`,
    )
    socket.emit('socket-error', {
      event: eventName,
      message: 'Not authorized for this room.',
    })
    return ''
  }

  socket.join(roomCode)
  socket.data.roomCode = roomCode

  return roomCode
}

function normalizeMemberPayload(payload = {}, authenticatedUserId = '') {
  const source = payload.member && typeof payload.member === 'object' ? payload.member : payload
  const id = toId(authenticatedUserId)
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
    userId: toId(payload.authenticatedUserId),
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

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket)

      if (!token) {
        return next(new Error('UNAUTHORIZED'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('_id')

      if (!user) {
        return next(new Error('UNAUTHORIZED'))
      }

      socket.data.userId = user._id.toString()
      return next()
    } catch {
      return next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] Authenticated connection: ${socket.id} (user: ${socket.data.userId})`)

    socket.on('create-room', async (payload = {}) => {
      const roomCode = await joinSocketRoom(socket, payload, 'create-room')

      if (!roomCode) {
        return
      }

      console.log(`[Socket] create-room: user ${socket.data.userId} joined room ${roomCode}, socket: ${socket.id}`)
    })

    socket.on('join-room', async (payload = {}) => {
      const roomCode = await joinSocketRoom(socket, payload, 'join-room')

      if (roomCode) {
        console.log(`[Socket] join-room: user ${socket.data.userId} joined room ${roomCode}, socket: ${socket.id}`)
      }

      if (!roomCode) return

      try {
        // Send initial member list to the joining user
        const room = await Room.findOne({ code: roomCode }).populate('members.user', 'name email avatar')
        if (room && room.members.length > 0) {
          const membersList = room.members.map((m) => ({
            id: m.user._id.toString(),
            name: m.user.name || '',
            email: m.user.email || '',
            avatar: m.user.avatar || '',
            role: m.role,
            status: m.status,
          }))
          
          console.log(`[Socket] Sending initial member list to ${socket.data.userId} in room ${roomCode}`)
          socket.emit('initial-member-list', {
            roomCode,
            members: membersList,
          })
        }
        // Note: member-joined is already broadcast by the API's joinRoom endpoint
        // No need to broadcast again here to avoid duplicates
      } catch (error) {
        console.error(`[Socket] Error handling join-room:`, error)
      }
    })

    socket.on('member-joined', async (payload = {}) => {
      try {
        const roomCode = await joinSocketRoom(socket, payload, 'member-joined')
        console.log(`[Socket] member-joined event: user ${socket.data.userId} in room ${roomCode}`, payload)

        if (!roomCode) {
          console.warn(`[Socket] member-joined: invalid room code`)
          return
        }

        const member = normalizeMemberPayload(payload, socket.data.userId)

        if (!member.id) {
          console.warn(`[Socket] member-joined: invalid member id`)
          return
        }

        const savedMember = await upsertRoomMember(roomCode, member)

        if (savedMember) {
          console.log(`[Socket] Broadcasting member-joined to room ${roomCode}:`, savedMember)
          console.log(`[Broadcast] 📢 User "${savedMember.name}" (ID: ${savedMember.id}) JOINED room "${roomCode}"`)
          console.log(`[Broadcast] 🎯 Sending to all clients in room: ${roomCode}`)
          io.to(roomCode).emit('member-joined', {
            roomCode,
            member: savedMember,
            senderId: socket.data.userId,
          })
          console.log(`[Broadcast] ✅ Broadcast complete for join event in room: ${roomCode}`)
        }
      } catch (error) {
        handleSocketError('member-joined', error)
      }
    })

    socket.on('member-left', async (payload = {}) => {
      try {
        const roomCode = await joinSocketRoom(socket, payload, 'member-left')

        if (!roomCode) {
          return
        }

        const memberId = toId(socket.data.userId)

        if (!memberId) {
          return
        }

        const updated = await markRoomMemberAway(roomCode, memberId)

        if (updated) {
          console.log(`[Broadcast] 📢 User (ID: ${memberId}) LEFT room "${roomCode}"`)
          console.log(`[Broadcast] 🎯 Sending to all clients in room: ${roomCode}`)
          socket.to(roomCode).emit('member-left', {
            roomCode,
            memberId,
            senderId: socket.data.userId,
          })
          console.log(`[Broadcast] ✅ Broadcast complete for leave event in room: ${roomCode}`)
        }
      } catch (error) {
        handleSocketError('member-left', error)
      }
    })

    socket.on('chat-message', async (payload = {}) => {
      try {
        const roomCode = await joinSocketRoom(socket, payload, 'chat-message')

        if (!roomCode) {
          return
        }

        const message = normalizeMessagePayload({ ...payload, authenticatedUserId: socket.data.userId })

        if (!message.userId || !message.message) {
          return
        }

        const savedMessage = await saveRoomMessage(roomCode, message)

        if (savedMessage) {
          socket.to(roomCode).emit('chat-message', {
            roomCode,
            message: savedMessage,
            senderId: socket.data.userId,
          })
        }
      } catch (error) {
        handleSocketError('chat-message', error)
      }
    })

    socket.on('task-update', async (payload = {}) => {
      try {
        const roomCode = await joinSocketRoom(socket, payload, 'task-update')

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
        const roomCode = await joinSocketRoom(socket, payload, 'start-timer')

        if (!roomCode) {
          return
        }

        const timer = normalizeTimerPayload(payload)
        await updateRoomTimer(roomCode, timer)

        io.to(roomCode).emit('start-timer', {
          roomCode,
          timer,
          senderId: socket.data.userId,
        })
      } catch (error) {
        handleSocketError('start-timer', error)
      }
    })

    socket.on('sync-timer', async (payload = {}) => {
      try {
        const roomCode = await joinSocketRoom(socket, payload, 'sync-timer')

        if (!roomCode) {
          return
        }

        const timer = normalizeTimerPayload(payload)
        await updateRoomTimer(roomCode, timer)

        io.to(roomCode).emit('sync-timer', {
          roomCode,
          timer,
          senderId: socket.data.userId,
        })
      } catch (error) {
        handleSocketError('sync-timer', error)
      }
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id} (user: ${socket.data.userId})`)
    })
  })

  return io
}
