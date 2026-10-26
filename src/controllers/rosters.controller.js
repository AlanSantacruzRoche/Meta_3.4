import { Op } from 'sequelize';
import { Jugador, Roster, RosterJugador } from '../models/index.js';
import { handleError, validarCampos } from '../utils/errors.js';

export async function listar(req, res) {
  try {
    const { tipo, temporada } = req.query;
    if (tipo && !['Principal', 'Academy'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido. Usa Principal o Academy.' });
    const where = {};
    if (tipo) where.tipo = tipo;
    if (temporada) where.temporada = String(temporada);
    const rosters = await Roster.findAll({
      where, order: [['nombre', 'ASC']],
      include: [{ model: Jugador, as: 'jugadores', attributes: ['id'], through: { attributes: [] }, required: false }]
    });
    res.json(rosters.map(r => {
      const data = r.toJSON();
      data.cantidad_jugadores = data.jugadores.length;
      delete data.jugadores;
      return data;
    }));
  } catch (e) { handleError(e, res); }
}

export async function detalle(req, res) {
  try {
    const roster = await Roster.findByPk(req.params.id, {
      include: [{ model: Jugador, as: 'jugadores', attributes: ['id', 'nickname', 'rol', 'pais', 'estado'], through: { attributes: ['rol_en_roster'] } }]
    });
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado.' });
    const data = roster.toJSON();
    data.jugadores = data.jugadores.map(j => ({
      id: j.id, nickname: j.nickname, rol: j.rol, pais: j.pais, estado: j.estado,
      rol_en_roster: j.RosterJugador.rol_en_roster
    }));
    res.json(data);
  } catch (e) { handleError(e, res); }
}

export async function crear(req, res) {
  try {
    const faltantes = validarCampos(req.body, ['nombre', 'temporada']);
    if (faltantes.length) return res.status(400).json({ error: 'Faltan campos obligatorios.', campos: faltantes });
    if (req.body.tipo && !['Principal', 'Academy'].includes(req.body.tipo)) return res.status(400).json({ error: 'Tipo inválido. Usa Principal o Academy.' });
    const roster = await Roster.create({
      nombre: String(req.body.nombre).trim(),
      juego: req.body.juego || 'League of Legends',
      tipo: req.body.tipo || 'Principal',
      temporada: String(req.body.temporada)
    });
    res.status(201).json(roster);
  } catch (e) { handleError(e, res); }
}

export async function actualizar(req, res) {
  try {
    const roster = await Roster.findByPk(req.params.id);
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado.' });
    const { nombre, juego, tipo, temporada } = req.body;
    if (tipo !== undefined && !['Principal', 'Academy'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido. Usa Principal o Academy.' });
    if (nombre !== undefined && !String(nombre).trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío.' });
    await roster.update({
      ...(nombre !== undefined && { nombre: String(nombre).trim() }),
      ...(juego !== undefined && { juego }),
      ...(tipo !== undefined && { tipo }),
      ...(temporada !== undefined && { temporada: String(temporada) })
    });
    res.json(roster);
  } catch (e) { handleError(e, res); }
}

export async function eliminar(req, res) {
  try {
    const roster = await Roster.findByPk(req.params.id);
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado.' });
    await RosterJugador.destroy({ where: { id_roster: roster.id } });
    await roster.destroy();
    res.status(204).end();
  } catch (e) { handleError(e, res); }
}

export async function listarJugadores(req, res) {
  try {
    const roster = await Roster.findByPk(req.params.id);
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado.' });
    const asignaciones = await RosterJugador.findAll({
      where: { id_roster: roster.id }, include: [{ model: Jugador, attributes: ['id', 'nickname', 'nombre_real', 'pais', 'rol', 'estado'] }]
    });
    res.json(asignaciones.map(a => ({ ...a.Jugador.toJSON(), rol_en_roster: a.rol_en_roster })));
  } catch (e) { handleError(e, res); }
}

async function validarAsignacion(idRoster, idJugador, rolEnRoster, excluirId = null) {
  if (!['Titular', 'Suplente'].includes(rolEnRoster)) return { status: 400, error: 'rol_en_roster debe ser Titular o Suplente.' };
  const roster = await Roster.findByPk(idRoster);
  if (!roster) return { status: 404, error: 'Roster no encontrado.' };
  const jugador = await Jugador.findByPk(idJugador);
  if (!jugador) return { status: 404, error: 'Jugador no encontrado.' };
  if (rolEnRoster === 'Titular') {
    const where = { id_roster: idRoster, rol_en_roster: 'Titular' };
    if (excluirId) where.id = { [Op.ne]: excluirId };
    const titulares = await RosterJugador.findAll({ where, include: [{ model: Jugador, attributes: ['rol'] }] });
    if (titulares.length >= 5) return { status: 409, error: 'Un roster no puede tener más de 5 titulares.' };
    if (titulares.some(a => a.Jugador.rol === jugador.rol)) {
      return { status: 409, error: `Ya existe un titular con el rol ${jugador.rol} en este roster.` };
    }
  }
  return null;
}

export async function asignarJugador(req, res) {
  try {
    const faltantes = validarCampos(req.body, ['id_jugador', 'rol_en_roster']);
    if (faltantes.length) return res.status(400).json({ error: 'Faltan campos obligatorios.', campos: faltantes });
    const error = await validarAsignacion(req.params.id, req.body.id_jugador, req.body.rol_en_roster);
    if (error) return res.status(error.status).json({ error: error.error });
    const asignacion = await RosterJugador.create({
      id_roster: req.params.id, id_jugador: req.body.id_jugador, rol_en_roster: req.body.rol_en_roster
    });
    res.status(201).json(asignacion);
  } catch (e) { handleError(e, res); }
}

export async function cambiarRolJugador(req, res) {
  try {
    const asignacion = await RosterJugador.findOne({ where: { id_roster: req.params.id, id_jugador: req.params.id_jugador } });
    if (!asignacion) return res.status(404).json({ error: 'La asignación no existe en este roster.' });
    const error = await validarAsignacion(req.params.id, req.params.id_jugador, req.body.rol_en_roster, asignacion.id);
    if (error) return res.status(error.status).json({ error: error.error });
    await asignacion.update({ rol_en_roster: req.body.rol_en_roster });
    res.json(asignacion);
  } catch (e) { handleError(e, res); }
}

export async function quitarJugador(req, res) {
  try {
    const asignacion = await RosterJugador.findOne({ where: { id_roster: req.params.id, id_jugador: req.params.id_jugador } });
    if (!asignacion) return res.status(404).json({ error: 'La asignación no existe en este roster.' });
    await asignacion.destroy();
    res.status(204).end();
  } catch (e) { handleError(e, res); }
}
