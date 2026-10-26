import { Router } from 'express';
import { login, me, logout } from '../controllers/auth.controller.js';
import { authenticateJWT, requireAdmin, verifyCsrf } from '../middleware/admin.js';

const router = Router();
router.post('/login', login);
router.get('/me', authenticateJWT, requireAdmin, me);
router.post('/logout', authenticateJWT, requireAdmin, verifyCsrf, logout);
export default router;
