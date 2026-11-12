import { Router } from 'express';
import { login, me, logout } from '../controllers/auth.controller.js';
import { authenticateJWT, requireAdmin, verifyCsrf } from '../middleware/admin.js';
import { googleLogin, googleCallback } from '../controllers/google-auth.controller.js';

const router = Router();
router.post('/login', login);
router.get('/google/login', googleLogin);
router.get('/google/callback', googleCallback);
router.get('/me', authenticateJWT, me);
router.post('/logout', authenticateJWT, verifyCsrf, logout);
export default router;
