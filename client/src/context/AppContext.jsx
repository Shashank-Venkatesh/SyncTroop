import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { createInitialSharedTimer, getPhaseDuration, PHASES } from '../utils/pomodoro.js'

const STORAGE_KEYS = {
  user: 'synctroop:user',
  settings: 'synctroop:settings',
  room: 'synctroop:room',
  sharedTimer: 'synctroop:sharedTimer',
}

const defaultSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  whiteNoise: false,
}

function readStoredValue(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return fallbackValue
  }

  try {
    const storedValue = window.localStorage.getItem(key)

    return storedValue ? JSON.parse(storedValue) : fallbackValue
  } catch {
    return fallbackValue
  }
}

const initialSettings = {
  ...defaultSettings,
  ...readStoredValue(STORAGE_KEYS.settings, {}),
}

const storedRoom = readStoredValue(STORAGE_KEYS.room, null)

const initialState = {
  user: readStoredValue(STORAGE_KEYS.user, null),
  settings: initialSettings,
  room: storedRoom,
  members: [],
  tasks: [],
  messages: [],
  sharedTimer: storedRoom ? readStoredValue(STORAGE_KEYS.sharedTimer, null) || createInitialSharedTimer(initialSettings) : createInitialSharedTimer(initialSettings),
  roomLoading: {
    open: false,
    title: 'Prism loading',
    message: 'Syncing the room.',
    hint: '',
  },
  selectedMode: 'solo',
  authModal: {
    open: false,
    tab: 'login',
    mode: 'solo',
  },
  settingsModalOpen: false,
  notifications: [],
}

const AppContext = createContext(null)

