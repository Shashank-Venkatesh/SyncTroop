import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import Room from './models/Room.js'
import User from './models/User.js'
import { normalizeRoomCode, canAddMember } from './utils/roomUtils.js'

function toId(value) {
  if (!value) return ''
  if (typeof value === 'object') {
    if (value._id && value._id !== value) return String(value._id)
    return String(value)
  }
  return String(value)
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

const MAX_MESSAGE_LENGTH = 2000

function normalizeMessagePayload(payload = {}) {
  const source = payload.message && typeof payload.message === 'object' ? payload.message : payload
  const messageText = String(source.message || source.text || '').trim().slice(0, MAX_MESSAGE_LENGTH)

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

  const existingMember = room.members.find((member) => toId(member.user) === memberPayload.id)

  if (existingMember) {
    existingMember.role = memberPayload.role || existingMember.role || 'member'
    existingMember.status = memberPayload.status || 'online'
  } else {
    if (!canAddMember(room)) {
      return null
    }

    room.members.push({
      user: memberPayload.id,
      role: memberPayload.role || 'member',
      status: memberPayload.status || 'online',
    })
  }

  await room.save()

  return memberPayload
}

async function removeRoomMember(roomCode, memberId) {
  const room = await Room.findOne({ code: roomCode })

  if (!room || !memberId) {
    return false
  }

  const initialLength = room.members.length
  room.members = room.members.filter((member) => toId(member.user) !== memberId)

  if (room.members.length === initialLength) {
    return false
  }

  await room.save()

  return true
}

async function setMemberStatus(roomCode, memberId, status) {
  const room = await Room.findOne({ code: roomCode }).populate('members.user', 'name email avatar')

  if (!room || !memberId) {
    return null
  }

  const member = room.members.find((entry) => toId(entry.user) === memberId)

  if (!member) {
    return null
  }

  member.status = status
  await room.save()

  return {
    id: member.user._id.toString(),
    name: member.user.name || '',
    email: member.user.email || '',
    avatar: member.user.avatar || '',
    role: member.role,
    status: member.status,
  }
}

async function saveRoomMessage(roomCode, messagePayload) {
  const room = await Room.findOne({ code: roomCode })

  if (!room || !messagePayload.userId || !messagePayload.message) {
    return null
  }

  const user = await User.findById(messagePayload.userId).select('name avatar')

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
    username: user?.name || messagePayload.username,
    avatar: user?.avatar || messagePayload.avatar,
    message: messagePayload.message,
    timestamp: message.createdAt,
    workFocused: messagePayload.workFocused,
  }
}

function normalizeTaskList(room) {
  return (room.tasks || []).map((task) => ({
    id: task._id.toString(),
    title: task.title,
    assignedToId: task.assignedTo?._id?.toString() || null,
    assignedToName: task.assignedTo?.name || null,
    completed: Boolean(task.completed),
    completedBy: task.completedBy?.name || null,
    updatedAt: task.updatedAt,
  }))
}

async function broadcastRoomTasks(io, roomCode) {
  const room = await Room.findOne({ code: roomCode })
    .populate('tasks.assignedTo', 'name')
    .populate('tasks.completedBy', 'name')

  if (!room) {
    return
  }

  io.to(roomCode).emit('task-update', {
    roomCode,
    tasks: normalizeTaskList(room),
  })
}

