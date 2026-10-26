import { Router } from 'express';
import { roles, estados } from '../models/jugador.model.js';

const router = Router();
router.get('/roles', (_req, res) => res.json(roles));
router.get('/estados', (_req, res) => res.json(estados));
router.get('/tipos-roster', (_req, res) => res.json(['Principal', 'Academy']));
export default router;
