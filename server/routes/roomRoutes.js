import express from 'express';
import { createRoom, joinRoom, getRoomTasks, getRoomMembers } from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/tasks', protect, getRoomTasks);
router.get('/members', protect, getRoomMembers);

export default router;
