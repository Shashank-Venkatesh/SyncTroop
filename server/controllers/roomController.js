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
      const message = process.env.NODE_ENV === 'production'
        ? 'Unable to create room. Please try again.'
        : 'Server Error: ' + error.message;
      res.status(500).json({ message })
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

      // NOTE: member-joined broadcast is handled by the socket.js 'join-room'
      // handler, which fires AFTER the client socket has actually joined the
      // Socket.io room. Broadcasting here would go nowhere because no socket
      // has called socket.join(roomCode) yet at this point in the flow.

      return fetchRoomBundle(room.code, roomUser, res, io)
    } catch (error) {
      console.error('[Room] joinRoom error:', error)
      const message = process.env.NODE_ENV === 'production'
        ? 'Unable to join room. Please try again.'
        : 'Server Error: ' + error.message;
      res.status(500).json({ message })
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

const fetchRoomBundle = async (roomCode, user, res, io) => {
  const normalizedRoomCode = normalizeRoomCode(roomCode)
  const room = await Room.findOne({ code: normalizedRoomCode })
    .populate('creator', 'name')
    .populate('members.user', 'name email avatar')
    .populate('tasks.assignedTo', 'name')
    .populate('tasks.completedBy', 'name')
    .populate('messages.user', 'name avatar')

  if (!room) {
    console.error(`[Room] Room not found: ${normalizedRoomCode}`)
    return res.status(404).json({ message: 'Room not found.' })
  }

  const roomData = room.toObject({ getters: true })
  
  console.log(`[Room] Fetching bundle for ${normalizedRoomCode}:`, {
    roomCode: roomData.code,
    roomName: roomData.name,
    creatorId: roomData.creator?._id,
    creatorName: roomData.creator?.name,
    membersCount: roomData.members?.length || 0,
    tasksCount: roomData.tasks?.length || 0,
  })

  // Return all room data without filtering by connected users
  // Users should see the complete state of their room, not just currently online members
  const bundle = serializeRoomBundle(roomData, user)
  console.log(`[Room] Serialized bundle:`, {
    roomCode: bundle.room.code,
    creatorId: bundle.room.creatorId,
    creatorName: bundle.room.creatorName,
    membersCount: bundle.members.length,
    tasksCount: bundle.tasks.length,
  })
  
  return res.status(200).json(bundle)
}