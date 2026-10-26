import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Roster = sequelize.define('Roster', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'El nombre del roster es obligatorio.' }, len: [1, 100] }
  },
  juego: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'League of Legends' },
  tipo: { type: DataTypes.ENUM('Principal', 'Academy'), allowNull: false, defaultValue: 'Principal' },
  temporada: { type: DataTypes.STRING(20), allowNull: false }
}, { tableName: 'rosters', timestamps: true, underscored: true });

export default Roster;
