import { generateRoomCode, getAvatarUrl } from './pomodoro.js'

const demoMemberNames = ['Maya Patel', 'Jordan Lee', 'Noah Brooks', 'Tess Morgan']

const demoTaskTitles = [
  'Draft kickoff brief',
  'Review blockers and dependencies',
  'Update sprint board',
  'Prepare retro notes',
]

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function createDemoUser({ name, email } = {}) {
  const fallbackName = email?.split('@')[0] || 'Guest Pilot'
  const resolvedName = String(name || fallbackName)
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())

  return {
    id: createId('user'),
    name: resolvedName,
    email: String(email || `${fallbackName.toLowerCase()}@synctroop.app`),
    avatar: getAvatarUrl(resolvedName),
    role: 'member',
  }
}

export function createDemoRoomBundle({ roomCode, user, isCreator = true, roomName } = {}) {
  const currentUser = user || createDemoUser({ name: 'Alex Morgan', email: 'alex@synctroop.app' })
  const code = String(roomCode || generateRoomCode())
  const creator = isCreator ? currentUser : createDemoUser({ name: 'Riley Stone', email: 'riley@synctroop.app' })
  const memberNames = isCreator ? [currentUser.name, ...demoMemberNames] : [creator.name, currentUser.name, ...demoMemberNames.slice(0, 2)]
  const members = memberNames.map((memberName, index) => ({
    id: index === 0 && isCreator ? currentUser.id : createId('member'),
    name: memberName,
    email: `${memberName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@synctroop.app`,
    avatar: getAvatarUrl(memberName),
    status: index === 0 ? 'online' : index % 2 === 0 ? 'online' : 'away',
    role: index === 0 && isCreator ? 'creator' : 'member',
  }))

  if (!isCreator) {
    members[1] = {
      ...members[1],
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      status: 'online',
      role: 'member',
    }
  }

  const tasks = demoTaskTitles.map((taskTitle, index) => ({
    id: createId('task'),
    title: taskTitle,
    assignedToId: members[index % members.length].id,
    assignedToName: members[index % members.length].name,
    completed: index === 0,
    completedBy: index === 0 ? members[0].name : null,
    updatedAt: new Date(Date.now() - index * 240000).toISOString(),
  }))

  const messages = [
    {
      id: createId('msg'),
      userId: members[0].id,
      username: members[0].name,
      avatar: members[0].avatar,
      message: 'Focus block started. Let us keep this sprint clean.',
      timestamp: new Date(Date.now() - 360000).toISOString(),
      workFocused: true,
    },
    {
      id: createId('msg'),
      userId: members[1]?.id || currentUser.id,
      username: members[1]?.name || currentUser.name,
      avatar: members[1]?.avatar || currentUser.avatar,
      message: 'Task assignment looks good. I will take the review pass.',
      timestamp: new Date(Date.now() - 220000).toISOString(),
      workFocused: true,
    },
  ]

  return {
    room: {
      code,
      name: roomName || `${creator.name.split(' ')[0]}'s Focus Room`,
      creatorId: creator.id,
      creatorName: creator.name,
      isCreator,
      createdAt: new Date().toISOString(),
    },
    members,
    tasks,
    messages,
    sharedTimer: {
      phase: 'focus',
      secondsLeft: 25 * 60,
      isRunning: false,
      startedBy: null,
      cycleCount: 0,
      lastUpdatedAt: Date.now(),
    },
  }
}

export function createDemoAuthResponse(values = {}) {
  const user = createDemoUser(values)

  return {
    user,
    token: `demo-${createId('token')}`,
  }
}

export function createDemoRoomLookup(roomCode, user, isCreator = false) {
  return createDemoRoomBundle({ roomCode, user, isCreator })
}

export function createQuickRoomCode() {
  return generateRoomCode()
}