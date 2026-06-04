import axios from 'axios'

const PROD_BACKEND = 'https://synctroops.onrender.com'

// Determine the correct API base URL
const getBaseUrl = () => {
  // If running locally, route api calls through the local proxy/origin
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return window.location.origin
  }

  const explicitApiUrl = import.meta.env.VITE_API_URL

  if (explicitApiUrl) {
    try {
      const parsedUrl = new URL(explicitApiUrl)

      if (parsedUrl.pathname.endsWith('/api')) {
        parsedUrl.pathname = parsedUrl.pathname.slice(0, -4) || '/'
      }

      parsedUrl.search = ''
      parsedUrl.hash = ''

      return `${parsedUrl.origin}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '')}`
    } catch {
      return explicitApiUrl
    }
  }

  if (import.meta.env.PROD) {
    return window.location.origin
  }

  return 'http://localhost:3000'
};

const baseUrl = getBaseUrl()

console.log('[API] Initialized with baseURL:', baseUrl)

export const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getAuthToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem('synctroop:token') || ''
}

// Add request interceptor to attach auth token when available
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear user data on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('synctroop:user')
        localStorage.removeItem('synctroop:token')
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export async function loginUser(credentials) {
  const response = await api.post('/api/auth/login', credentials)

  return response.data
}

export async function signupUser(credentials) {
  const response = await api.post('/api/auth/signup', credentials)

  return response.data
}

export async function createRoom(payload) {
  const response = await api.post('/api/room/create', payload)

  return response.data
}

export async function joinRoom(payload) {
  console.log('[API] joinRoom request:', { roomCode: payload.roomCode, userId: payload.user?.id })
  const response = await api.post('/api/room/join', payload)
  console.log('[API] joinRoom response:', {
    roomCode: response.data.room?.code,
    creatorId: response.data.room?.creatorId,
    creatorName: response.data.room?.creatorName,
    membersCount: response.data.members?.length,
    tasksCount: response.data.tasks?.length,
  })
  return response.data
}

export async function getRoomTasks(roomCode, user) {
  const response = await api.get('/api/room/tasks', { params: { roomCode, userId: user?.id } })

  return response.data
}

export async function getRoomMembers(roomCode, user) {
  const response = await api.get('/api/room/members', { params: { roomCode, userId: user?.id } })

  return response.data
}

export default api