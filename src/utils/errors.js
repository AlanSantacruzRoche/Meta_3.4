import { UniqueConstraintError, ValidationError, ForeignKeyConstraintError } from 'sequelize';

export function handleError(err, res) {
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ error: 'Conflicto: el nickname ya existe o el jugador ya está asignado a este roster.' });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Datos inválidos.',
      detalles: err.errors.map(e => e.message)
    });
  }
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(404).json({ error: 'No se encontró el recurso relacionado.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

export function validarCampos(body, campos) {
  const faltantes = campos.filter(c => body[c] === undefined || body[c] === null || body[c] === '');
  return faltantes;
}