function normalizeTask(task) {
  return {
    ...task,
    completed: Boolean(task.completed),
  }
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      }

    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
      }

    case 'SET_SELECTED_MODE':
      return {
        ...state,
        selectedMode: action.payload,
        // When switching to solo mode clear room-scoped lists so stale room data
        // doesn't show up in solo mode.
        ...(action.payload === 'solo' ? { members: [], tasks: [], messages: [] } : {}),
      }

    case 'OPEN_AUTH_MODAL':
      return {
        ...state,
        selectedMode: action.payload?.mode || state.selectedMode,
        authModal: {
          open: true,
          tab: action.payload?.tab || 'login',
          mode: action.payload?.mode || state.selectedMode,
        },
      }

    case 'CLOSE_AUTH_MODAL':
      return {
        ...state,
        authModal: {
          ...state.authModal,
          open: false,
        },
      }

    case 'OPEN_SETTINGS_MODAL':
      return {
        ...state,
        settingsModalOpen: true,
      }

    case 'CLOSE_SETTINGS_MODAL':
      return {
        ...state,
        settingsModalOpen: false,
      }

    case 'UPDATE_SETTINGS': {
      const nextSettings = {
        ...state.settings,
        ...action.payload,
      }

      const timerNeedsResync = !state.sharedTimer.isRunning
      const nextSharedTimer = timerNeedsResync
        ? {
            ...state.sharedTimer,
            secondsLeft: getPhaseDuration(state.sharedTimer.phase || PHASES.FOCUS, nextSettings),
            lastUpdatedAt: Date.now(),
          }
        : state.sharedTimer

      return {
        ...state,
        settings: nextSettings,
        sharedTimer: nextSharedTimer,
      }
    }

    case 'SET_ROOM_BUNDLE':
      return {
        ...state,
        room: action.payload.room,
        members: action.payload.members || [],
        tasks: (action.payload.tasks || []).map(normalizeTask),
        messages: action.payload.messages || [],
        sharedTimer: action.payload.sharedTimer || createInitialSharedTimer(state.settings),
      }

    case 'CLEAR_ROOM':
      return {
        ...state,
        room: null,
        members: [],
        tasks: [],
        messages: [],
        roomLoading: {
          ...state.roomLoading,
          open: false,
        },
        sharedTimer: createInitialSharedTimer(state.settings),
      }

    case 'OPEN_ROOM_LOADING':
      return {
        ...state,
        roomLoading: {
          open: true,
          title: action.payload?.title || 'Prism loading',
          message: action.payload?.message || 'Syncing the room.',
          hint: action.payload?.hint || '',
        },
      }

    case 'CLOSE_ROOM_LOADING':
      return {
        ...state,
        roomLoading: {
          ...state.roomLoading,
          open: false,
        },
      }

    case 'SET_MEMBERS':
      return {
        ...state,
        members: action.payload,
      }

    case 'UPSERT_MEMBER': {
      const nextMembers = state.members.filter((member) => member.id !== action.payload.id)

      return {
        ...state,
        members: [action.payload, ...nextMembers],
      }
    }

    case 'REMOVE_MEMBER':
      return {
        ...state,
        members: state.members.filter((member) => member.id !== action.payload),
      }

    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload.map(normalizeTask),
      }

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
      }

    case 'UPSERT_TASK': {
      const nextTask = normalizeTask(action.payload)
      const taskIndex = state.tasks.findIndex((task) => task.id === nextTask.id)

      if (taskIndex === -1) {
        return {
          ...state,
          tasks: [nextTask, ...state.tasks],
        }
      }

      const nextTasks = [...state.tasks]
      nextTasks[taskIndex] = nextTask

      return {
        ...state,
        tasks: nextTasks,
      }
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
      }

    case 'ADD_NOTIFICATION': {
      const notification = {
        id: action.payload.id,
        type: action.payload.type || 'info',
        title: action.payload.title || 'Room update',
        message: action.payload.message || '',
        duration: action.payload.duration || 3500,
      }

      return {
        ...state,
        notifications: [notification, ...state.notifications].slice(0, 4),
      }
    }

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((notification) => notification.id !== action.payload),
      }

    case 'SET_SHARED_TIMER':
      return {
        ...state,
        sharedTimer: {
          ...state.sharedTimer,
          ...action.payload,
          lastUpdatedAt: Date.now(),
        },
      }

    case 'START_SHARED_TIMER':
      return {
        ...state,
        sharedTimer: {
          ...state.sharedTimer,
          isRunning: true,
          startedBy: action.payload?.startedBy || state.sharedTimer.startedBy,
          lastUpdatedAt: Date.now(),
        },
      }

    case 'RESET_SHARED_TIMER':
      return {
        ...state,
        sharedTimer: createInitialSharedTimer(state.settings),
      }

    case 'TICK_SHARED_TIMER': {
      if (!state.sharedTimer.isRunning) {
        return state
      }

      if (state.sharedTimer.secondsLeft > 1) {
        return {
          ...state,
          sharedTimer: {
            ...state.sharedTimer,
            secondsLeft: state.sharedTimer.secondsLeft - 1,
            lastUpdatedAt: Date.now(),
          },
        }
      }

      const nextPhase = state.sharedTimer.phase === PHASES.FOCUS
        ? (state.sharedTimer.cycleCount + 1) % state.settings.cyclesBeforeLongBreak === 0
          ? PHASES.LONG_BREAK
          : PHASES.SHORT_BREAK
        : PHASES.FOCUS

      const nextCycleCount = state.sharedTimer.phase === PHASES.FOCUS
        ? state.sharedTimer.cycleCount + 1
        : state.sharedTimer.cycleCount

      return {
        ...state,
        sharedTimer: {
          ...state.sharedTimer,
          phase: nextPhase,
          secondsLeft: getPhaseDuration(nextPhase, state.settings),
          cycleCount: nextCycleCount,
          lastUpdatedAt: Date.now(),
        },
      }
    }

    case 'SYNC_SHARED_TIMER':
      return {
        ...state,
        sharedTimer: {
          ...state.sharedTimer,
          ...action.payload,
        },
      }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (state.user) {
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user))
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.user)
    }
  }, [state.user])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings))
  }, [state.settings])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (state.room) {
      window.localStorage.setItem(STORAGE_KEYS.room, JSON.stringify(state.room))
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.room)
    }
  }, [state.room])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.sharedTimer, JSON.stringify(state.sharedTimer))
  }, [state.sharedTimer])

  const actions = useMemo(() => {
    return {
      openAuthModal: (mode = 'solo', tab = 'login') => dispatch({ type: 'OPEN_AUTH_MODAL', payload: { mode, tab } }),
      closeAuthModal: () => dispatch({ type: 'CLOSE_AUTH_MODAL' }),
      openSettingsModal: () => dispatch({ type: 'OPEN_SETTINGS_MODAL' }),
      closeSettingsModal: () => dispatch({ type: 'CLOSE_SETTINGS_MODAL' }),
      setUser: (user) => dispatch({ type: 'SET_USER', payload: user }),
      clearUser: () => dispatch({ type: 'CLEAR_USER' }),
      setSelectedMode: (mode) => dispatch({ type: 'SET_SELECTED_MODE', payload: mode }),
      updateSettings: (settings) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
      setRoomBundle: (bundle) => dispatch({ type: 'SET_ROOM_BUNDLE', payload: bundle }),
      clearRoom: () => dispatch({ type: 'CLEAR_ROOM' }),
      openRoomLoading: (loading) => dispatch({ type: 'OPEN_ROOM_LOADING', payload: loading }),
      closeRoomLoading: () => dispatch({ type: 'CLOSE_ROOM_LOADING' }),
      setMembers: (members) => dispatch({ type: 'SET_MEMBERS', payload: members }),
      upsertMember: (member) => dispatch({ type: 'UPSERT_MEMBER', payload: member }),
      removeMember: (memberId) => dispatch({ type: 'REMOVE_MEMBER', payload: memberId }),
      setTasks: (tasks) => dispatch({ type: 'SET_TASKS', payload: tasks }),
      upsertTask: (task) => dispatch({ type: 'UPSERT_TASK', payload: task }),
      deleteTask: (taskId) => dispatch({ type: 'DELETE_TASK', payload: taskId }),
      addMessage: (message) => dispatch({ type: 'ADD_MESSAGE', payload: message }),
      setMessages: (messages) => dispatch({ type: 'SET_MESSAGES', payload: messages }),
      addNotification: (notification) => dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),
      removeNotification: (notificationId) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId }),
      setSharedTimer: (timer) => dispatch({ type: 'SET_SHARED_TIMER', payload: timer }),
      startSharedTimer: (startedBy) => dispatch({ type: 'START_SHARED_TIMER', payload: { startedBy } }),
      resetSharedTimer: () => dispatch({ type: 'RESET_SHARED_TIMER' }),
      tickSharedTimer: () => dispatch({ type: 'TICK_SHARED_TIMER' }),
      syncSharedTimer: (timer) => dispatch({ type: 'SYNC_SHARED_TIMER', payload: timer }),
    }
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, actions }),
    [state, dispatch, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }

  return context
}