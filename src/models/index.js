import Jugador from './jugador.model.js';
import Roster from './roster.model.js';
import RosterJugador from './rosterJugador.model.js';

Roster.belongsToMany(Jugador, {
  through: RosterJugador, as: 'jugadores', foreignKey: 'id_roster', otherKey: 'id_jugador'
});
Jugador.belongsToMany(Roster, {
  through: RosterJugador, as: 'rosters', foreignKey: 'id_jugador', otherKey: 'id_roster'
});
Roster.hasMany(RosterJugador, { foreignKey: 'id_roster', onDelete: 'CASCADE' });
RosterJugador.belongsTo(Roster, { foreignKey: 'id_roster' });
RosterJugador.belongsTo(Jugador, { foreignKey: 'id_jugador' });

export { Jugador, Roster, RosterJugador };
