/* =====================================================================
   AsistApp — Prototipo funcional (HTML5 + CSS3 + JS Vanilla ES6+)
   Persistencia simulada con localStorage / sessionStorage
===================================================================== */

/* ---------------------------------------------------------------------
   1. CONFIGURACIÓN Y CLAVES DE ALMACENAMIENTO
--------------------------------------------------------------------- */
const DB_KEYS = {
  USERS: 'asistapp_users',
  CLASSES: 'asistapp_classes',
  ATTENDANCE: 'asistapp_attendance',
};

const SESSION_KEY = 'asistapp_current_user';

/* ---------------------------------------------------------------------
   2. CAPA DE ACCESO A DATOS ("DB" simulada sobre localStorage)
--------------------------------------------------------------------- */
const DB = {
  get(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

/* ---------------------------------------------------------------------
   3. INICIALIZACIÓN DE DATOS DE PRUEBA
--------------------------------------------------------------------- */
function seedDataIfNeeded() {
  const usersExisting = localStorage.getItem(DB_KEYS.USERS);
  if (usersExisting) return; // Ya hay datos, no sobreescribir

  const users = [
    { id: 'u-prof-1', nombre: 'Prof. Ana Torres', rol: 'profesor' },
    { id: 'u-al-1', nombre: 'Camila Rojas', rol: 'alumno' },
    { id: 'u-al-2', nombre: 'Diego Fuentes', rol: 'alumno' },
    { id: 'u-al-3', nombre: 'Valentina Muñoz', rol: 'alumno' },
  ];

  DB.set(DB_KEYS.USERS, users);
  DB.set(DB_KEYS.CLASSES, []);
  DB.set(DB_KEYS.ATTENDANCE, []);
}

/* ---------------------------------------------------------------------
   4. UTILIDADES
--------------------------------------------------------------------- */
function generarPin() {
  // PIN numérico de 6 dígitos
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generarId(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatearHora(fecha) {
  return fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatearFecha(fecha) {
  return fecha.toLocaleDateString('es-CL');
}

function getUsuarioActivo() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setUsuarioActivo(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function limpiarUsuarioActivo() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ---------------------------------------------------------------------
   5. NAVEGACIÓN ENTRE VISTAS (SPA básica)
--------------------------------------------------------------------- */
const vistas = {
  login: document.getElementById('view-login'),
  profesor: document.getElementById('view-profesor'),
  alumno: document.getElementById('view-alumno'),
};

function mostrarVista(nombre) {
  Object.values(vistas).forEach((v) => { v.hidden = true; });
  vistas[nombre].hidden = false;
}

function actualizarHeader(user) {
  const header = document.getElementById('app-header');
  const label = document.getElementById('user-name-label');

  if (!user) {
    header.hidden = true;
    return;
  }
  header.hidden = false;
  const rolLegible = user.rol === 'profesor' ? 'Profesor/a' : 'Alumno/a';
  label.textContent = `${user.nombre} · ${rolLegible}`;
}

function irAVistaSegunRol(user) {
  actualizarHeader(user);
  if (user.rol === 'profesor') {
    mostrarVista('profesor');
    renderPanelProfesor();
  } else {
    mostrarVista('alumno');
    renderHistorialAlumno();
  }
}

/* ---------------------------------------------------------------------
   6. VISTA: LOGIN
--------------------------------------------------------------------- */
function poblarSelectUsuarios() {
  const select = document.getElementById('select-usuario');
  const users = DB.get(DB_KEYS.USERS);

  select.innerHTML = users
    .map((u) => `<option value="${u.id}">${u.nombre} (${u.rol})</option>`)
    .join('');
}

function initLogin() {
  poblarSelectUsuarios();

  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('select-usuario').value;
    const user = DB.get(DB_KEYS.USERS).find((u) => u.id === userId);
    if (!user) return;

    setUsuarioActivo(user);
    irAVistaSegunRol(user);
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    limpiarUsuarioActivo();
    actualizarHeader(null);
    mostrarVista('login');
  });
}

/* ---------------------------------------------------------------------
   7. PANEL PROFESOR
--------------------------------------------------------------------- */
function getClaseActivaDelProfesor(profesorId) {
  const clases = DB.get(DB_KEYS.CLASSES);
  return clases.find((c) => c.profesorId === profesorId && c.activa) || null;
}

function crearSesionDeClase(nombreClase, profesorId) {
  const clases = DB.get(DB_KEYS.CLASSES);

  // Cierra cualquier sesión previa abierta del mismo profesor
  clases.forEach((c) => {
    if (c.profesorId === profesorId) c.activa = false;
  });

  const nuevaClase = {
    id: generarId('clase'),
    nombre: nombreClase,
    profesorId,
    pin: generarPin(),
    fecha: new Date().toISOString(),
    activa: true,
  };

  clases.push(nuevaClase);
  DB.set(DB_KEYS.CLASSES, clases);
  return nuevaClase;
}

function cerrarSesionDeClase(claseId) {
  const clases = DB.get(DB_KEYS.CLASSES);
  const clase = clases.find((c) => c.id === claseId);
  if (clase) clase.activa = false;
  DB.set(DB_KEYS.CLASSES, clases);
}

function renderPanelProfesor() {
  const user = getUsuarioActivo();
  const claseActiva = getClaseActivaDelProfesor(user.id);
  const cardSesion = document.getElementById('card-sesion-activa');

  if (claseActiva) {
    cardSesion.hidden = false;
    document.getElementById('sesion-activa-nombre').textContent = claseActiva.nombre;
    document.getElementById('pin-display').textContent = claseActiva.pin;
  } else {
    cardSesion.hidden = true;
  }

  renderTablaAlumnos(claseActiva);
}

function renderTablaAlumnos(claseActiva) {
  const tbody = document.getElementById('tabla-alumnos-body');
  const alumnos = DB.get(DB_KEYS.USERS).filter((u) => u.rol === 'alumno');
  const asistencia = DB.get(DB_KEYS.ATTENDANCE);

  tbody.innerHTML = alumnos
    .map((alumno) => {
      const registro = claseActiva
        ? asistencia.find((a) => a.classId === claseActiva.id && a.alumnoId === alumno.id)
        : null;

      const estadoHtml = registro
        ? `<span class="badge badge--presente">Presente</span>`
        : `<span class="badge badge--ausente">Sin registrar</span>`;

      const hora = registro ? formatearHora(new Date(registro.fechaHora)) : '—';

      return `
        <tr>
          <td>${alumno.nombre}</td>
          <td>${estadoHtml}</td>
          <td>${hora}</td>
        </tr>
      `;
    })
    .join('');
}

function initPanelProfesor() {
  document.getElementById('form-nueva-clase').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getUsuarioActivo();
    const input = document.getElementById('input-nombre-clase');
    const nombre = input.value.trim();
    if (!nombre) return;

    crearSesionDeClase(nombre, user.id);
    input.value = '';
    renderPanelProfesor();
  });

  document.getElementById('btn-cerrar-sesion-clase').addEventListener('click', () => {
    const user = getUsuarioActivo();
    const claseActiva = getClaseActivaDelProfesor(user.id);
    if (claseActiva) cerrarSesionDeClase(claseActiva.id);
    renderPanelProfesor();
  });
}

/* ---------------------------------------------------------------------
   8. PANEL ALUMNO
--------------------------------------------------------------------- */
function mostrarMensajeRegistro(texto, tipo) {
  const el = document.getElementById('mensaje-registro');
  el.textContent = texto;
  el.hidden = false;
  el.className = `mensaje mensaje--${tipo}`;
}

function registrarAsistenciaPorPin(pin, alumnoId) {
  const clases = DB.get(DB_KEYS.CLASSES);
  const clase = clases.find((c) => c.pin === pin && c.activa);

  if (!clase) {
    return { ok: false, mensaje: 'PIN inválido o sesión no activa.' };
  }

  const asistencia = DB.get(DB_KEYS.ATTENDANCE);
  const yaRegistrado = asistencia.find(
    (a) => a.classId === clase.id && a.alumnoId === alumnoId
  );

  if (yaRegistrado) {
    return { ok: false, mensaje: `Ya registraste tu asistencia en "${clase.nombre}".` };
  }

  asistencia.push({
    id: generarId('asist'),
    classId: clase.id,
    alumnoId,
    fechaHora: new Date().toISOString(),
  });

  DB.set(DB_KEYS.ATTENDANCE, asistencia);
  return { ok: true, mensaje: `Asistencia registrada en "${clase.nombre}".` };
}

function renderHistorialAlumno() {
  const user = getUsuarioActivo();
  const asistencia = DB.get(DB_KEYS.ATTENDANCE).filter((a) => a.alumnoId === user.id);
  const clases = DB.get(DB_KEYS.CLASSES);
  const tbody = document.getElementById('tabla-historial-body');

  const filas = asistencia
    .slice()
    .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
    .map((a) => {
      const clase = clases.find((c) => c.id === a.classId);
      const fecha = new Date(a.fechaHora);
      return `
        <tr>
          <td>${clase ? clase.nombre : 'Clase eliminada'}</td>
          <td>${formatearFecha(fecha)}</td>
          <td>${formatearHora(fecha)}</td>
        </tr>
      `;
    });

  tbody.innerHTML = filas.length
    ? filas.join('')
    : `<tr><td colspan="3">Aún no tienes registros de asistencia.</td></tr>`;
}

function initPanelAlumno() {
  document.getElementById('form-registrar-pin').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getUsuarioActivo();
    const input = document.getElementById('input-pin');
    const pin = input.value.trim();
    if (!pin) return;

    const resultado = registrarAsistenciaPorPin(pin, user.id);
    mostrarMensajeRegistro(resultado.mensaje, resultado.ok ? 'ok' : 'error');

    if (resultado.ok) {
      input.value = '';
      renderHistorialAlumno();
    }
  });
}

/* ---------------------------------------------------------------------
   9. ARRANQUE DE LA APLICACIÓN
--------------------------------------------------------------------- */
function initApp() {
  seedDataIfNeeded();
  initLogin();
  initPanelProfesor();
  initPanelAlumno();

  const usuarioActivo = getUsuarioActivo();
  if (usuarioActivo) {
    irAVistaSegunRol(usuarioActivo);
  } else {
    mostrarVista('login');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
