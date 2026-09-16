import express from 'express';
import { createRoom, getRoomByCode, joinRoom } from '../controllers/roomController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authenticateToken, createRoom);
router.post('/join', authenticateToken, joinRoom);
router.get('/:code', getRoomByCode);

export default router;
