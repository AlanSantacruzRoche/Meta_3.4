const API = '/api/v1';
let csrfToken = '';
let players = [];
let rosters = [];
let currentRosterId = null;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api = async (path, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (!['GET','HEAD','OPTIONS'].includes(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(`${API}${path}`, { ...options, method, headers, credentials: 'include' });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return data;
};
const setMessage = (selector, text, good = false) => {
  const el = $(selector); if (!el) return;
  el.textContent = text || ''; el.style.color = good ? 'var(--accent)' : 'var(--red)';
};
function showLogin() {
  $('#loginView').classList.remove('hidden');
  $('#adminView').classList.add('hidden');
  $('#topUser').classList.add('hidden');
  csrfToken = '';
}
function showAdmin(user) {
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.remove('hidden');
  $('#topUser').classList.remove('hidden');
  $('#userEmail').textContent = user.email || 'Administrador';
  loadDashboard().catch(e => setMessage('#globalMessage', e.message));
}
async function checkSession() {
  try {
    const session = await api('/auth/me');
    csrfToken = session.csrfToken;
    showAdmin(session.user);
  } catch { showLogin(); }
}
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); setMessage('#loginMessage', 'Validando acceso...');
  const form = new FormData(e.currentTarget);
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    csrfToken = data.csrfToken;
    e.currentTarget.reset();
    setMessage('#loginMessage', '');
    showAdmin(data.user);
  } catch (err) { setMessage('#loginMessage', err.message); }
});
$('#logoutBtn').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST', body: '{}' }); } catch {}
  showLogin();
});
document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
  $('#playersSection').classList.toggle('hidden', btn.dataset.tab !== 'players');
  $('#rostersSection').classList.toggle('hidden', btn.dataset.tab !== 'rosters');
}));
async function loadDashboard() {
  const [p, r] = await Promise.all([api('/jugadores'), api('/rosters')]);
  players = p; rosters = r;
  $('#playersCount').textContent = p.length;
  $('#rostersCount').textContent = r.length;
  $('#activeCount').textContent = p.filter(x => x.estado === 'activo').length;
  renderPlayers(); renderRosters();
}
function filteredPlayers() {
  const q = $('#playerSearch').value.trim().toLowerCase();
  const role = $('#playerRole').value, state = $('#playerState').value;
  return players.filter(p => (!q || p.nickname.toLowerCase().includes(q) || (p.nombre_real || '').toLowerCase().includes(q)) &&
    (!role || p.rol === role) && (!state || p.estado === state));
}
function renderPlayers() {
  const list = filteredPlayers();
  $('#playersTable').innerHTML = list.map(p => `<tr>
    <td><div class="player-name">${escapeHtml(p.nickname)}</div><div class="subtext">${escapeHtml(p.nombre_real || 'Nombre no especificado')}</div></td>
    <td><span class="pill role">${escapeHtml(p.rol)}</span></td><td>${escapeHtml(p.pais || '—')}</td>
    <td><span class="pill ${p.estado === 'activo' ? 'active' : 'inactive'}">${escapeHtml(p.estado)}</span></td>
    <td><div class="actions"><button class="mini-btn" data-edit-player="${p.id}">Editar</button><button class="mini-btn danger" data-delete-player="${p.id}">Eliminar</button></div></td>
  </tr>`).join('');
  $('#playersEmpty').classList.toggle('hidden', list.length !== 0);
  $('#playersTable').querySelectorAll('[data-edit-player]').forEach(b => b.addEventListener('click', () => openPlayer(players.find(p => p.id == b.dataset.editPlayer))));
  $('#playersTable').querySelectorAll('[data-delete-player]').forEach(b => b.addEventListener('click', () => deletePlayer(b.dataset.deletePlayer)));
}
['#playerSearch','#playerRole','#playerState'].forEach(sel => $(sel).addEventListener('input', renderPlayers));
function openPlayer(player = null) {
  const form = $('#playerForm'); form.reset();
  form.elements.id.value = player?.id || '';
  form.elements.nickname.value = player?.nickname || '';
  form.elements.nombre_real.value = player?.nombre_real || '';
  form.elements.pais.value = player?.pais || '';
  form.elements.rol.value = player?.rol || '';
  form.elements.estado.value = player?.estado || 'activo';
  $('#playerDialogTitle').textContent = player ? 'Editar jugador' : 'Nuevo jugador';
  setMessage('#playerFormMessage', '');
  $('#playerDialog').showModal();
}
$('#newPlayerBtn').addEventListener('click', () => openPlayer());
$('#playerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget, id = f.elements.id.value;
  const body = { nickname:f.elements.nickname.value.trim(), nombre_real:f.elements.nombre_real.value.trim() || null, pais:f.elements.pais.value.trim() || null, rol:f.elements.rol.value, estado:f.elements.estado.value };
  try {
    await api(id ? `/jugadores/${id}` : '/jugadores', { method:id ? 'PUT':'POST', body:JSON.stringify(body) });
    $('#playerDialog').close(); await loadDashboard(); setMessage('#globalMessage', id ? 'Jugador actualizado.' : 'Jugador creado.', true);
  } catch (err) { setMessage('#playerFormMessage', err.message); }
});
async function deletePlayer(id) {
  const p = players.find(x => x.id == id);
  if (!confirm(`¿Eliminar al jugador "${p?.nickname || id}"? También se quitará de sus rosters.`)) return;
  try { await api(`/jugadores/${id}`, { method:'DELETE' }); await loadDashboard(); setMessage('#globalMessage','Jugador eliminado.',true); }
  catch (e) { setMessage('#globalMessage', e.message); }
}
async function renderRosters() {
  const type = $('#rosterType').value, season = $('#rosterSeason').value.trim();
  let list = rosters.filter(r => (!type || r.tipo === type) && (!season || String(r.temporada).includes(season)));
  $('#rostersGrid').innerHTML = list.map(r => `<article class="roster-card">
    <div class="roster-card-top"><span class="pill ${r.tipo === 'Principal' ? 'active' : ''}">${escapeHtml(r.tipo)}</span><span class="subtext">#${r.id}</span></div>
    <h3>${escapeHtml(r.nombre)}</h3><p>${escapeHtml(r.juego || 'Juego no especificado')}</p>
    <div class="roster-bottom"><small>TEMPORADA ${escapeHtml(r.temporada)} · ${r.cantidad_jugadores ?? 0} JUGADORES</small>
      <div class="roster-actions"><button class="mini-btn" data-detail-roster="${r.id}">Ver</button><button class="mini-btn" data-edit-roster="${r.id}">Editar</button><button class="mini-btn danger" data-delete-roster="${r.id}">×</button></div></div>
  </article>`).join('');
  $('#rostersEmpty').classList.toggle('hidden', list.length !== 0);
  $('#rostersGrid').querySelectorAll('[data-detail-roster]').forEach(b => b.addEventListener('click', () => openRosterDetail(b.dataset.detailRoster)));
  $('#rostersGrid').querySelectorAll('[data-edit-roster]').forEach(b => b.addEventListener('click', () => openRoster(rosters.find(r => r.id == b.dataset.editRoster))));
  $('#rostersGrid').querySelectorAll('[data-delete-roster]').forEach(b => b.addEventListener('click', () => deleteRoster(b.dataset.deleteRoster)));
}
$('#rosterType').addEventListener('change', renderRosters);
$('#rosterSeason').addEventListener('input', renderRosters);
function openRoster(roster = null) {
  const f = $('#rosterForm'); f.reset(); f.elements.id.value = roster?.id || '';
  f.elements.nombre.value = roster?.nombre || ''; f.elements.juego.value = roster?.juego || 'League of Legends';
  f.elements.tipo.value = roster?.tipo || 'Principal'; f.elements.temporada.value = roster?.temporada || '2026';
  $('#rosterDialogTitle').textContent = roster ? 'Editar roster' : 'Nuevo roster';
  setMessage('#rosterFormMessage',''); $('#rosterDialog').showModal();
}
$('#newRosterBtn').addEventListener('click', () => openRoster());
$('#rosterForm').addEventListener('submit', async e => {
  e.preventDefault(); const f=e.currentTarget, id=f.elements.id.value;
  const body={nombre:f.elements.nombre.value.trim(),juego:f.elements.juego.value.trim() || 'League of Legends',tipo:f.elements.tipo.value,temporada:f.elements.temporada.value.trim()};
  try { await api(id ? `/rosters/${id}`:'/rosters',{method:id?'PUT':'POST',body:JSON.stringify(body)}); $('#rosterDialog').close(); await loadDashboard(); setMessage('#globalMessage',id?'Roster actualizado.':'Roster creado.',true); }
  catch(err){setMessage('#rosterFormMessage',err.message);}
});
async function deleteRoster(id) {
  const r=rosters.find(x=>x.id==id);
  if(!confirm(`¿Eliminar el roster "${r?.nombre || id}" y sus asignaciones?`)) return;
  try{await api(`/rosters/${id}`,{method:'DELETE'});await loadDashboard();setMessage('#globalMessage','Roster eliminado.',true);}
  catch(e){setMessage('#globalMessage',e.message);}
}
async function openRosterDetail(id) {
  currentRosterId = id; const roster=rosters.find(r=>r.id==id);
  $('#detailTitle').textContent = roster?.nombre || `Roster ${id}`;
  setMessage('#assignMessage','');
  try {
    const members=await api(`/rosters/${id}/jugadores`);
    $('#rosterDetailBody').innerHTML = members.length ? members.map(p=>`<div class="lineup-row"><div><div class="lineup-name">${escapeHtml(p.nickname)}</div><div class="lineup-meta">${escapeHtml(p.rol)} · ${escapeHtml(p.pais || 'País no especificado')}</div></div><div class="actions"><span class="pill ${p.rol_en_roster==='Titular'?'active':''}">${escapeHtml(p.rol_en_roster)}</span><button class="mini-btn" data-toggle-player="${p.id}" data-current-role="${escapeHtml(p.rol_en_roster)}">${p.rol_en_roster==='Titular'?'A suplente':'A titular'}</button><button class="mini-btn danger" data-remove-player="${p.id}">Quitar</button></div></div>`).join('') : '<p class="empty">Este roster todavía no tiene integrantes.</p>';
    $('#rosterDetailBody').querySelectorAll('[data-toggle-player]').forEach(b=>b.addEventListener('click',async()=>{
      const next=b.dataset.currentRole==='Titular'?'Suplente':'Titular';
      try{await api(`/rosters/${currentRosterId}/jugadores/${b.dataset.togglePlayer}`,{method:'PUT',body:JSON.stringify({rol_en_roster:next})});await openRosterDetail(currentRosterId);await loadDashboard();}
      catch(e){setMessage('#assignMessage',e.message);}
    }));
    $('#rosterDetailBody').querySelectorAll('[data-remove-player]').forEach(b=>b.addEventListener('click',async()=>{
      if(!confirm('¿Quitar este jugador del roster?'))return;
      try{await api(`/rosters/${currentRosterId}/jugadores/${b.dataset.removePlayer}`,{method:'DELETE'});await openRosterDetail(currentRosterId);await loadDashboard();}
      catch(e){setMessage('#assignMessage',e.message);}
    }));
    const available=players.filter(p=>p.estado==='activo' && !members.some(m=>m.id===p.id));
    $('#assignPlayer').innerHTML=available.map(p=>`<option value="${p.id}">${escapeHtml(p.nickname)} · ${escapeHtml(p.rol)}</option>`).join('');
    $('#assignPlayer').disabled=!available.length;
    $('#rosterDetailDialog').showModal();
  } catch(e){setMessage('#globalMessage',e.message);}
}
$('#assignForm').addEventListener('submit',async e=>{
  e.preventDefault(); const id=$('#assignPlayer').value;if(!id)return;
  try{await api(`/rosters/${currentRosterId}/jugadores`,{method:'POST',body:JSON.stringify({id_jugador:Number(id),rol_en_roster:e.currentTarget.elements.rol_en_roster.value})});setMessage('#assignMessage','Jugador asignado.',true);await openRosterDetail(currentRosterId);await loadDashboard();}
  catch(err){setMessage('#assignMessage',err.message);}
});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
checkSession();
