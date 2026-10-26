import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const roles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
const estados = ['activo', 'inactivo'];

const Jugador = sequelize.define('Jugador', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: { name: 'uq_jugadores_nickname', msg: 'El nickname ya está registrado.' },
    validate: { notEmpty: { msg: 'El nickname es obligatorio.' }, len: [1, 50] }
  },
  nombre_real: { type: DataTypes.STRING(120), allowNull: true },
  pais: { type: DataTypes.STRING(80), allowNull: true },
  rol: { type: DataTypes.ENUM(...roles), allowNull: false },
  estado: { type: DataTypes.ENUM(...estados), allowNull: false, defaultValue: 'activo' }
}, { tableName: 'jugadores', timestamps: true, underscored: true });

export { roles, estados };
export default Jugador;
