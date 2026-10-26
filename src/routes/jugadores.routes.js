import { Router } from 'express';
import * as c from '../controllers/jugadores.controller.js';
import { authenticateJWT, requireAdmin, verifyCsrf } from '../middleware/admin.js';

const router = Router();
router.get('/', c.listar);
router.get('/:id', c.detalle);
router.post('/', authenticateJWT, requireAdmin, verifyCsrf, c.crear);
router.put('/:id', authenticateJWT, requireAdmin, verifyCsrf, c.actualizar);
router.delete('/:id', authenticateJWT, requireAdmin, verifyCsrf, c.eliminar);
export default router;
