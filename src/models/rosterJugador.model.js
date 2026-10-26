import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RosterJugador = sequelize.define('RosterJugador', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_roster: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  rol_en_roster: { type: DataTypes.ENUM('Titular', 'Suplente'), allowNull: false }
}, {
  tableName: 'roster_jugadores',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['id_roster', 'id_jugador'], name: 'uq_jugador_por_roster' }]
});

export default RosterJugador;
