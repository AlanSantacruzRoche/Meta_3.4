import { Op } from 'sequelize';
import { Jugador, RosterJugador } from '../models/index.js';
import { roles, estados } from '../models/jugador.model.js';
import { handleError, validarCampos } from '../utils/errors.js';

export async function listar(req, res) {
  try {
    const { rol, estado, search } = req.query;
    if (rol && !roles.includes(rol)) return res.status(400).json({ error: 'Rol inválido.', roles });
    if (estado && !estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido.', estados });
    const where = {};
    if (rol) where.rol = rol;
    if (estado) where.estado = estado;
    if (search) where.nickname = { [Op.like]: `%${String(search).trim()}%` };
    const jugadores = await Jugador.findAll({ where, order: [['nickname', 'ASC']] });
    res.json(jugadores);
  } catch (e) { handleError(e, res); }
}

export async function detalle(req, res) {
  try {
    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado.' });
    res.json(jugador);
  } catch (e) { handleError(e, res); }
}

export async function crear(req, res) {
  try {
    const faltantes = validarCampos(req.body, ['nickname', 'rol']);
    if (faltantes.length) return res.status(400).json({ error: 'Faltan campos obligatorios.', campos: faltantes });
    if (!roles.includes(req.body.rol)) return res.status(400).json({ error: 'Rol inválido.', roles });
    if (req.body.estado && !estados.includes(req.body.estado)) return res.status(400).json({ error: 'Estado inválido.', estados });
    const jugador = await Jugador.create({
      nickname: String(req.body.nickname).trim(),
      nombre_real: req.body.nombre_real ?? null,
      pais: req.body.pais ?? null,
      rol: req.body.rol,
      estado: req.body.estado ?? 'activo'
    });
    res.status(201).json(jugador);
  } catch (e) { handleError(e, res); }
}

export async function actualizar(req, res) {
  try {
    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado.' });
    const { nickname, nombre_real, pais, rol, estado } = req.body;
    if (rol !== undefined && !roles.includes(rol)) return res.status(400).json({ error: 'Rol inválido.', roles });
    if (estado !== undefined && !estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido.', estados });
    if (nickname !== undefined && !String(nickname).trim()) return res.status(400).json({ error: 'El nickname no puede estar vacío.' });
    await jugador.update({
      ...(nickname !== undefined && { nickname: String(nickname).trim() }),
      ...(nombre_real !== undefined && { nombre_real }),
      ...(pais !== undefined && { pais }),
      ...(rol !== undefined && { rol }),
      ...(estado !== undefined && { estado })
    });
    res.json(jugador);
  } catch (e) { handleError(e, res); }
}

export async function eliminar(req, res) {
  try {
    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado.' });
    // Elimina primero las asignaciones; los rosters y los demás jugadores permanecen.
    await RosterJugador.destroy({ where: { id_jugador: jugador.id } });
    await jugador.destroy();
    res.status(204).end();
  } catch (e) { handleError(e, res); }
}
