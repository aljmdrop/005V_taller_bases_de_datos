/* =====================================================================
   LIBRO DE ASISTENCIA — Lógica de la aplicación
   HTML5 + CSS3 + JavaScript Vanilla ES6+
   Persistencia: localStorage (formato JSON)
===================================================================== */

/* ---------------------------------------------------------------------
   1. CLAVE DE ALMACENAMIENTO Y ESQUEMA DE DATOS
   --------------------------------------------------------------------
   DB = {
     estudiantes:  [{ id, nombre }],
     sesiones:     [{ id, nombre, fecha }],
     registros:    [{ id, sesionId, estudianteId, estado, hora, justificacion }]
       estado         -> 'presente' | 'ausente'
       justificacion  -> { motivo, fecha } | null
--------------------------------------------------------------------- */
const STORAGE_KEY = 'libroAsistencia_db';

let db = null;
let sesionSeleccionadaId = null;
let ausenteEnJustificacion = null; // { registroId, estudianteNombre }

/* ---------------------------------------------------------------------
   2. CAPA DE PERSISTENCIA
--------------------------------------------------------------------- */
function cargarDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);

  // Datos de prueba iniciales
  return {
    estudiantes: [
      { id: 'est-1', nombre: 'Camila Rojas' },
      { id: 'est-2', nombre: 'Diego Fuentes' },
      { id: 'est-3', nombre: 'Valentina Muñoz' },
      { id: 'est-4', nombre: 'Martín Herrera' },
    ],
    sesiones: [],
    registros: [],
  };
}

function guardarDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/* ---------------------------------------------------------------------
   3. UTILIDADES
--------------------------------------------------------------------- */
function generarId(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatearHora(iso) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatearFechaLegible(fechaISO) {
  // fechaISO viene de <input type="date"> -> 'YYYY-MM-DD'
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

/* ---------------------------------------------------------------------
   4. GESTIÓN DE SESIONES
--------------------------------------------------------------------- */
function crearSesion(nombre, fecha) {
  const sesion = { id: generarId('ses'), nombre, fecha };
  db.sesiones.push(sesion);
  guardarDB();
  return sesion;
}

function obtenerSesion(id) {
  return db.sesiones.find((s) => s.id === id) || null;
}

function renderSelectSesiones() {
  const select = document.getElementById('select-sesion');
  select.innerHTML = db.sesiones
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .map((s) => `<option value="${s.id}">${s.nombre} — ${formatearFechaLegible(s.fecha)}</option>`)
    .join('') || '<option value="">Sin sesiones creadas</option>';

  if (sesionSeleccionadaId) select.value = sesionSeleccionadaId;
}

/* ---------------------------------------------------------------------
   5. GESTIÓN DE ESTUDIANTES
--------------------------------------------------------------------- */
function agregarEstudiante(nombre) {
  db.estudiantes.push({ id: generarId('est'), nombre });
  guardarDB();
}

function renderListaEstudiantes() {
  const ul = document.getElementById('lista-estudiantes');
  ul.innerHTML = db.estudiantes
    .map((e) => `<li class="chip">${e.nombre}</li>`)
    .join('') || '<li class="chip">Sin estudiantes registrados</li>';
}

/* ---------------------------------------------------------------------
   6. REGISTROS DE ASISTENCIA
--------------------------------------------------------------------- */
function obtenerRegistro(sesionId, estudianteId) {
  return db.registros.find(
    (r) => r.sesionId === sesionId && r.estudianteId === estudianteId
  );
}

function marcarAsistencia(sesionId, estudianteId, estado) {
  let registro = obtenerRegistro(sesionId, estudianteId);

  if (registro) {
    registro.estado = estado;
    registro.hora = new Date().toISOString();
    // Si vuelve a marcarse presente, la justificación deja de tener sentido
    if (estado === 'presente') registro.justificacion = null;
  } else {
    registro = {
      id: generarId('reg'),
      sesionId,
      estudianteId,
      estado,
      hora: new Date().toISOString(),
      justificacion: null,
    };
    db.registros.push(registro);
  }

  guardarDB();
}

function guardarJustificacion(registroId, motivo) {
  const registro = db.registros.find((r) => r.id === registroId);
  if (!registro) return;
  registro.justificacion = { motivo, fecha: new Date().toISOString() };
  guardarDB();
}

/* ---------------------------------------------------------------------
   7. RENDER — TABLA PRINCIPAL DE PASE DE LISTA
--------------------------------------------------------------------- */
function renderTablaLista() {
  const tbody = document.getElementById('tabla-lista-body');
  const label = document.getElementById('sesion-actual-label');

  if (!sesionSeleccionadaId) {
    label.textContent = 'Ninguna sesión seleccionada';
    tbody.innerHTML = '<tr><td colspan="3" class="table__empty">Crea o selecciona una sesión para comenzar.</td></tr>';
    return;
  }

  const sesion = obtenerSesion(sesionSeleccionadaId);
  label.textContent = sesion ? `${sesion.nombre} — ${formatearFechaLegible(sesion.fecha)}` : '—';

  if (db.estudiantes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="table__empty">Añade estudiantes en el panel lateral.</td></tr>';
    return;
  }

  tbody.innerHTML = db.estudiantes
    .map((estudiante) => {
      const registro = obtenerRegistro(sesionSeleccionadaId, estudiante.id);
      const estado = registro ? registro.estado : null;

      const stamp = estado === 'presente'
        ? '<span class="stamp stamp--presente">Presente</span>'
        : estado === 'ausente'
          ? '<span class="stamp stamp--ausente">Ausente</span>'
          : '<span class="stamp stamp--pendiente">Pendiente</span>';

      return `
        <tr>
          <td>${estudiante.nombre}</td>
          <td>${stamp}</td>
          <td>
            <div class="attendance-toggle">
              <button
                class="toggle-btn ${estado === 'presente' ? 'toggle-btn--active-presente' : ''}"
                data-accion="marcar" data-estudiante="${estudiante.id}" data-estado="presente"
              >Presente</button>
              <button
                class="toggle-btn ${estado === 'ausente' ? 'toggle-btn--active-ausente' : ''}"
                data-accion="marcar" data-estudiante="${estudiante.id}" data-estado="ausente"
              >Ausente</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/* ---------------------------------------------------------------------
   8. RENDER — TABLAS RESUMEN (ASISTENTES / NO ASISTENTES)
--------------------------------------------------------------------- */
function renderResumen() {
  const tbodyAsistentes = document.getElementById('tabla-asistentes-body');
  const tbodyAusentes = document.getElementById('tabla-ausentes-body');
  const countAsistentes = document.getElementById('count-asistentes');
  const countAusentes = document.getElementById('count-ausentes');

  if (!sesionSeleccionadaId) {
    tbodyAsistentes.innerHTML = '<tr><td colspan="2" class="table__empty">Sin registros aún.</td></tr>';
    tbodyAusentes.innerHTML = '<tr><td colspan="3" class="table__empty">Sin registros aún.</td></tr>';
    countAsistentes.textContent = '0';
    countAusentes.textContent = '0';
    return;
  }

  const registrosSesion = db.registros.filter((r) => r.sesionId === sesionSeleccionadaId);

  const asistentes = registrosSesion.filter((r) => r.estado === 'presente');
  const ausentes = registrosSesion.filter((r) => r.estado === 'ausente');

  countAsistentes.textContent = String(asistentes.length);
  countAusentes.textContent = String(ausentes.length);

  tbodyAsistentes.innerHTML = asistentes.length
    ? asistentes
        .map((r) => {
          const estudiante = db.estudiantes.find((e) => e.id === r.estudianteId);
          return `
            <tr>
              <td>${estudiante ? estudiante.nombre : '—'}</td>
              <td>${formatearHora(r.hora)}</td>
            </tr>
          `;
        })
        .join('')
    : '<tr><td colspan="2" class="table__empty">Aún no hay asistentes registrados.</td></tr>';

  tbodyAusentes.innerHTML = ausentes.length
    ? ausentes
        .map((r) => {
          const estudiante = db.estudiantes.find((e) => e.id === r.estudianteId);
          const nombreEstudiante = estudiante ? estudiante.nombre : '—';

          const celdaJustificacion = r.justificacion
            ? `<span class="justificacion-text">${r.justificacion.motivo}</span>`
            : `<span class="justificacion-text">Sin justificar</span>`;

          const botonAccion = `
            <button class="link-btn" data-accion="justificar" data-registro="${r.id}" data-nombre="${nombreEstudiante}">
              ${r.justificacion ? 'Editar' : 'Justificar'}
            </button>
          `;

          return `
            <tr>
              <td>${nombreEstudiante}</td>
              <td>${celdaJustificacion}</td>
              <td>${botonAccion}</td>
            </tr>
          `;
        })
        .join('')
    : '<tr><td colspan="3" class="table__empty">Aún no hay inasistencias registradas.</td></tr>';
}

function renderTodo() {
  renderSelectSesiones();
  renderListaEstudiantes();
  renderTablaLista();
  renderResumen();
}

/* ---------------------------------------------------------------------
   9. MODAL DE JUSTIFICACIÓN
--------------------------------------------------------------------- */
function abrirModalJustificacion(registroId, nombreEstudiante) {
  ausenteEnJustificacion = registroId;

  document.getElementById('modal-student-name').textContent = nombreEstudiante;

  const registro = db.registros.find((r) => r.id === registroId);
  document.getElementById('input-justificacion').value =
    registro && registro.justificacion ? registro.justificacion.motivo : '';

  document.getElementById('modal-overlay').hidden = false;
  document.getElementById('input-justificacion').focus();
}

function cerrarModalJustificacion() {
  ausenteEnJustificacion = null;
  document.getElementById('modal-overlay').hidden = true;
  document.getElementById('form-justificar').reset();
}

/* ---------------------------------------------------------------------
   10. EXPORTAR JSON
--------------------------------------------------------------------- */
function exportarJSON() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const fecha = new Date().toISOString().slice(0, 10);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `asistencia_${fecha}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------
   11. EVENTOS
--------------------------------------------------------------------- */
function initEventos() {
  // Crear nueva sesión
  document.getElementById('form-sesion').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('input-sesion-nombre').value.trim();
    const fecha = document.getElementById('input-sesion-fecha').value;
    if (!nombre || !fecha) return;

    const sesion = crearSesion(nombre, fecha);
    sesionSeleccionadaId = sesion.id;

    document.getElementById('input-sesion-nombre').value = '';
    document.getElementById('input-sesion-fecha').value = '';

    renderTodo();
  });

  // Seleccionar sesión existente
  document.getElementById('select-sesion').addEventListener('change', (e) => {
    sesionSeleccionadaId = e.target.value || null;
    renderTablaLista();
    renderResumen();
  });

  // Añadir estudiante
  document.getElementById('form-estudiante').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-estudiante-nombre');
    const nombre = input.value.trim();
    if (!nombre) return;

    agregarEstudiante(nombre);
    input.value = '';
    renderTodo();
  });

  // Delegación de eventos: marcar asistencia y abrir justificación
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn || !sesionSeleccionadaId) return;

    if (btn.dataset.accion === 'marcar') {
      marcarAsistencia(sesionSeleccionadaId, btn.dataset.estudiante, btn.dataset.estado);
      renderTablaLista();
      renderResumen();
    }

    if (btn.dataset.accion === 'justificar') {
      abrirModalJustificacion(btn.dataset.registro, btn.dataset.nombre);
    }
  });

  // Guardar justificación
  document.getElementById('form-justificar').addEventListener('submit', (e) => {
    e.preventDefault();
    const motivo = document.getElementById('input-justificacion').value.trim();
    if (!motivo || !ausenteEnJustificacion) return;

    guardarJustificacion(ausenteEnJustificacion, motivo);
    cerrarModalJustificacion();
    renderResumen();
  });

  document.getElementById('btn-cancelar-justificacion').addEventListener('click', cerrarModalJustificacion);

  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') cerrarModalJustificacion();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModalJustificacion();
  });

  // Exportar
  document.getElementById('btn-exportar').addEventListener('click', exportarJSON);
}

/* ---------------------------------------------------------------------
   12. ARRANQUE
--------------------------------------------------------------------- */
function initApp() {
  db = cargarDB();
  guardarDB();

  // Fecha de hoy por defecto en el formulario de nueva sesión
  document.getElementById('input-sesion-fecha').value = new Date().toISOString().slice(0, 10);

  initEventos();
  renderTodo();
}

document.addEventListener('DOMContentLoaded', initApp);
