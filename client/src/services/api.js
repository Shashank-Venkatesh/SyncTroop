import axios from 'axios'
import {
  createDemoAuthResponse,
  createDemoRoomBundle,
  createDemoRoomLookup,
} from '../utils/mockData.js'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function requestWithFallback(requestFn, fallbackFn) {
  try {
    const response = await requestFn()

    return response.data
  } catch (error) {
    const hasServerResponse = Boolean(error?.response)
    const isNetworkFailure = !hasServerResponse

    if (isNetworkFailure && typeof fallbackFn === 'function') {
      return fallbackFn(error)
    }

    throw error
  }
}

export async function loginUser(credentials) {
  return requestWithFallback(
    () => api.post('/auth/login', credentials),
    () => createDemoAuthResponse(credentials),
  )
}

export async function signupUser(credentials) {
  return requestWithFallback(
    () => api.post('/auth/signup', credentials),
    () => createDemoAuthResponse(credentials),
  )
}

export async function createRoom(payload) {
  return requestWithFallback(
    () => api.post('/room/create', payload),
    () => createDemoRoomBundle({ roomCode: payload?.roomCode, user: payload?.user, isCreator: true, roomName: payload?.roomName }),
  )
}

export async function joinRoom(payload) {
  return requestWithFallback(
    () => api.post('/room/join', payload),
    () => createDemoRoomLookup(payload?.roomCode, payload?.user, false),
  )
}

export async function getRoomTasks(roomCode, user) {
  return requestWithFallback(
    () => api.get('/room/tasks', { params: { roomCode } }),
    () => createDemoRoomLookup(roomCode, user, false).tasks,
  )
}

export async function getRoomMembers(roomCode, user) {
  return requestWithFallback(
    () => api.get('/room/members', { params: { roomCode } }),
    () => createDemoRoomLookup(roomCode, user, false).members,
  )
}

export default api