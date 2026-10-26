import { Router } from 'express';
import * as c from '../controllers/rosters.controller.js';
import { authenticateJWT, requireAdmin, verifyCsrf } from '../middleware/admin.js';

const router = Router();
router.get('/', c.listar);
router.get('/:id/jugadores', c.listarJugadores);
router.post('/:id/jugadores', authenticateJWT, requireAdmin, verifyCsrf, c.asignarJugador);
router.put('/:id/jugadores/:id_jugador', authenticateJWT, requireAdmin, verifyCsrf, c.cambiarRolJugador);
router.delete('/:id/jugadores/:id_jugador', authenticateJWT, requireAdmin, verifyCsrf, c.quitarJugador);
router.get('/:id', c.detalle);
router.post('/', authenticateJWT, requireAdmin, verifyCsrf, c.crear);
router.put('/:id', authenticateJWT, requireAdmin, verifyCsrf, c.actualizar);
router.delete('/:id', authenticateJWT, requireAdmin, verifyCsrf, c.eliminar);
export default router;
