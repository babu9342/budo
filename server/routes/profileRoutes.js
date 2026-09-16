import express from 'express';
import { updateProfile, uploadPhoto, convertTo90sPhoto } from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.put('/me', authenticateToken, updateProfile);
router.post('/photo', authenticateToken, uploadAvatar.single('photo'), uploadPhoto);
router.post('/convert-90s', authenticateToken, uploadAvatar.single('photo'), convertTo90sPhoto);

export default router;
