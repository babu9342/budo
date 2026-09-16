import express from 'express';
import { getRankings, getGameHistory } from '../controllers/rankingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getRankings);
router.get('/history/:userId', authenticateToken, getGameHistory);

export default router;
