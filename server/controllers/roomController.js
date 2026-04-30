import Room from '../models/Room.js'
import { generateRoomCode, normalizeRoomCode, serializeRoomBundle } from '../utils/roomUtils.js'

const ROOM_CODE_ATTEMPTS = 20

const isDuplicateRoomCodeError = (error) => error?.code === 11000 || error?.codeName === 'DuplicateKey'

const createRoomDocument = async ({ roomName, roomCode, user }) => {
  let candidateCode = normalizeRoomCode(roomCode)

  for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
    if (!candidateCode) {
      candidateCode = generateRoomCode()
    }

    try {
      return await Room.create({
        code: candidateCode,
        name: roomName || `${user.name}'s Room`,
        creator: user._id,
        members: [{
          user: user._id,
          role: 'creator',
          status: 'online',
        }],
        tasks: [],
        messages: [],
      })
    } catch (error) {
      if (!isDuplicateRoomCodeError(error)) {
        throw error
      }

      candidateCode = ''
    }
  }

  throw new Error('Unable to generate a unique room code.')
}

export const createRoom = async (req, res) => {
  try {
    const { roomName, roomCode } = req.body
    const room = await createRoomDocument({ roomName, roomCode, user: req.user })

    return fetchRoomBundle(room.code, req.user, res)
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message })
  }
}

export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body
    const normalizedRoomCode = normalizeRoomCode(roomCode)

    if (!normalizedRoomCode) {
      return res.status(400).json({ message: 'Room code is required.' })
    }

    const room = await Room.findOne({ code: normalizedRoomCode })
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }

    const member = room.members.find((entry) => entry.user.toString() === req.user._id.toString())
    if (!member) {
      room.members.push({
        user: req.user._id,
        role: 'member',
        status: 'online',
      })
    } else {
      member.status = 'online'
    }

    await room.save()

    return fetchRoomBundle(room.code, req.user, res)
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message })
  }
}

export const getRoomTasks = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.query.roomCode)

    if (!roomCode) {
      return res.status(400).json({ message: 'Room code is required.' })
    }

    const room = await Room.findOne({ code: roomCode }).populate('tasks.assignedTo tasks.completedBy', 'name')
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }

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

export const getRoomMembers = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.query.roomCode)

    if (!roomCode) {
      return res.status(400).json({ message: 'Room code is required.' })
    }

    const room = await Room.findOne({ code: roomCode }).populate('members.user', 'name email avatar')
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }

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

const fetchRoomBundle = async (roomCode, user, res) => {
  const normalizedRoomCode = normalizeRoomCode(roomCode)
  const room = await Room.findOne({ code: normalizedRoomCode })
    .populate('creator', 'name')
    .populate('members.user', 'name email avatar')
    .populate('tasks.assignedTo tasks.completedBy', 'name')
    .populate('messages.user', 'name avatar')

  if (!room) {
    return res.status(404).json({ message: 'Room not found.' })
  }

  return res.status(200).json(serializeRoomBundle(room, user))
}
