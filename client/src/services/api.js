import axios from 'axios'

const PROD_BACKEND = 'https://synctroops.onrender.com'

// Determine the correct API base URL
const getBaseUrl = () => {
  // Use explicit VITE_API_URL if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use the current origin as the backend (when deployed together)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // In development, use localhost
  return 'http://localhost:3000';
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

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear user data on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('synctroop:user')
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
  const response = await api.post('/api/room/join', payload)

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