import express from 'express'
import { createRoomController } from '../controllers/roomController.js'
import { protect } from '../middleware/authMiddleware.js'

export function createRoomRouter(io) {
  const router = express.Router()
  const { createRoom, joinRoom, getRoomTasks, getRoomMembers } = createRoomController(io)

  router.use(protect)

  router.post('/create', createRoom)
  router.post('/join', joinRoom)
  router.get('/tasks', getRoomTasks)
  router.get('/members', getRoomMembers)

  return router
}