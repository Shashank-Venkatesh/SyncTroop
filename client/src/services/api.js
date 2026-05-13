import axios from 'axios'

const DEFAULT_BACKEND = 'https://synctroops.onrender.com'

const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_BACKEND : '/api')

export const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials)

  return response.data
}

export async function signupUser(credentials) {
  const response = await api.post('/auth/signup', credentials)

  return response.data
}

export async function createRoom(payload) {
  const response = await api.post('/room/create', payload)

  return response.data
}

export async function joinRoom(payload) {
  const response = await api.post('/room/join', payload)

  return response.data
}

export async function getRoomTasks(roomCode, user) {
  const response = await api.get('/room/tasks', { params: { roomCode, userId: user?.id } })

  return response.data
}

export async function getRoomMembers(roomCode, user) {
  const response = await api.get('/room/members', { params: { roomCode, userId: user?.id } })

  return response.data
}

export default api