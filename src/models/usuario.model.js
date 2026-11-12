import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  google_id: { type: DataTypes.STRING(255), allowNull: false, unique: { name: 'uq_usuarios_google_id' } },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: { name: 'uq_usuarios_email' } },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  foto: { type: DataTypes.STRING(2048), allowNull: true },
  proveedor: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'google' },
  rol: { type: DataTypes.ENUM('Admin', 'Public'), allowNull: false, defaultValue: 'Public' }
}, {
  tableName: 'usuarios',
  timestamps: true,
  underscored: true
});

export default Usuario;
