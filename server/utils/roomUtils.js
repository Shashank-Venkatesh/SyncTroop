import { randomBytes } from 'node:crypto'

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const MIN_ROOM_MEMBERS = 2
export const MAX_ROOM_MEMBERS = 100

export function parseMaxMembers(value) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < MIN_ROOM_MEMBERS || parsed > MAX_ROOM_MEMBERS) {
    return null
  }

  return parsed
}

export function canAddMember(room) {
  if (!room?.members) {
    return false
  }

  const limit = parseMaxMembers(room.maxMembers) || MAX_ROOM_MEMBERS
  return room.members.length < limit
}

export function getRemainingMemberSlots(room) {
  if (!room?.members) {
    return 0
  }

  const limit = parseMaxMembers(room.maxMembers) || MAX_ROOM_MEMBERS
  return Math.max(0, limit - room.members.length)
}

export function toId(value) {
  if (!value) return ''
  if (typeof value === 'object') {
    if (value._id && value._id !== value) return String(value._id)
    return String(value)
  }
  return String(value)
}

export function normalizeRoomCode(roomCode) {
  return String(roomCode || '').trim().toUpperCase()
}

export function generateRoomCode(length = 6) {
  if (!Number.isFinite(length) || length <= 0) {
    return ''
  }

  const bytes = randomBytes(length)

  return Array.from(bytes, (byte) => ROOM_CODE_CHARACTERS[byte % ROOM_CODE_CHARACTERS.length]).join('')
}

export function serializeRoomBundle(room, currentUser) {
  if (!room) {
    return null
  }

  const currentUserId = toId(currentUser)
  const creatorId = toId(room.creator)

  return {
    room: {
      code: room.code,
      name: room.name,
      maxMembers: room.maxMembers || 10,
      creatorId,
      creatorName: room.creator?.name || room.creatorName || '',
      isCreator: Boolean(currentUserId && creatorId && currentUserId === creatorId),
      createdAt: room.createdAt,
    },
    members: (room.members || [])
      .filter((member) => member.user)
      .map((member) => ({
        id: toId(member.user),
        name: member.user.name || '',
        email: member.user.email || '',
        avatar: member.user.avatar || '',
        role: member.role,
        status: member.status,
      })),
    tasks: (room.tasks || []).map((task) => ({
      id: toId(task._id || task.id),
      title: task.title,
      assignedToId: toId(task.assignedTo),
      assignedToName: task.assignedTo?.name || null,
      completed: Boolean(task.completed),
      completedBy: task.completedBy?.name || null,
      updatedAt: task.updatedAt,
    })),
    messages: (room.messages || []).map((message) => ({
      id: toId(message._id || message.id),
      userId: toId(message.user),
      username: message.user?.name || '',
      avatar: message.user?.avatar || '',
      message: message.message,
      timestamp: message.createdAt,
      workFocused: Boolean(message.workFocused),
    })),
    sharedTimer: room.sharedTimer,
  }
}