async function applyTaskUpdate(roomCode, payload, userId) {
  const room = await Room.findOne({ code: roomCode })

  if (!room) {
    return
  }

  const action = payload.action
  const taskPayload = payload.task || {}

  if (action === 'create') {
    if (!taskPayload.title || !taskPayload.assignedToId) {
      return
    }

    room.tasks.push({
      title: String(taskPayload.title).trim().slice(0, 200),
      assignedTo: taskPayload.assignedToId,
      completed: false,
    })
  }

  if (action === 'toggle') {
    const taskId = toId(taskPayload.id)
    const task = room.tasks.id(taskId)

    if (!task) {
      return
    }

    const nextCompleted = Boolean(taskPayload.completed)
    task.completed = nextCompleted
    task.completedBy = nextCompleted ? userId : null
  }

  if (action === 'delete') {
    const taskId = toId(payload.taskId || taskPayload.id)

    if (taskId) {
      room.tasks = room.tasks.filter((task) => task._id.toString() !== taskId)
    }
  }

  await room.save()
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

// Minimal in-memory token bucket to stop a single socket from flooding a
// room with messages. Not a substitute for infra-level rate limiting, but
// enough to blunt an accidental (or malicious) tight loop from one client.
const CHAT_RATE_LIMIT_MAX = 10
const CHAT_RATE_LIMIT_WINDOW_MS = 10000

function isChatRateLimited(socket) {
  const now = Date.now()
  const bucket = socket.data.chatTimestamps || []
  const recent = bucket.filter((ts) => now - ts < CHAT_RATE_LIMIT_WINDOW_MS)

  if (recent.length >= CHAT_RATE_LIMIT_MAX) {
    socket.data.chatTimestamps = recent
    return true
  }

  recent.push(now)
  socket.data.chatTimestamps = recent
  return false
}

export function initializeSocket(server, { origin = 'http://localhost:5173' } = {}) {
  // Normalize origin to handle function, array, or string
  const corsOrigin = typeof origin === 'function' ? origin : (Array.isArray(origin) ? origin : [origin]);
  
  const io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
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
        const updatedMember = await setMemberStatus(roomCode, socket.data.userId, 'online')

        if (updatedMember) {
          io.to(roomCode).emit('member-status', {
            roomCode,
            member: updatedMember,
            senderId: socket.data.userId,
          })
        }

        // Send initial member list to the joining user
        const room = await Room.findOne({ code: roomCode }).populate('members.user', 'name email avatar')
        if (room && room.members.length > 0) {
          // Send all members of the room to the joining user, not just connected ones
          const membersList = room.members
            .filter((m) => m.user)
            .map((m) => ({
              id: toId(m.user),
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

          // Broadcast member-joined to OTHER sockets in the room so existing
          // members see the new joiner in real time. Skip the broadcast if
          // the member was already online (reconnection case) to avoid
          // duplicate "X joined" notifications.
          const joiner = membersList.find((m) => m.id === socket.data.userId)
          if (joiner) {
            const wasAlreadyOnline = updatedMember && updatedMember.status === 'online'
              && room.members.some((m) => toId(m.user) === socket.data.userId && m.status === 'online')

            // Only check if there are OTHER sockets for this user already in the room
            // (i.e., this is a genuine reconnect, not a first join)
            const roomSockets = io.sockets.adapter.rooms.get(roomCode)
            let userAlreadyInRoom = false
            if (roomSockets) {
              for (const sid of roomSockets) {
                if (sid === socket.id) continue
                const s = io.sockets.sockets.get(sid)
                if (s && toId(s.data.userId) === socket.data.userId) {
                  userAlreadyInRoom = true
                  break
                }
              }
            }

            if (!userAlreadyInRoom) {
              console.log(`[Socket] Broadcasting member-joined for ${joiner.name} to room ${roomCode}`)
              socket.to(roomCode).emit('member-joined', {
                roomCode,
                member: joiner,
                senderId: socket.data.userId,
              })
            } else {
              console.log(`[Socket] Skipping member-joined broadcast for ${joiner.name} (reconnect, already in room ${roomCode})`)
            }
          }
        }
      } catch (error) {
        console.error(`[Socket] Error handling join-room:`, error)
      }
    })

    // NOTE: The 'member-joined' broadcast is already handled inside the
    // 'join-room' handler above. A separate 'member-joined' listener is
    // kept only for explicit client-side member announcements (e.g. after
    // reconnection). It updates the DB but does NOT re-broadcast to avoid
    // duplicate notifications.
    socket.on('member-joined', async (payload = {}) => {
      try {
        const roomCode = resolveRoomCode(socket, payload)

        if (!roomCode) {
          console.warn(`[Socket] member-joined: invalid room code`)
          return
        }

        // Only upsert the member record in the DB; skip the broadcast
        // because join-room already emitted member-joined to the room.
        const member = normalizeMemberPayload(payload, socket.data.userId)

        if (!member.id) {
          console.warn(`[Socket] member-joined: invalid member id`)
          return
        }

        await upsertRoomMember(roomCode, member)
        console.log(`[Socket] member-joined (upsert only, no broadcast): ${member.name} in room ${roomCode}`)
      } catch (error) {
        handleSocketError('member-joined', error)
        socket.emit('socket-error', {
          event: 'member-joined',
          message: 'Failed to process member join.',
        })
      }
    })

    socket.on('member-left', async (payload = {}) => {
      try {
        // Resolve room code WITHOUT re-joining the socket room — the user
        // is leaving, so calling joinSocketRoom() here was incorrect: it
        // would re-add the socket to the room right before the leave.
        const roomCode = resolveRoomCode(socket, payload)

        if (!roomCode) {
          return
        }

        const memberId = toId(socket.data.userId)

        if (!memberId) {
          return
        }

        const updated = await removeRoomMember(roomCode, memberId)

        if (updated) {
          console.log(`[Broadcast] 📢 User (ID: ${memberId}) LEFT room "${roomCode}"`)
          // Broadcast to remaining members BEFORE the socket leaves the room
          socket.to(roomCode).emit('member-left', {
            roomCode,
            memberId,
            senderId: socket.data.userId,
          })
          console.log(`[Broadcast] ✅ Broadcast complete for leave event in room: ${roomCode}`)
        }

        // Now leave the Socket.io room and clear local state
        socket.leave(roomCode)
        socket.data.roomCode = ''
      } catch (error) {
        handleSocketError('member-left', error)
        socket.emit('socket-error', {
          event: 'member-left',
          message: 'Failed to process member leave.',
        })
      }
    })

    socket.on('chat-message', async (payload = {}) => {
      try {
        if (isChatRateLimited(socket)) {
          socket.emit('socket-error', {
            event: 'chat-message',
            message: 'You are sending messages too quickly. Please slow down.',
          })
          return
        }

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
          io.to(roomCode).emit('chat-message', {
            roomCode,
            message: savedMessage,
            senderId: socket.data.userId,
          })
        }
      } catch (error) {
        handleSocketError('chat-message', error)
        socket.emit('socket-error', {
          event: 'chat-message',
          message: 'Failed to send message.',
        })
      }
    })

    socket.on('task-update', async (payload = {}) => {
      try {
        const roomCode = await joinSocketRoom(socket, payload, 'task-update')

        if (!roomCode) {
          return
        }

        await applyTaskUpdate(roomCode, payload, socket.data.userId)
        await broadcastRoomTasks(io, roomCode)
      } catch (error) {
        handleSocketError('task-update', error)
        socket.emit('socket-error', {
          event: 'task-update',
          message: 'Failed to update task.',
        })
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
      const roomCode = normalizeRoomCode(socket.data.roomCode)
      const memberId = toId(socket.data.userId)

      if (!roomCode || !memberId) {
        return
      }

      // Check if the user still has OTHER connected sockets in the same
      // room. If they do (e.g. multiple tabs), don't mark them as 'away'.
      const roomSockets = io.sockets.adapter.rooms.get(roomCode)
      if (roomSockets) {
        for (const socketId of roomSockets) {
          if (socketId === socket.id) {
            continue
          }

          const otherSocket = io.sockets.sockets.get(socketId)

          if (otherSocket && toId(otherSocket.data.userId) === memberId) {
            console.log(`[Socket] User ${memberId} still has another socket (${socketId}) in room ${roomCode}; skipping 'away' status.`)
            return
          }
        }
      }

      setMemberStatus(roomCode, memberId, 'away')
        .then((updatedMember) => {
          if (!updatedMember) {
            return
          }

          // Use io.to() instead of socket.to() because the socket has
          // already been removed from the room by the time this fires.
          io.to(roomCode).emit('member-status', {
            roomCode,
            member: updatedMember,
            senderId: memberId,
          })
        })
        .catch((error) => {
          handleSocketError('disconnect', error)
        })
    })
  })

  return io
}
