import Room from '../models/Room.js'
import { generateRoomCode, normalizeRoomCode, serializeRoomBundle } from '../utils/roomUtils.js'

const ROOM_CODE_ATTEMPTS = 20

const isDuplicateRoomCodeError = (error) => error?.code === 11000 || error?.codeName === 'DuplicateKey'

const resolveRoomUser = async (req) => req.user || null

const createRoomDocument = async ({ roomName, user }) => {
  let candidateCode = ''

  for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
    if (!candidateCode) candidateCode = generateRoomCode()

    try {
      return await Room.create({
        code: candidateCode,
        name: roomName || `${user.name}'s Room`,
        creator: user._id,
        members: [{ user: user._id, role: 'creator', status: 'online' }],
        tasks: [],
        messages: [],
      })
    } catch (error) {
      if (!isDuplicateRoomCodeError(error)) throw error
      candidateCode = ''
    }
  }

  throw new Error('Unable to generate a unique room code.')
}

// ✅ Everything is now wrapped in a factory that receives `io`
export function createRoomController(io) {
  const createRoom = async (req, res) => {
    try {
      console.log('[Room] createRoom called, req.user:', req.user?._id)
      const { roomName } = req.body
      console.log('[Room] Resolving user...')
      const roomUser = await resolveRoomUser(req)
      console.log('[Room] User resolved:', roomUser?._id)

      if (!roomUser) {
        return res.status(401).json({ message: 'Authentication required.' })
      }

      console.log('[Room] Creating room document...')
      const room = await createRoomDocument({ roomName, user: roomUser })
      console.log('[Room] Room created:', room.code)

      return fetchRoomBundle(room.code, roomUser, res, io)
    } catch (error) {
      console.error('[Room] createRoom error:', error)
      res.status(500).json({ message: 'Server Error: ' + error.message })
    }
  }

  const joinRoom = async (req, res) => {
    try {
      const { roomCode } = req.body
      const normalizedRoomCode = normalizeRoomCode(roomCode)
      const roomUser = await resolveRoomUser(req)

      if (!normalizedRoomCode) {
        return res.status(400).json({ message: 'Room code is required.' })
      }

      if (!roomUser) {
        return res.status(401).json({ message: 'Authentication required.' })
      }

      const room = await Room.findOne({ code: normalizedRoomCode })
      if (!room) {
        return res.status(404).json({ message: 'Room not found.' })
      }

      const existingMember = room.members.find(
        (entry) => entry.user.toString() === roomUser._id.toString()
      )

      if (!existingMember) {
        room.members.push({ user: roomUser._id, role: 'member', status: 'online' })
      } else {
        existingMember.status = 'online'
      }

      await room.save()

      // ✅ Emit directly from the server — no client round-trip needed
      const isCreator = room.creator.toString() === roomUser._id.toString()
      const memberPayload = {
        id: roomUser._id.toString(),
        name: roomUser.name,
        email: roomUser.email,
        avatar: roomUser.avatar || '',
        role: isCreator ? 'creator' : 'member',
        status: 'online',
      }

      // Broadcast to everyone in the room (both existing and new joiner)
      console.log(`[Room] Broadcasting member-joined for ${roomUser.name} to room ${normalizedRoomCode}`)
      io.to(normalizedRoomCode).emit('member-joined', {
        roomCode: normalizedRoomCode,
        member: memberPayload,
        senderId: roomUser._id.toString(),
      })

      return fetchRoomBundle(room.code, roomUser, res, io)
    } catch (error) {
      res.status(500).json({ message: 'Server Error: ' + error.message })
    }
  }

  const getRoomTasks = async (req, res) => {
    try {
      const roomCode = normalizeRoomCode(req.query.roomCode)
      if (!roomCode) return res.status(400).json({ message: 'Room code is required.' })

      const room = await Room.findOne({ code: roomCode }).populate(
        'tasks.assignedTo tasks.completedBy',
        'name'
      )
      if (!room) return res.status(404).json({ message: 'Room not found.' })

      const tasks = room.tasks.map((task) => ({
        id: task._id,
        title: task.title,
        assignedToId: task.assignedTo?._id,
        assignedToName: task.assignedTo?.name,
        completed: task.completed,
        completedBy: task.completedBy?.name,
        updatedAt: task.updatedAt,
      }))

      res.status(200).json(tasks)
    } catch (error) {
      res.status(500).json({ message: 'Server Error: ' + error.message })
    }
  }

  const getRoomMembers = async (req, res) => {
    try {
      const roomCode = normalizeRoomCode(req.query.roomCode)
      if (!roomCode) return res.status(400).json({ message: 'Room code is required.' })

      const room = await Room.findOne({ code: roomCode }).populate(
        'members.user',
        'name email avatar'
      )
      if (!room) return res.status(404).json({ message: 'Room not found.' })

      const members = room.members.map((member) => ({
        id: member.user._id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role,
        status: member.status,
      }))

      res.status(200).json(members)
    } catch (error) {
      res.status(500).json({ message: 'Server Error: ' + error.message })
    }
  }

  return { createRoom, joinRoom, getRoomTasks, getRoomMembers }
}

const getConnectedUserIds = (io, roomCode, fallbackUserId) => {
  const connectedUserIds = new Set()

  if (fallbackUserId) {
    connectedUserIds.add(String(fallbackUserId))
  }

  if (!io?.sockets?.adapter || !roomCode) {
    return connectedUserIds
  }

  const roomSocketIds = io.sockets.adapter.rooms.get(roomCode) || new Set()

  roomSocketIds.forEach((socketId) => {
    const userId = io.sockets.sockets.get(socketId)?.data?.userId
    if (userId) {
      connectedUserIds.add(String(userId))
    }
  })

  return connectedUserIds
}

const fetchRoomBundle = async (roomCode, user, res, io) => {
  const normalizedRoomCode = normalizeRoomCode(roomCode)
  const room = await Room.findOne({ code: normalizedRoomCode })
    .populate('creator', 'name')
    .populate('members.user', 'name email avatar')
    .populate('tasks.assignedTo tasks.completedBy', 'name')
    .populate('messages.user', 'name avatar')

  if (!room) return res.status(404).json({ message: 'Room not found.' })

  const roomData = room.toObject({ getters: true })
  const connectedUserIds = getConnectedUserIds(io, normalizedRoomCode, user?._id)

  if (connectedUserIds.size > 0) {
    roomData.members = (roomData.members || []).filter((member) => {
      const memberId = member.user?._id || member.user
      return connectedUserIds.has(String(memberId))
    })

    roomData.tasks = (roomData.tasks || []).filter((task) => {
      const assignedToId = task.assignedTo?._id || task.assignedTo
      const completedById = task.completedBy?._id || task.completedBy

      if (assignedToId && !connectedUserIds.has(String(assignedToId))) {
        return false
      }

      if (completedById && !connectedUserIds.has(String(completedById))) {
        return false
      }

      return true
    })

    roomData.messages = (roomData.messages || []).filter((message) => {
      const messageUserId = message.user?._id || message.user
      return connectedUserIds.has(String(messageUserId))
    })
  }

  return res.status(200).json(serializeRoomBundle(roomData, user))
}