import { randomBytes } from 'node:crypto'

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function toId(value) {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || '')
  }

  return value ? String(value) : ''
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
      creatorId,
      creatorName: room.creator?.name || room.creatorName || '',
      isCreator: Boolean(currentUserId && creatorId && currentUserId === creatorId),
      createdAt: room.createdAt,
    },
    members: (room.members || []).map((member) => ({
      id: toId(member.user),
      name: member.user?.name || '',
      email: member.user?.email || '',
      avatar: member.user?.avatar || '',
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
