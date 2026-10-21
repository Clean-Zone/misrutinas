// MisRutinas (versión web instalable). Interfaz y lógica principal.
import {
  MUSCULOS, REGIONES, EQUIPOS, TIPOS, norm, coincideTexto, secundarios, aUnidad, deUnidad, textoPeso, formatoPeso, epley,
  inicioSemana, sumarDias, fmtDur, fmtCron, fmtRegresivo, fmtDescanso, textoSemana, cuando, fmtFechaLarga, analizar,
  distribucion, perfilCompleto, estimarKcal, llegoAlTope,
} from './util.js';
import * as DB from './db.js';
import { OBJETIVOS, NIVELES, EQUIPO_DISP, CUIDAR, PREF_INICIAL, generarPropuesta } from './sugerida.js';

const S = {
  cat: [], porSlug: {}, rutinas: [], sesiones: [], activa: null, tab: 'inicio', pila: [], semana: inicioSemana(),
  cfg: {}, hist: [], an: { records: new Set(), porSesion: {}, anterior: {} }, foco: { i: 0, j: null }, desc: null,
  draft: null, sel: null, sug: null, ultimoAviso: 0,
};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICO = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 4-6 7.5-6s6.7 2 7.5 6"/>',
  pesa: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>', back: '<path d="m15 5-7 7 7 7"/>', mas: '<circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>',
  lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', abajo: '<path d="m6 9 6 6 6-6"/>', arriba: '<path d="m6 15 6-6 6 6"/>',
  der: '<path d="m9 5 7 7-7 7"/>', izq: '<path d="m15 5-7 7 7 7"/>', star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="currentColor" stroke="none"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', buscar: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>', arr: '<path d="M12 19V5M6 11l6-6 6 6"/>', abj: '<path d="M12 5v14M6 13l6 6 6-6"/>',
};
const svg = (n, t = 22, extra = '') => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICO[n]}</svg>`;
const av = (slug, t = 44) => `<img class="av" width="${t}" height="${t}" src="ej/${esc(slug)}.png" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
const cfg = (k, d) => (S.cfg[k] === undefined ? d : S.cfg[k]);
const setCfg = (k, v) => { S.cfg[k] = v; DB.ls.guardar(k, v); };
const lb = () => !!cfg('lb', false);
const info = (slug) => S.porSlug[slug] || { s: slug, n: slug, m: 'OTRO', e: 'OTRO' };
const rango = (slug) => (cfg('aj', {})[slug] || { rMin: 0, rMax: 0 });
const perfil = () => cfg('perfil', { sexo: '', edad: 0, alturaCm: 0, pesoKg: 0 });
const yo = () => String(Date.now() + Math.random());

// ---------- Datos derivados ----------
function derivar() {
  S.hist = [];
  const hechas = S.sesiones.filter((s) => s.fin).sort((a, b) => a.inicio - b.inicio);
  for (const s of hechas) s.ej.forEach((e, i) => e.series.forEach((x, j) => {
    if (x.hecha) S.hist.push({ id: `${s.id}-${i}-${j}`, sesionId: s.id, inicio: s.inicio, slug: e.slug, orden: j, peso: x.peso, reps: x.reps, tipo: x.tipo });
  }));
  S.an = analizar(S.hist);
}
const resumen = (s) => {
  const sr = s.ej.flatMap((e) => e.series.filter((x) => x.hecha));
  const trab = sr.filter((x) => x.tipo !== 'CALENTAMIENTO'), cont = cfg('contarCal', true) ? sr : trab;
  return { vol: cont.reduce((a, x) => a + x.peso * x.reps, 0), series: cont.length, trabajo: trab.length };
};
async function recargar() {
  S.rutinas = (await DB.todos('rutinas')).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  S.sesiones = await DB.todos('sesiones');
  S.activa = S.sesiones.find((s) => !s.fin) || null;
  derivar();
}
const racha = () => {
  const sem = new Set(S.sesiones.filter((s) => s.fin).map((s) => inicioSemana(s.inicio)));
  let w = inicioSemana(); if (!sem.has(w)) w = sumarDias(w, -7); let n = 0;
  while (sem.has(w)) { n++; w = sumarDias(w, -7); } return n;
};

// ---------- Utilidades de interfaz ----------
function aviso(t) { $('aviso').innerHTML = `<div class="aviso">${esc(t)}</div>`; clearTimeout(S.tAviso); S.tAviso = setTimeout(() => ($('aviso').innerHTML = ''), 2600); }
function dlg({ titulo, texto = '', campos = [], ok = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((res) => {
    const cierra = (v) => { $('dlg').innerHTML = ''; res(v); };
    $('dlg').innerHTML = `<div class="dlg"><div><h3 style="margin-bottom:8px">${esc(titulo)}</h3>${texto ? `<p class="nota" style="margin-bottom:12px">${texto}</p>` : ''}
      <div class="col g8">${campos.map((c, i) => `<label class="nota">${esc(c.et || '')}${c.tipo === 'area' ? `<textarea id="d${i}" rows="3">${esc(c.v ?? '')}</textarea>` :
        `<input id="d${i}" type="${c.tipo || 'text'}" ${c.tipo === 'number' ? 'inputmode="decimal" step="any"' : ''} value="${esc(c.v ?? '')}" placeholder="${esc(c.ph || '')}">`}</label>`).join('')}</div>
      <div class="fila sp" style="margin-top:16px"><button class="btn-t" id="dno">${esc(cancelar)}</button><button class="btn-t ${peligro ? 'peligro' : ''}" id="dok">${esc(ok)}</button></div></div></div>`;
    $('dno').onclick = () => cierra(null);
    $('dok').onclick = () => cierra(campos.map((_, i) => $('d' + i).value));
    const p = $('d0'); if (p) setTimeout(() => p.focus(), 50);
  });
}
const confirmar = (titulo, texto, ok = 'Aceptar') => dlg({ titulo, texto, ok, peligro: true }).then((v) => v !== null);
function hoja(html) { return `<div class="capa hoja" data-a="cerrarHoja"><div class="hoja-in" data-no="1">${html}</div></div>`; }

// ---------- Vistas principales ----------
function vInicio() {
  const lunes = inicioSemana(), meta = cfg('meta', 4);
  const sem = S.sesiones.filter((s) => s.fin && s.inicio >= lunes);
  const volSem = sem.reduce((a, s) => a + resumen(s).vol, 0), tSem = sem.reduce((a, s) => a + (s.fin - s.inicio), 0);
  const f = Math.min(1, sem.length / meta), circ = 2 * Math.PI * 76;
  const h = new Date().getHours(), saludo = h >= 5 && h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const musc = distribucion(S.hist.filter((x) => x.inicio >= lunes), S.porSlug, cfg('contarCal', true)).slice(0, 6);
  const maxm = Math.max(1, ...musc.map((m) => m[1]));
  const elegida = S.sesiones.filter((s) => s.fin && s.inicio >= S.semana && s.inicio < sumarDias(S.semana, 7)).sort((a, b) => b.inicio - a.inicio);
  const volTxt = (() => { const v = aUnidad(volSem, lb()); return v >= 10000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toLocaleString('es-MX'); })();
  return `<div class="col" style="gap:16px">
    <div class="fila sp"><div><div class="sub">${saludo}</div><h1 class="titulo" style="font-size:24px">${S.activa ? 'Entrenamiento en curso' : 'Listo para entrenar'}</h1></div>
      <button class="btn-c" data-a="tab" data-p="perfil" aria-label="Perfil">${svg('user')}</button></div>
    ${S.activa ? `<button class="card dest btn" data-a="abrirSesion"><div class="fila"><div class="f1"><div class="am" style="font-size:11px;font-weight:700;letter-spacing:1.4px">EN CURSO</div><b>${esc(S.activa.nombre)}</b><div class="gris" id="cron2">${fmtCron(Date.now() - S.activa.inicio)}</div></div><span class="btn-c l">${svg('play', 20)}</span></div></button>` : ''}
    <div><div class="anillo"><svg width="184" height="184" viewBox="0 0 184 184"><circle cx="92" cy="92" r="76" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12"/>
      <circle cx="92" cy="92" r="76" fill="none" stroke="url(#g)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${circ * f} ${circ}" transform="rotate(-90 92 92)"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9a62e"/><stop offset="1" stop-color="#f7e08a"/></linearGradient></defs></svg>
      <button class="c" data-a="meta"><div class="fila" style="align-items:flex-end;gap:2px"><span class="num">${sem.length}</span><span class="gris" style="font-size:26px;margin-bottom:6px">/${meta}</span></div><span class="sub">sesiones esta semana</span></button></div>
      <p class="nota" style="text-align:center;margin-top:6px">Meta: ${meta} por semana · toca para cambiarla</p></div>
    <div class="fila g8">${[[volTxt, (lb() ? 'lb' : 'kg') + ' de volumen'], [fmtDur(tSem), 'entrenadas'], [racha() + ' sem', 'de racha']].map((c) => `<div class="card cifra f1" style="padding:12px 6px"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('')}</div>
    <div class="fila sp"><h2 style="font-size:19px">Tus rutinas</h2><button class="btn-t" data-a="tab" data-p="entrenar">Ver todas</button></div>
    <div class="carrusel">${S.rutinas.length ? S.rutinas.map((r, i) => tarjetaRutinaMini(r, i === 0)).join('') : `<button class="card btn" data-a="tab" data-p="entrenar"><div class="am">${svg('plus')}</div><b>Crea tu primera rutina</b><p class="nota">Ármala en la pestaña Entrenar y aparecerá aquí.</p></button>`}</div>
    <div class="fila sp"><h2 style="font-size:19px">Series por grupo</h2><span class="nota">esta semana</span></div>
    ${musc.length ? `<div class="col g12">${musc.map((m) => `<div class="fila"><span class="gris" style="width:104px;font-size:14px">${MUSCULOS[m[0]][0]}</span><div class="barra f1"><i style="width:${(m[1] / maxm) * 100}%"></i></div><b style="width:38px;text-align:right">${Number.isInteger(m[1]) ? m[1] : m[1].toFixed(1)}</b></div>`).join('')}</div>` : '<p class="nota">Termina un entrenamiento para ver qué grupos musculares trabajaste.</p>'}
    <h2 style="font-size:19px">Entrenamientos</h2>
    <div class="card fila" style="padding:6px"><button class="btn-c" data-a="semAnt" aria-label="Semana anterior" style="border:0">${svg('izq')}</button>
      <button class="f1" data-a="elegirFecha" style="text-align:center"><div class="fila" style="justify-content:center">${svg('cal', 18)}<b>${textoSemana(S.semana)}</b></div><div class="nota">${S.semana === lunes ? 'Semana en curso' : 'Toca para elegir otra fecha'}</div></button>
      <button class="btn-c" data-a="semSig" ${S.semana === lunes ? 'disabled style="opacity:.3;border:0"' : 'style="border:0"'} aria-label="Semana siguiente">${svg('der')}</button></div>
    ${elegida.length ? elegida.map(tarjetaSesion).join('') : `<p class="nota">${S.sesiones.some((s) => s.fin) ? 'No hay entrenamientos en esta semana.' : 'Todavía no has terminado ningún entrenamiento.'}</p>`}
  </div>`;
}
function tarjetaRutinaMini(r, dest) {
  const nombres = r.ej.slice(0, 3);
  return `<div class="card ${dest ? 'dest' : ''}" style="height:156px;display:flex;flex-direction:column;justify-content:space-between" data-a="previa" data-p="${r.id}">
    <div><b style="font-size:19px">${esc(r.nombre)}</b><div class="nota">${r.ej.length} ejercicios</div></div>
    <div class="fila sp"><div class="fila" style="gap:0">${nombres.map((e, i) => `<span style="margin-left:${i ? -10 : 0}px">${av(e.slug, 36)}</span>`).join('')}</div>
    <button class="btn-c l" data-a="empezarRutina" data-p="${r.id}" aria-label="Empezar ${esc(r.nombre)}" ${S.activa ? 'disabled style="opacity:.4"' : ''}>${svg('play', 20)}</button></div></div>`;
}
function tarjetaSesion(s) {
  const r = resumen(s), recs = S.an.porSesion[s.id] || 0, ejs = s.ej.filter((e) => e.series.some((x) => x.hecha));
  return `<button class="card btn" data-a="detalle" data-p="${s.id}"><b style="font-size:19px">${esc(s.nombre)}</b><div class="nota">${cuando(s.inicio)}</div>
    <div class="fila" style="gap:22px;margin:12px 0"><div><div class="nota">Tiempo</div><b>${fmtDur(s.fin - s.inicio)}</b></div><div><div class="nota">Volumen</div><b>${formatoPeso(r.vol, lb())}</b></div><div><div class="nota">Récords</div><b class="${recs ? 'am' : ''}">${recs ? '★ ' : ''}${recs}</b></div></div>
    ${ejs.length ? `<div style="border-top:1px solid var(--borde);padding-top:12px" class="col g8">${ejs.slice(0, 3).map((e) => `<div class="fila">${av(e.slug, 42)}<span>${e.series.filter((x) => x.hecha).length} ${e.series.filter((x) => x.hecha).length === 1 ? 'serie' : 'series'} ${esc(info(e.slug).n)}</span></div>`).join('')}</div>${ejs.length > 3 ? `<p class="nota" style="text-align:center;margin-top:10px">Ver ${ejs.length - 3} ${ejs.length - 3 === 1 ? 'ejercicio más' : 'ejercicios más'}</p>` : ''}` : ''}</button>`;
}

function vEntrenar() {
  return `<div class="col">
    <div><div class="sub">Elige tu sesión</div><h1 class="titulo">Entrenar</h1></div>
    <button class="btn-p" data-a="empezarVacio" ${S.activa ? 'disabled' : ''}>▶ Empezar entrenamiento vacío</button>
    <div class="fila g12"><button class="btn-s f1" data-a="nuevaRutina">${svg('plus', 18)} Nueva rutina</button><button class="btn-s f1" data-a="sugerida">${svg('star', 18)} Sugerida para mí</button></div>
    <div class="fila sp"><h2 style="font-size:20px">Mis rutinas <span class="gris">${S.rutinas.length}</span></h2>${S.rutinas.length > 1 ? '<button class="btn-t" data-a="ordenarRutinas">Reordenar</button>' : ''}</div>
    ${S.rutinas.length ? S.rutinas.map((r) => `<div class="card" data-a="previa" data-p="${r.id}"><div class="fila sp"><div><b style="font-size:19px">${esc(r.nombre)}</b><div class="nota">${r.ej.length} ejercicios</div></div>
      <button class="btn-c" data-a="menuRutina" data-p="${r.id}" aria-label="Más opciones">${svg('mas', 20)}</button></div>
      <p class="nota" style="margin:8px 0">${esc(r.ej.map((e) => info(e.slug).n).join(', ') || 'Sin ejercicios')}</p>
      <div class="fila sp"><div class="fila" style="gap:0">${r.ej.slice(0, 4).map((e, i) => `<span style="margin-left:${i ? -10 : 0}px">${av(e.slug, 38)}</span>`).join('')}</div>
      <button class="btn-p" style="width:auto;padding:11px 20px;font-size:15px" data-a="empezarRutina" data-p="${r.id}" ${S.activa || !r.ej.length ? 'disabled' : ''}>▶ Empezar</button></div></div>`).join('') : '<p class="nota">Aún no tienes rutinas. Crea la primera con "Nueva rutina".</p>'}
  </div>`;
}

function vPerfil() {
  const p = perfil(); const u = lb();
  return `<div class="col"><h1 class="titulo">Perfil</h1>
    <div class="card col g12"><h3>Mis datos</h3><p class="nota">Se usan solo para estimar las calorías y ajustar la rutina sugerida. Se quedan en este teléfono.</p>
      <div class="fila g8"><span class="f1">Sexo</span><button class="ficha ${p.sexo === 'H' ? 'on' : ''}" data-a="sexo" data-p="H">Hombre</button><button class="ficha ${p.sexo === 'M' ? 'on' : ''}" data-a="sexo" data-p="M">Mujer</button></div>
      <div class="fila g8"><label class="f1 nota">Edad<input type="number" inputmode="numeric" data-in="perfil:edad" value="${p.edad || ''}"></label><label class="f1 nota">Altura (cm)<input type="number" inputmode="numeric" data-in="perfil:alturaCm" value="${p.alturaCm || ''}"></label></div>
      <label class="nota">Peso corporal (${u ? 'lb' : 'kg'})<input type="number" inputmode="decimal" step="any" data-in="perfil:pesoKg" value="${p.pesoKg ? textoPeso(p.pesoKg, u) : ''}"></label>
      <p id="pst" class="nota ${perfilCompleto(p) ? 'am' : ''}">${perfilCompleto(p) ? 'Datos completos: ya se estiman las calorías.' : 'Faltan datos para estimar las calorías.'}</p></div>
    <div class="card col g12"><h3>Ajustes</h3>
      <div class="fila"><div class="f1">Usar libras (lb)<div class="nota">Unidad de peso de toda la app.</div></div><input type="checkbox" class="sw" data-a="ajuste" data-p="lb" ${u ? 'checked' : ''}></div>
      <div class="fila"><div class="f1">Contar calentamiento<div class="nota">Suma las series de calentamiento en series y volumen. Los récords nunca las cuentan.</div></div><input type="checkbox" class="sw" data-a="ajuste" data-p="contarCal" ${cfg('contarCal', true) ? 'checked' : ''}></div>
      <button class="btn-s" data-a="notif">Activar avisos de descanso</button></div>
    <div class="card col g12"><h3>Respaldo</h3><p class="nota">Tus datos viven solo en este teléfono. En iPhone, si no abres la app por semanas, Safari puede borrarlos: guarda un respaldo de vez en cuando.</p>
      <button class="btn-s" data-a="exportar">Guardar respaldo (archivo)</button><button class="btn-s" data-a="importar">Restaurar respaldo</button><button class="btn-s peligro" data-a="borrarTodo">Borrar todos mis datos</button>
      <input type="file" id="archivo" accept="application/json,.json" hidden></div>
    <p class="nota" style="text-align:center">MisRutinas web · sin internet ni cuentas</p></div>`;
}

// ---------- Capas ----------
function vCapas() {
  return S.pila.map((c, i) => ({
    sesion: () => vSesion(), detalle: () => vDetalle(c), editor: () => vEditor(), selector: () => vSelector(), previa: () => vPrevia(c),
    sugerida: () => vSugerida(), reord: () => vReord(c), hSesion: () => hMenuSesion(), hEjs: () => hEjercicios(), hTipo: () => hTipo(c),
    hFiltro: () => hFiltro(c), hRutina: () => hRutina(c),
  }[c.t]())).join('');
}
const barra = (titulo, atras = 'cerrar', extra = '') => `<div class="fila sp" style="margin-bottom:10px"><button class="btn-c" data-a="${atras}" aria-label="Volver">${svg('back')}</button><b class="f1" style="text-align:center">${titulo}</b>${extra || '<span style="width:44px"></span>'}</div>`;

// ----- Vista previa de rutina -----
function vPrevia(c) {
  const r = S.rutinas.find((x) => x.id === c.id); if (!r) return `<div class="capa"><div class="capa-in">${barra('Rutina')}<p class="nota">Esta rutina ya no existe.</p></div></div>`;
  const u = lb();
  return `<div class="capa"><div class="capa-in col">${barra('Vista previa de la rutina', 'cerrar', `<button class="btn-c" data-a="editarRutina" data-p="${r.id}" aria-label="Editar">${svg('edit', 20)}</button>`)}
    <div><h1 class="titulo" style="font-size:24px">${esc(r.nombre)}</h1><p class="sub">${r.ej.length} ejercicios · ${r.ej.reduce((a, e) => a + e.series.length, 0)} series</p></div>
    ${r.ej.map((e) => tarjetaEjPrevia(e, u)).join('')}
    <button class="btn-p" data-a="empezarRutina" data-p="${r.id}" ${S.activa || !r.ej.length ? 'disabled' : ''}>▶ Empezar rutina</button>${S.activa ? '<p class="nota" style="text-align:center">Ya tienes un entrenamiento en curso.</p>' : ''}</div></div>`;
}
function etiquetas(series) { let n = 0; return series.map((s) => (s.tipo === 'NORMAL' ? String(++n) : TIPOS[s.tipo].letra)); }
function tarjetaEjPrevia(e, u) {
  const et = etiquetas(e.series), g = rango(e.slug);
  return `<div class="card"><div class="fila">${av(e.slug, 44)}<div class="f1"><b class="am">${esc(info(e.slug).n)}</b><div class="nota">Descanso: ${fmtDescanso(e.descanso)}${g.rMax ? ` · Meta: ${g.rMin ? g.rMin + '–' : ''}${g.rMax} reps` : ''}</div></div></div>
    ${e.notas ? `<p class="nota" style="margin-top:8px">${esc(e.notas)}</p>` : ''}
    <div class="tabla th" style="margin:12px 0 4px;grid-template-columns:44px 1fr 1fr"><span>SERIE</span><span>${u ? 'LB' : 'KG'}</span><span>REPS</span></div>
    ${e.series.map((s, i) => `<div class="tabla" style="grid-template-columns:44px 1fr 1fr;padding:8px 0;${i % 2 ? 'background:rgba(255,255,255,.035)' : ''}"><b class="${s.tipo}" style="text-align:center;color:${s.tipo === 'NORMAL' ? '' : `var(--${{ CALENTAMIENTO: 'calen', FALLO: 'fallo', DROP: 'drop' }[s.tipo]})`}">${et[i]}</b><span style="text-align:center">${s.peso ? textoPeso(s.peso, u) : '–'}</span><span style="text-align:center">${s.reps || '–'}</span></div>`).join('')}</div>`;
}

// ----- Editor de rutina -----
function vEditor() {
  const d = S.draft, u = lb();
  return `<div class="capa"><div class="capa-in col">
    <div class="fila sp"><button class="btn-t" data-a="cancelarEditor">Cancelar</button><b>${d.id ? 'Editar rutina' : 'Crear rutina'}</b><button class="btn-t" data-a="guardarEditor">Guardar</button></div>
    <input class="titulo" style="font-size:22px;background:none;border:0;border-bottom:1px solid var(--borde);border-radius:0" placeholder="Título de la rutina" data-in="dnombre" value="${esc(d.nombre)}">
    ${d.ej.length ? '' : `<div style="text-align:center;padding:30px 0" class="gris">Empieza agregando un ejercicio a tu rutina.</div>`}
    ${d.ej.map((e, i) => { const g = rango(e.slug); return `<div class="card col g8"><div class="fila">${av(e.slug, 40)}<b class="f1 am">${esc(info(e.slug).n)}</b>
      <button class="btn-c" data-a="menuEj" data-p="${i}" aria-label="Opciones">${svg('mas', 20)}</button></div>
      <textarea rows="1" placeholder="Agregar notas del ejercicio aquí" data-in="dnota:${i}">${esc(e.notas)}</textarea>
      <div class="am" style="font-weight:600;font-size:14px"><button data-a="descEj" data-p="${i}">⏱ Descanso: ${fmtDescanso(e.descanso)}</button>${g.rMax ? ` · <button data-a="rangoEj" data-p="${e.slug}">Meta: ${g.rMin ? g.rMin + '–' : ''}${g.rMax} reps</button>` : ''}</div>
      <div class="tabla th"><span>SERIE</span><span>${u ? 'LB' : 'KG'}</span><span>REPS</span><span></span></div>
      ${e.series.map((s, j) => `<div class="tabla"><button class="nser ${s.tipo}" data-a="tipoSerieEd" data-p="${i}:${j}">${etiquetas(e.series)[j]}</button>
        <input type="number" inputmode="decimal" step="any" placeholder="-" data-in="dp:${i}:${j}" value="${s.peso ? textoPeso(s.peso, u) : ''}" style="text-align:center">
        <input type="number" inputmode="numeric" placeholder="-" data-in="dr:${i}:${j}" value="${s.reps || ''}" style="text-align:center">
        <button class="btn-c" style="width:40px;height:40px" data-a="quitarSerieEd" data-p="${i}:${j}" aria-label="Quitar serie">${svg('x', 18)}</button></div>`).join('')}
      <button class="btn-s" data-a="addSerieEd" data-p="${i}">${svg('plus', 18)} Agregar serie</button></div>`; }).join('')}
    <button class="btn-p" data-a="addEjEd">${svg('plus', 18)} Agregar ejercicio</button></div></div>`;
}

// ----- Selector de ejercicios -----
function listaSel() {
  const s = S.sel;
  const l = S.cat.filter((e) => (!s.eq.size || s.eq.has(e.e)) && (!s.mu.size || s.mu.has(e.m)) && coincideTexto(e.n, s.q));
  const recientes = !s.q && !s.eq.size && !s.mu.size ? [...new Set(S.sesiones.flatMap((x) => x.ej.map((e) => e.slug)))].slice(-6).reverse() : [];
  const fila = (e) => `<button class="fila" style="width:100%;text-align:left;padding:8px;border-radius:16px;${s.set.has(e.s) ? 'background:rgba(226,193,75,.2)' : ''}" data-a="selEj" data-p="${e.s}">${s.set.has(e.s) ? `<span class="av" style="width:46px;height:46px;background:var(--am);color:var(--sobre)">${svg('check', 22)}</span>` : av(e.s, 46)}
    <div class="f1"><b>${esc(e.n)}</b><div class="nota">${MUSCULOS[e.m][0]} · ${EQUIPOS[e.e]}</div></div></button>`;
  return (recientes.length ? `<p class="nota" style="margin:8px 0">Ejercicios recientes</p>${recientes.map((x) => S.porSlug[x]).filter(Boolean).map(fila).join('')}<p class="nota" style="margin:10px 0 4px">Todos los ejercicios</p>` : `<p class="nota" style="margin:8px 0">Resultados (${l.length})</p>`) +
    l.slice(0, 120).map(fila).join('') + (l.length > 120 ? '<p class="nota" style="text-align:center">Sigue escribiendo para acotar…</p>' : '') + (!l.length ? '<p class="nota">No hay ejercicios con estos filtros.</p>' : '');
}
function vSelector() {
  const s = S.sel;
  return `<div class="capa"><div class="capa-in" style="padding-bottom:110px"><div class="fila sp"><button class="btn-t" data-a="cerrarSelector">Cancelar</button><b>${esc(s.titulo)}</b><span style="width:70px"></span></div>
    <div class="fila" style="margin:10px 0;position:relative"><input id="q" placeholder="Buscar ejercicio" value="${esc(s.q)}" data-in="q" style="padding-left:14px" autocomplete="off"></div>
    <div class="fila g8" style="margin-bottom:6px"><button class="btn-s f1" data-a="filtro" data-p="eq">Equipamiento${s.eq.size ? ` (${s.eq.size})` : ''}</button><button class="btn-s f1" data-a="filtro" data-p="mu">Músculos${s.mu.size ? ` (${s.mu.size})` : ''}</button></div>
    <div id="lsel">${listaSel()}</div></div>
    <div style="position:fixed;left:0;right:0;bottom:0;padding:12px 18px calc(12px + env(safe-area-inset-bottom));background:rgba(8,8,8,.95);border-top:1px solid var(--borde)"><div style="max-width:524px;margin:0 auto"><button class="btn-p" data-a="aplicarSel" ${s.set.size ? '' : 'disabled'}>${s.set.size ? `Agregar ${s.set.size} ${s.set.size === 1 ? 'ejercicio' : 'ejercicios'}` : 'Elige ejercicios'}</button></div></div></div>`;
}
function hFiltro(c) {
  const s = S.sel, esEq = c.k === 'eq', set = esEq ? s.eq : s.mu;
  const op = (k, et, ico) => `<button class="ico-f ${set.has(k) ? 'on' : ''}" data-a="toggleFiltro" data-p="${k}"><img class="av" width="44" height="44" src="ej/${ico}.png" alt="" onerror="this.style.visibility='hidden'"><span>${esc(et)}</span></button>`;
  const cuerpo = esEq ? `<div class="col g8">${Object.entries(EQUIPOS).map(([k, v]) => op(k, v, 'equipo_' + k.toLowerCase())).join('')}</div>`
    : Object.entries(REGIONES).map(([r, et]) => `<p class="nota" style="margin:12px 0 6px">${et}</p><div class="col g8">${Object.entries(MUSCULOS).filter(([, v]) => v[1] === r).map(([k, v]) => op(k, v[0], 'musculo_' + k.toLowerCase())).join('')}</div>`).join('');
  return hoja(`<h3 style="text-align:center;margin-bottom:12px">${esEq ? 'Equipamiento' : 'Grupo muscular'}</h3>${cuerpo}<div class="fila g12" style="margin-top:16px"><button class="btn-s f1" data-a="quitarFiltro">Quitar</button><button class="btn-p f1" style="flex:1.4" data-a="cerrarHoja">Ver ${S.cat.filter((e) => (!s.eq.size || s.eq.has(e.e)) && (!s.mu.size || s.mu.has(e.m)) && coincideTexto(e.n, s.q)).length}</button></div>`);
}

// ----- Reordenar -----
function vReord(c) {
  return `<div class="capa"><div class="capa-in col"><div class="fila sp"><button class="btn-t" data-a="cancelarReord">Cancelar</button><b>${esc(c.titulo)}</b><button class="btn-t" data-a="listoReord">Listo</button></div>
    ${c.items.map((it, i) => `<div class="card fila" style="padding:10px">${it.slug ? av(it.slug, 44) : ''}<b class="f1">${esc(it.nombre)}</b>
      <button class="btn-c" data-a="reordMover" data-p="${i}:-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Subir">${svg('arriba')}</button>
      <button class="btn-c" data-a="reordMover" data-p="${i}:1" ${i === c.items.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Bajar">${svg('abajo')}</button>
      ${c.quitar ? `<button class="btn-c peligro" data-a="reordQuitar" data-p="${i}" aria-label="Quitar">${svg('x', 18)}</button>` : ''}</div>`).join('')}</div></div>`;
}

// ----- Hojas pequeñas -----
function hRutina(c) {
  return hoja(`<h3 style="margin-bottom:10px">${esc((S.rutinas.find((r) => r.id === c.id) || {}).nombre || '')}</h3><div class="col g8">
    <button class="btn-s" data-a="editarRutina" data-p="${c.id}">Editar</button><button class="btn-s peligro" data-a="borrarRutina" data-p="${c.id}">Eliminar</button></div>`);
}
function hTipo(c) {
  const acts = c.lugar === 'ed';
  return hoja(`<h3 style="margin-bottom:10px">Tipo de serie</h3><div class="col g8">${Object.entries(TIPOS).map(([k, v]) => `<button class="sel-op ${c.actual === k ? 'on' : ''}" data-a="elegirTipo" data-p="${k}">${v.letra ? `<b>${v.letra}</b> · ` : ''}${v.et}</button>`).join('')}
    ${c.puedeEliminar ? `<button class="btn-s peligro" data-a="eliminarSerieHoja">Eliminar serie</button>` : ''}</div>`);
}

// ----- Sesión en curso (modo enfoque) -----
function ajustarFoco() {
  const a = S.activa; if (!a) return;
  if (S.foco.i >= a.ej.length) S.foco.i = Math.max(0, a.ej.length - 1);
  const e = a.ej[S.foco.i]; if (e && S.foco.j !== null && S.foco.j >= e.series.length) S.foco.j = null;
}
function primerPendiente(desde = 0) {
  const a = S.activa; const n = a.ej.length;
  for (let k = 0; k < n; k++) { const i = (desde + k) % n; if (a.ej[i].series.some((s) => !s.hecha)) return i; }
  return -1;
}
function previaDe(slug, j) { const l = S.an.anterior[slug]; return l ? l[j] : null; }
function vSesion() {
  const a = S.activa; if (!a) return '';
  if (!a.ej.length) return `<div class="capa"><div class="capa-in col"><div class="fila sp"><button class="btn-c" data-a="minimizar" aria-label="Minimizar">${svg('abajo')}</button><button class="btn-c" data-a="menuSesion" aria-label="Opciones">${svg('mas', 20)}</button></div>
    <div style="text-align:center;padding:50px 0" class="col"><h2>${esc(a.nombre)}</h2><div class="am" id="cron">${fmtCron(Date.now() - a.inicio)}</div><p class="gris">Tu entrenamiento está vacío. Agrega los ejercicios que vas a hacer.</p><button class="btn-p" data-a="addEjSesion">${svg('plus', 18)} Agregar ejercicios</button><button class="btn-t gris" data-a="descartar">Descartar entrenamiento</button></div></div></div>`;
  ajustarFoco();
  const i = S.foco.i, e = a.ej[i], u = lb(), info1 = info(e.slug), g = rango(e.slug);
  const pend = e.series.findIndex((s) => !s.hecha);
  const j = S.foco.j !== null ? S.foco.j : pend >= 0 ? pend : e.series.length - 1;
  const s = e.series[j], prev = previaDe(e.slug, j), et = etiquetas(e.series);
  const pesoB = s.peso > 0 ? s.peso : (prev ? prev.peso : 0), repsB = s.reps > 0 ? s.reps : (prev ? prev.reps : 0);
  const todas = a.ej.every((x) => x.series.every((y) => y.hecha));
  const trabajoReps = e.series.filter((x) => x.tipo !== 'CALENTAMIENTO');
  const subir = trabajoReps.length && trabajoReps.every((x) => x.hecha) && llegoAlTope(g.rMax, trabajoReps.map((x) => x.reps));
  const hechas = e.series.some((x) => x.hecha), pendientes = e.series.filter((x) => !x.hecha).length;
  const sig = a.ej[i + 1];
  const paso = (et2, valor, tenue, ac) => `<div class="card paso col g8" style="padding:12px"><div class="e">${et2}</div><div class="v ${tenue ? 't' : ''}" data-a="${ac}Num">${valor}</div>
    <div class="fila sp"><button class="btn-c" data-a="${ac}Menos" style="width:50px;height:50px">${svg('minus')}</button><button class="btn-c l" data-a="${ac}Mas" style="width:50px;height:50px">${svg('plus')}</button></div></div>`;
  return `<div class="capa" id="capa-sesion"><div class="capa-in" style="display:flex;flex-direction:column;align-items:center;gap:8px">
    <div class="fila" style="width:100%"><button class="btn-c" data-a="minimizar" aria-label="Minimizar entrenamiento">${svg('abajo')}</button><button class="btn-c" data-a="menuSesion" aria-label="Opciones del entrenamiento">${svg('mas', 20)}</button>
      <div class="f1 fila" style="gap:4px">${a.ej.map((x, k) => `<button class="f1" data-a="irEj" data-p="${k}" style="padding:6px 0" aria-label="Ejercicio ${k + 1}"><div class="barra" style="height:${k === i ? 7 : 4}px"><i style="width:${(x.series.filter((y) => y.hecha).length / Math.max(1, x.series.length)) * 100}%"></i></div></button>`).join('')}</div>
      <button class="btn-c" data-a="hojaEjs" aria-label="Lista de ejercicios">${svg('lista', 20)}</button></div>
    <div class="nota">Ejercicio ${i + 1} de ${a.ej.length} · <b style="color:var(--texto)" id="cron">${fmtCron(Date.now() - a.inicio)}</b></div>
    <div style="padding:3px;border-radius:50%;background:var(--grad);box-shadow:0 0 30px rgba(226,193,75,.4);margin-top:6px"><div style="background:var(--fondo);border-radius:50%;padding:3px">${av(e.slug, 104)}</div></div>
    <h2 style="text-align:center;font-size:25px;margin-top:6px">${esc(info1.n)}</h2>
    <button class="gris" data-a="descEjSesion">Serie ${j + 1} de ${e.series.length} · ${e.descanso > 0 ? 'Descanso ' + fmtDescanso(e.descanso) : 'Sin descanso'}</button>
    ${g.rMax ? `<button class="am nota" data-a="rangoSesion">Meta: ${g.rMin ? g.rMin + '–' : ''}${g.rMax} reps</button>` : ''}
    <button class="nota ${e.nota ? 'gris' : 'tenue'}" data-a="notaSesion" style="text-align:center">${e.nota ? 'Comentario: ' + esc(e.nota) : '+ Comentario'}</button>
    ${subir ? `<div class="card dest" style="width:100%;text-align:center;padding:12px"><b class="am">¡Llegaste a ${g.rMax} reps en todas las series! Sube el peso la próxima vez.</b></div>` : ''}
    <div class="fila" style="justify-content:center;flex-wrap:wrap;gap:8px;margin-top:6px">${e.series.map((x, k) => `<button class="chip-s ${x.tipo} ${x.hecha ? 'ok' : ''} ${k === j ? 'el' : ''}" data-a="chipSerie" data-p="${k}">${et[k]}</button>`).join('')}<button class="chip-s" data-a="addSerie" aria-label="Agregar serie">${svg('plus', 16)}</button></div>
    <div class="nota tenue">${prev ? `Anterior: ${textoPeso(prev.peso, u) || 0} ${u ? 'lb' : 'kg'} × ${prev.reps}` : 'Toca la serie elegida para cambiar su tipo'}</div>
    <div class="fila g12" style="width:100%;align-items:stretch"><div class="f1">${paso(`PESO · ${u ? 'LB' : 'KG'}`, pesoB > 0 ? textoPeso(pesoB, u) : '–', s.peso === 0, 'peso')}</div><div class="f1">${paso('REPETICIONES', repsB > 0 ? repsB : '–', s.reps === 0, 'reps')}</div></div>
    ${todas ? `<button class="btn-p" data-a="terminar">✓ Terminar entrenamiento</button>` : s.hecha ? `<button class="btn-p" data-a="sigSerie">Ir a la siguiente serie</button><button class="btn-t gris" data-a="desmarcar">Desmarcar esta serie</button>` : `<button class="btn-p" data-a="completar">✓ Completar serie</button>`}
    ${hechas && pendientes && !todas ? `<button class="btn-t gris" data-a="terminarEj">Terminar ejercicio (quitar ${pendientes} pendientes)</button>` : ''}
    ${S.desc ? `<div class="card dest fila" style="width:100%;padding:10px 14px"><div style="position:relative;width:58px;height:58px"><svg width="58" height="58" viewBox="0 0 58 58"><circle cx="29" cy="29" r="25" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/><circle id="dring" cx="29" cy="29" r="25" fill="none" stroke="#f0d468" stroke-width="5" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 25}" stroke-dashoffset="0" transform="rotate(-90 29 29)"/></svg><b id="dt" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px">${fmtRegresivo(S.desc.fin - Date.now())}</b></div>
      <b class="f1">Descanso</b><button class="btn-t" data-a="descMenos">−15</button><button class="btn-t" data-a="descMas">+15</button><button class="btn-t" data-a="descOmitir">Omitir</button></div>` : ''}
    ${sig ? `<button class="card fila" data-a="irEj" data-p="${i + 1}" style="width:100%;padding:10px 12px">${av(sig.slug, 40)}<div class="f1" style="text-align:left"><div class="th" style="text-align:left">SIGUE · ${sig.series.filter((x) => x.hecha).length} de ${sig.series.length} series</div><b>${esc(info(sig.slug).n)}</b></div>${svg('der')}</button>` : `<button class="card fila" data-a="addEjSesion" style="width:100%;padding:14px;gap:10px">${svg('plus', 20)}<b>Agregar otro ejercicio</b></button>`}
  </div></div>`;
}
function hMenuSesion() {
  const a = S.activa, e = a && a.ej[S.foco.i]; const it = (ac, t, cls = '') => `<button class="sel-op ${cls}" data-a="${ac}">${t}</button>`;
  return hoja(`<div class="col g8">${it('terminar', 'Terminar entrenamiento')}${it('addEjSesion', 'Agregar ejercicios')}${a && a.ej.length > 1 ? it('reordSesion', 'Reordenar ejercicios') : ''}${e ? it('notaSesion', 'Comentario del ejercicio') + it('terminarEj', 'Terminar ejercicio') + it('descEjSesion', 'Temporizador de descanso') + it('rangoSesion', 'Rango de repeticiones') + it('quitarEj', 'Quitar este ejercicio') : ''}${it('descartar', 'Descartar entrenamiento', 'peligro')}</div>`);
}
function hEjercicios() {
  const a = S.activa;
  return hoja(`<div class="fila sp" style="margin-bottom:8px"><h3>Ejercicios</h3><div><button class="btn-t" data-a="reordSesion">Reordenar</button><button class="btn-t" data-a="addEjSesion">+ Agregar</button></div></div>
    <div class="col g8">${a.ej.map((e, k) => `<button class="fila" style="text-align:left;padding:8px;border-radius:16px;${k === S.foco.i ? 'background:rgba(226,193,75,.18)' : ''}" data-a="irEj" data-p="${k}">${av(e.slug, 48)}<div class="f1"><b>${esc(info(e.slug).n)}</b><div class="nota">${e.series.filter((x) => x.hecha).length} de ${e.series.length} series</div></div>${e.series.every((x) => x.hecha) ? `<span class="am">${svg('check')}</span>` : ''}</button>`).join('')}</div>`);
}
function miniBarra() {
  const a = S.activa; if (!a || S.pila.some((c) => c.t === 'sesion')) return '';
  const e = a.ej.find((x) => x.series.some((y) => !y.hecha)) || a.ej[a.ej.length - 1];
  return `<div class="mini"><div class="fila"><button class="btn-c" data-a="abrirSesion" aria-label="Abrir entrenamiento">${svg('arriba')}</button>
    <div class="f1" data-a="abrirSesion"><div class="fila g8"><span style="width:8px;height:8px;border-radius:50%;background:var(--am-c)"></span><b style="font-size:14px">Entrenamiento <span class="am" id="cron3">${fmtCron(Date.now() - a.inicio)}</span></b></div><div class="nota" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e ? info(e.slug).n : a.nombre)}</div></div>
    <button class="btn-c peligro" data-a="descartar" aria-label="Descartar entrenamiento">${svg('trash', 20)}</button></div></div>`;
}

// ----- Detalle de un entrenamiento terminado -----
function vDetalle(c) {
  const s = S.sesiones.find((x) => x.id === c.id); if (!s) return `<div class="capa"><div class="capa-in">${barra('Detalle')}<p class="nota">Este entrenamiento ya no existe.</p></div></div>`;
  const cont = cfg('contarCal', true), enLb = c.lb === undefined ? lb() : c.lb;
  const sr = S.hist.filter((x) => x.sesionId === s.id), contadas = sr.filter((x) => cont || x.tipo !== 'CALENTAMIENTO'), trab = sr.filter((x) => x.tipo !== 'CALENTAMIENTO');
  const vol = contadas.reduce((a, x) => a + x.peso * x.reps, 0);
  const kcal = estimarKcal(s.fin - s.inicio, trab.length, perfil());
  const div = distribucion(sr, S.porSlug, cont), tot = div.reduce((a, x) => a + x[1], 0) || 1;
  const recs = S.an.porSesion[s.id] || 0, u = lb();
  return `<div class="capa"><div class="capa-in col">${barra('Detalle del entrenamiento', 'cerrar', `<button class="btn-c peligro" data-a="borrarSesion" data-p="${s.id}" aria-label="Eliminar">${svg('trash', 20)}</button>`)}
    <div><h1 class="titulo" style="font-size:24px">${esc(s.nombre)}</h1><p class="sub">${esc(fmtFechaLarga(s.inicio))}</p></div>
    <div class="card col g12"><div class="fila sp">${[['Tiempo', fmtDur(s.fin - s.inicio)], ['Volumen', formatoPeso(vol, enLb)], ['Series', contadas.length], ['Récords', (recs ? '★ ' : '') + recs]].map((x) => `<div><div class="nota">${x[0]}</div><b>${x[1]}</b></div>`).join('')}</div>
      <div class="fila sp"><div><div class="nota">Calorías</div><b>${kcal ? '≈ ' + kcal + ' kcal' : '—'}</b></div><div class="fila g8"><span class="nota">Ver volumen en</span><button class="ficha ${!enLb ? 'on' : ''}" data-a="vol" data-p="kg">kg</button><button class="ficha ${enLb ? 'on' : ''}" data-a="vol" data-p="lb">lb</button></div></div>
      ${kcal ? '' : '<p class="nota tenue">Completa tus datos en Perfil para estimar las calorías.</p>'}</div>
    ${div.length ? `<h2 style="font-size:20px">División muscular</h2><p class="nota">Incluye músculos secundarios (cuentan la mitad que el principal).</p>${div.map(([m, v]) => `<div><div class="nota">${MUSCULOS[m][0]}</div><div class="fila"><div class="barra f1" style="height:12px"><i style="width:${(v / tot) * 100}%"></i></div><b style="width:56px;text-align:right">${Math.floor((v * 100) / tot)} %</b></div></div>`).join('')}` : ''}
    <h2 style="font-size:20px">Entrenamiento</h2>
    ${s.ej.filter((e) => e.series.some((x) => x.hecha)).map((e, ei) => { const idx = s.ej.indexOf(e); const hs = e.series.map((x, j) => ({ x, j })).filter((o) => o.x.hecha); const et = etiquetas(hs.map((o) => o.x)); const g = rango(e.slug);
      const tr = hs.filter((o) => o.x.tipo !== 'CALENTAMIENTO').map((o) => o.x.reps);
      return `<div class="card"><div class="fila">${av(e.slug, 44)}<b class="am f1">${esc(info(e.slug).n)}</b></div>${e.nota ? `<p class="nota" style="margin-top:8px">Comentario: ${esc(e.nota)}</p>` : ''}
        ${llegoAlTope(g.rMax, tr) ? `<p class="am" style="font-size:13px;font-weight:600;margin-top:8px">Llegaste al tope (${g.rMax} reps): sube el peso.</p>` : ''}
        <div class="th" style="text-align:left;margin:12px 0 4px;display:flex"><span style="width:56px">SERIE</span><span>PESO Y REPS</span></div>
        ${hs.map((o, k) => `<div class="fila" style="padding:9px 0;${k % 2 ? 'background:rgba(255,255,255,.035)' : ''}"><b style="width:56px;color:${o.x.tipo === 'NORMAL' ? '' : `var(--${{ CALENTAMIENTO: 'calen', FALLO: 'fallo', DROP: 'drop' }[o.x.tipo]})`}">${et[k]}</b><div><div>${formatoPeso(o.x.peso, u)} × ${o.x.reps}</div>${S.an.records.has(`${s.id}-${idx}-${o.j}`) ? '<div class="am" style="font-size:12px;font-weight:700">★ Récord</div>' : ''}</div></div>`).join('')}</div>`; }).join('')}
  </div></div>`;
}

// ----- Rutina sugerida -----
function vSugerida() {
  const q = S.sug, p = perfil();
  if (q.propuesta) {
    return `<div class="capa"><div class="capa-in col">${barra('Tu propuesta', 'atrasSug')}
      <p class="nota">${OBJETIVOS[q.pref.objetivo][0]} · ${NIVELES[q.pref.nivel][0]} · ${q.pref.dias} días · ${q.pref.minutos} min · ${EQUIPO_DISP[q.pref.equipo][0]}</p>
      ${q.propuesta.dias.length ? '' : '<p class="gris">No encontré ejercicios con esas condiciones. Prueba con otro equipo o quita zonas a cuidar.</p>'}
      ${q.propuesta.dias.map((d, i) => `<div class="card col g12"><b class="am">Día ${i + 1}: ${esc(d.nombre)}</b>${d.ejercicios.map((x) => `<div class="fila">${av(x.slug, 40)}<div class="f1"><div>${esc(info(x.slug).n)}</div><div class="nota">${x.series} × ${x.repMin}–${x.repMax}${x.calentamiento ? ' + calentamiento' : ''} · descanso ${fmtDescanso(x.descanso)}</div></div></div>`).join('')}</div>`).join('')}
      <div class="col g8">${q.propuesta.notas.map((n) => `<p class="nota">• ${esc(n)}</p>`).join('')}</div>
      <button class="btn-p" data-a="guardarSug" ${q.propuesta.dias.length ? '' : 'disabled'}>Guardar ${q.propuesta.dias.length} rutinas</button><button class="btn-t" data-a="otraSug">Probar otra combinación</button></div></div>`;
  }
  const op = (clave, valor, et, ayuda) => `<button class="sel-op ${q.pref[clave] === valor ? 'on' : ''}" data-a="prefSug" data-p="${clave}:${valor}"><b>${et}</b><div class="nota">${ayuda}</div></button>`;
  return `<div class="capa"><div class="capa-in col">${barra('Rutina sugerida')}
    <p class="nota">${perfilCompleto(p) ? `Usaré tus datos de Perfil (edad ${p.edad}, ${p.alturaCm} cm) para ajustar la propuesta.` : 'Tip: completa tus datos en Perfil (sexo, edad, altura y peso) para ajustar mejor la propuesta.'}</p>
    <h3>Objetivo</h3>${Object.entries(OBJETIVOS).map(([k, v]) => op('objetivo', k, v[0], v[1])).join('')}
    <h3>Nivel</h3>${Object.entries(NIVELES).map(([k, v]) => op('nivel', k, v[0], v[1])).join('')}
    <h3>Días por semana</h3><div class="fila g8" style="flex-wrap:wrap">${[2, 3, 4, 5, 6].map((d) => `<button class="ficha ${q.pref.dias === d ? 'on' : ''}" data-a="prefSug" data-p="dias:${d}">${d}</button>`).join('')}</div>
    <h3>Tiempo por sesión</h3><div class="fila g8" style="flex-wrap:wrap">${[30, 45, 60, 75, 90].map((d) => `<button class="ficha ${q.pref.minutos === d ? 'on' : ''}" data-a="prefSug" data-p="minutos:${d}">${d} min</button>`).join('')}</div>
    <h3>Equipo disponible</h3>${Object.entries(EQUIPO_DISP).map(([k, v]) => op('equipo', k, v[0], v[1])).join('')}
    <h3>Zonas a cuidar (opcional)</h3><div class="fila g8" style="flex-wrap:wrap">${Object.entries(CUIDAR).map(([k, v]) => `<button class="ficha ${q.pref.cuidar.includes(k) ? 'on' : ''}" data-a="cuidarSug" data-p="${k}">${v}</button>`).join('')}</div>
    <button class="btn-p" data-a="verSug">Ver propuesta</button></div></div>`;
}

// ---------- Render ----------
function render() {
  $('app').innerHTML = S.tab === 'inicio' ? vInicio() : S.tab === 'entrenar' ? vEntrenar() : vPerfil();
  $('capas').innerHTML = vCapas();
  const t = (k, ic, et) => `<button class="nav-i ${S.tab === k ? 'on' : ''}" data-a="tab" data-p="${k}">${svg(ic, 23)}${et}</button>`;
  $('nav').innerHTML = (S.pila.length ? '' : miniBarra()) + `<div class="nav"><div class="nav-in">${t('inicio', 'home', 'Inicio')}<button class="nav-c ${S.tab === 'entrenar' ? 'on' : ''}" data-a="tab" data-p="entrenar"><div class="b">${svg('pesa', 30)}</div>Entrenar</button>${t('perfil', 'user', 'Perfil')}</div></div>`;
  document.body.style.overflow = S.pila.length ? 'hidden' : '';
  tick();
}
const abrirCapa = (c) => { S.pila.push(c); render(); };
const cerrarCapa = () => { S.pila.pop(); render(); };

// ---------- Temporizador y avisos ----------
let audio;
function beep() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), g = audio.createGain(); o.connect(g); g.connect(audio.destination);
    o.frequency.value = 880; g.gain.setValueAtTime(0.2, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.5); o.start(); o.stop(audio.currentTime + 0.5); } catch (e) { /* sin audio */ }
}
async function avisarFin() {
  beep(); if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  try { if ('Notification' in window && Notification.permission === 'granted') { const reg = await navigator.serviceWorker.getRegistration(); const op = { body: 'Toca para volver a tu entrenamiento.', icon: 'icons/icon-192.png', tag: 'descanso', requireInteraction: false };
    if (reg) reg.showNotification('Descanso terminado', op); else new Notification('Descanso terminado', op); } } catch (e) { /* sin permiso */ }
}
function pedirNotif() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { /* no disponible */ } }
function iniciarDesc(seg) { if (seg > 0) S.desc = { fin: Date.now() + seg * 1000, total: seg, avisado: false }; }
function tick() {
  const a = S.activa;
  if (a) { const t = fmtCron(Date.now() - a.inicio); ['cron', 'cron2', 'cron3'].forEach((id) => { const el = $(id); if (el) el.textContent = t; }); }
  if (S.desc) {
    const rest = S.desc.fin - Date.now();
    if (rest <= 0) { if (!S.desc.avisado) { S.desc.avisado = true; avisarFin(); } S.desc = null; if (S.pila.some((c) => c.t === 'sesion')) render(); return; }
    const dt = $('dt'); if (dt) dt.textContent = fmtRegresivo(rest);
    const ring = $('dring'); if (ring) ring.setAttribute('stroke-dashoffset', String(2 * Math.PI * 25 * (1 - rest / (S.desc.total * 1000))));
  }
}
setInterval(tick, 500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

// ---------- Acciones de datos ----------
async function guardarActiva() { await DB.guardar('sesiones', S.activa); }
async function empezar(nombre, rutina) {
  pedirNotif();
  if (S.activa) { aviso('Ya tienes un entrenamiento en curso.'); return; }
  const s = { nombre, rutinaId: rutina ? rutina.id : null, inicio: Date.now(), fin: null, ej: [] };
  if (rutina) s.ej = rutina.ej.map((e) => ({ slug: e.slug, descanso: e.descanso || 0, nota: e.notas || '', series: (e.series.length ? e.series : [{ peso: 0, reps: 0, tipo: 'NORMAL' }]).map((x) => ({ peso: x.peso || 0, reps: x.reps || 0, tipo: x.tipo || 'NORMAL', hecha: false })) }));
  s.id = await DB.guardar('sesiones', s); await recargar();
  S.foco = { i: Math.max(0, primerPendiente()), j: null }; S.pila = [{ t: 'sesion' }]; render();
}
async function terminarSesion() {
  const a = S.activa; a.ej.forEach((e) => { e.series = e.series.filter((x) => x.hecha); }); a.ej = a.ej.filter((e) => e.series.length);
  S.desc = null; $('aviso').innerHTML = '';
  if (!a.ej.length) { await DB.borrar('sesiones', a.id); await recargar(); S.pila = []; render(); aviso('No había series completadas: se descartó el entrenamiento.'); return; }
  a.fin = Date.now(); await guardarActiva(); await recargar(); S.pila = [{ t: 'detalle', id: a.id }]; render(); aviso('Entrenamiento guardado.');
}
function nuevoBorrador(r) {
  return r ? JSON.parse(JSON.stringify(r)) : { nombre: '', ej: [] };
}
async function guardarRutinaDraft() {
  const d = S.draft; if (!d.nombre.trim() || !d.ej.length) { aviso('Pon un título y al menos un ejercicio.'); return; }
  const r = { nombre: d.nombre.trim(), orden: d.orden ?? (S.rutinas.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1), ej: d.ej };
  if (d.id) r.id = d.id; await DB.guardar('rutinas', r); await recargar(); S.draft = null; S.pila = []; render();
}
const nuevaSerie = (t = 'NORMAL') => ({ peso: 0, reps: 0, tipo: t });

// ---------- Acciones de la interfaz ----------
const A = {
  tab: (p) => { S.tab = p; S.pila = S.pila.filter((c) => c.t === 'sesion'); render(); window.scrollTo(0, 0); },
  cerrar: () => cerrarCapa(),
  cerrarHoja: () => cerrarCapa(),
  meta: async () => { const v = await dlg({ titulo: 'Meta semanal', texto: '¿Cuántos entrenamientos quieres hacer por semana (1 a 7)?', campos: [{ tipo: 'number', v: cfg('meta', 4) }] }); if (v) { setCfg('meta', Math.min(7, Math.max(1, parseInt(v[0]) || 4))); render(); } },
  semAnt: () => { S.semana = sumarDias(S.semana, -7); render(); },
  semSig: () => { if (S.semana < inicioSemana()) { S.semana = sumarDias(S.semana, 7); render(); } },
  elegirFecha: async () => { const v = await dlg({ titulo: 'Ir a la semana de…', campos: [{ tipo: 'date', v: new Date(S.semana).toISOString().slice(0, 10) }], ok: 'Ver semana' }); if (v && v[0]) { S.semana = inicioSemana(new Date(v[0] + 'T12:00:00').getTime()); render(); } },
  previa: (p, el, ev) => { if (ev.target.closest('[data-a="empezarRutina"],[data-a="menuRutina"]')) return; abrirCapa({ t: 'previa', id: +p }); },
  detalle: (p) => abrirCapa({ t: 'detalle', id: +p }),
  vol: (p) => { const c = S.pila[S.pila.length - 1]; c.lb = p === 'lb'; render(); },
  empezarVacio: () => empezar('Entrenamiento libre', null),
  empezarRutina: async (p) => { const r = S.rutinas.find((x) => x.id === +p); if (r) { S.pila = []; await empezar(r.nombre, r); } },
  abrirSesion: () => { if (!S.pila.some((c) => c.t === 'sesion')) { S.foco.j = null; abrirCapa({ t: 'sesion' }); } },
  minimizar: () => { S.pila = S.pila.filter((c) => c.t !== 'sesion' && !c.t.startsWith('h') && c.t !== 'selector' && c.t !== 'reord'); render(); },
  nuevaRutina: () => { S.draft = nuevoBorrador(null); abrirCapa({ t: 'editor' }); },
  editarRutina: (p) => { S.draft = nuevoBorrador(S.rutinas.find((r) => r.id === +p)); S.pila = [{ t: 'editor' }]; render(); },
  menuRutina: (p) => abrirCapa({ t: 'hRutina', id: +p }),
  borrarRutina: async (p) => { if (await confirmar('Eliminar rutina', 'Tu historial de entrenamientos no se borra.', 'Eliminar')) { await DB.borrar('rutinas', +p); await recargar(); S.pila = []; render(); } },
  ordenarRutinas: () => abrirCapa({ t: 'reord', titulo: 'Orden de rutinas', items: S.rutinas.map((r) => ({ id: r.id, nombre: r.nombre, slug: r.ej[0] && r.ej[0].slug })), alListo: async (items) => { for (let i = 0; i < items.length; i++) { const r = S.rutinas.find((x) => x.id === items[i].id); r.orden = i + 1; await DB.guardar('rutinas', r); } await recargar(); } }),
  sexo: (p) => { const q = perfil(); setCfg('perfil', { ...q, sexo: p }); render(); },
  ajuste: (p, el) => { setCfg(p, el.checked); if (p === 'lb') { const q = perfil(); setCfg('perfil', q); } render(); },
  notif: async () => { if (!('Notification' in window)) { aviso('Este navegador no permite notificaciones. Instala la app en la pantalla de inicio.'); return; } const r = await Notification.requestPermission(); aviso(r === 'granted' ? 'Avisos activados.' : 'No se activaron los avisos.'); },
  exportar: async () => { const b = new Blob([await DB.exportar()], { type: 'application/json' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `misrutinas_respaldo_${new Date().toISOString().slice(0, 10)}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); },
  importar: () => $('archivo').click(),
  borrarTodo: async () => { if (await confirmar('Borrar todos mis datos', 'Se borrarán rutinas, entrenamientos y ajustes de este teléfono. No se puede deshacer.', 'Borrar')) { await DB.vaciar('rutinas'); await DB.vaciar('sesiones'); Object.keys(localStorage).filter((k) => k.startsWith('mr_')).forEach((k) => localStorage.removeItem(k)); S.cfg = {}; S.pila = []; S.activa = null; await recargar(); render(); aviso('Datos borrados.'); } },
  borrarSesion: async (p) => { if (await confirmar('Eliminar entrenamiento', 'No se puede deshacer.', 'Eliminar')) { await DB.borrar('sesiones', +p); await recargar(); S.pila = []; render(); } },
  // --- editor ---
  cancelarEditor: async () => { const d = S.draft; if (!d.nombre && !d.ej.length) { S.draft = null; S.pila = []; render(); } else if (await confirmar('Descartar cambios', 'Se perderán los cambios de esta rutina.', 'Descartar')) { S.draft = null; S.pila = []; render(); } },
  guardarEditor: () => guardarRutinaDraft(),
  addEjEd: () => abrirSelector('Agregar ejercicio', (slugs) => { slugs.forEach((s) => S.draft.ej.push({ slug: s, notas: '', descanso: 0, series: [nuevaSerie()] })); }),
  addSerieEd: (p) => { const e = S.draft.ej[+p]; const u = e.series[e.series.length - 1]; e.series.push(u ? { ...u } : nuevaSerie()); render(); },
  quitarSerieEd: (p) => { const [i, j] = p.split(':').map(Number); const e = S.draft.ej[i]; if (e.series.length > 1) e.series.splice(j, 1); render(); },
  tipoSerieEd: (p) => { const [i, j] = p.split(':').map(Number); abrirCapa({ t: 'hTipo', lugar: 'ed', i, j, actual: S.draft.ej[i].series[j].tipo, puedeEliminar: S.draft.ej[i].series.length > 1 }); },
  menuEj: async (p) => { const i = +p; const acc = await menuAcciones(['Reordenar ejercicios', 'Rango de repeticiones', 'Quitar de la rutina']); if (acc === 0) A.reordEd(); else if (acc === 1) A.rangoEj(S.draft.ej[i].slug); else if (acc === 2) { S.draft.ej.splice(i, 1); render(); } },
  reordEd: () => abrirCapa({ t: 'reord', titulo: 'Reordenar', items: S.draft.ej.map((e, i) => ({ id: i, nombre: info(e.slug).n, slug: e.slug })), alListo: (items) => { S.draft.ej = items.map((x) => S.draft.ej[x.id]); } }),
  descEj: async (p) => { const e = S.draft.ej[+p]; const v = await elegirDescanso(e.descanso); if (v !== null) { e.descanso = v; render(); } },
  rangoEj: async (slug) => { const g = rango(slug); const v = await dlg({ titulo: 'Rango de repeticiones', texto: `${esc(info(slug).n)}. Cuando todas las series lleguen al máximo, la app te avisa que subas el peso. Déjalo vacío para quitarlo.`, campos: [{ et: 'Mínimo', tipo: 'number', v: g.rMin || '' }, { et: 'Máximo', tipo: 'number', v: g.rMax || '' }], ok: 'Guardar' });
    if (v) { const mx = parseInt(v[1]) || 0, mn = mx ? Math.min(parseInt(v[0]) || 0, mx) : 0; const aj = { ...cfg('aj', {}) }; aj[slug] = { rMin: mn, rMax: mx }; setCfg('aj', aj); render(); } },
  elegirTipo: async (p) => {
    const c = S.pila[S.pila.length - 1];
    if (c.lugar === 'ed') S.draft.ej[c.i].series[c.j].tipo = p; else { S.activa.ej[c.i].series[c.j].tipo = p; await guardarActiva(); }
    cerrarCapa();
  },
  eliminarSerieHoja: async () => { const c = S.pila[S.pila.length - 1]; if (c.lugar === 'ed') S.draft.ej[c.i].series.splice(c.j, 1); else { S.activa.ej[c.i].series.splice(c.j, 1); await guardarActiva(); } cerrarCapa(); },
  // --- selector ---
  cerrarSelector: () => { S.sel = null; cerrarCapa(); },
  selEj: (p) => { const s = S.sel; if (s.set.has(p)) s.set.delete(p); else s.set.add(p); if (s.unico) { s.set = new Set([p]); } const l = $('lsel'); if (l) l.innerHTML = listaSel(); const b = document.querySelector('[data-a="aplicarSel"]'); if (b) { b.disabled = !s.set.size; b.textContent = s.set.size ? `Agregar ${s.set.size} ${s.set.size === 1 ? 'ejercicio' : 'ejercicios'}` : 'Elige ejercicios'; } },
  aplicarSel: () => { const s = S.sel; const cb = s.cb; S.sel = null; S.pila.pop(); cb([...s.set]); if (S.activa) guardarActiva(); render(); },
  filtro: (p) => abrirCapa({ t: 'hFiltro', k: p }),
  toggleFiltro: (p) => { const c = S.pila[S.pila.length - 1]; const set = c.k === 'eq' ? S.sel.eq : S.sel.mu; if (set.has(p)) set.delete(p); else set.add(p); S.pila[S.pila.length - 1] = c; refrescarFiltro(); },
  quitarFiltro: () => { S.sel.eq.clear(); S.sel.mu.clear(); S.pila.pop(); render(); },
  // --- reordenar ---
  reordMover: (p) => { const [i, d] = p.split(':').map(Number); const it = S.pila[S.pila.length - 1].items; [it[i], it[i + d]] = [it[i + d], it[i]]; render(); },
  reordQuitar: (p) => { S.pila[S.pila.length - 1].items.splice(+p, 1); render(); },
  cancelarReord: () => cerrarCapa(),
  listoReord: async () => { const c = S.pila[S.pila.length - 1]; await c.alListo(c.items); S.pila.pop(); render(); },
  // --- sesión ---
  menuSesion: () => abrirCapa({ t: 'hSesion' }),
  hojaEjs: () => abrirCapa({ t: 'hEjs' }),
  irEj: (p) => { S.foco = { i: +p, j: null }; S.pila = S.pila.filter((c) => !c.t.startsWith('h')); if (!S.pila.some((c) => c.t === 'sesion')) S.pila.push({ t: 'sesion' }); render(); },
  chipSerie: (p) => { const j = +p; const e = S.activa.ej[S.foco.i]; const actual = S.foco.j !== null ? S.foco.j : Math.max(0, e.series.findIndex((s) => !s.hecha)); if (j === actual) abrirCapa({ t: 'hTipo', lugar: 'se', i: S.foco.i, j, actual: e.series[j].tipo, puedeEliminar: true }); else { S.foco.j = j; render(); } },
  addSerie: async () => { const e = S.activa.ej[S.foco.i]; const u = e.series[e.series.length - 1]; e.series.push(u ? { ...u, hecha: false } : { ...nuevaSerie(), hecha: false }); await guardarActiva(); render(); },
  pesoMas: () => cambiarSerie('peso', 1), pesoMenos: () => cambiarSerie('peso', -1), repsMas: () => cambiarSerie('reps', 1), repsMenos: () => cambiarSerie('reps', -1),
  pesoNum: async () => { const { e, j, base } = serieActual(); const v = await dlg({ titulo: `Peso (${lb() ? 'lb' : 'kg'})`, campos: [{ tipo: 'number', v: textoPeso(e.series[j].peso || base.peso, lb()) }] }); if (v) { e.series[j].peso = deUnidad(parseFloat(String(v[0]).replace(',', '.')) || 0, lb()); await guardarActiva(); render(); } },
  repsNum: async () => { const { e, j, base } = serieActual(); const v = await dlg({ titulo: 'Repeticiones', campos: [{ tipo: 'number', v: e.series[j].reps || base.reps || '' }] }); if (v) { e.series[j].reps = parseInt(v[0]) || 0; await guardarActiva(); render(); } },
  completar: async () => {
    const { e, j, base } = serieActual(); const s = e.series[j]; s.peso = base.peso; s.reps = base.reps; s.hecha = true; iniciarDesc(e.descanso); S.foco.j = null;
    if (!e.series.some((x) => !x.hecha)) { const n = primerPendiente(S.foco.i + 1); if (n >= 0) S.foco.i = n; }
    await guardarActiva(); render();
  },
  sigSerie: () => { S.foco.j = null; const e = S.activa.ej[S.foco.i]; if (!e.series.some((x) => !x.hecha)) { const n = primerPendiente(S.foco.i + 1); if (n >= 0) S.foco.i = n; } render(); },
  desmarcar: async () => { const { e, j } = serieActual(); e.series[j].hecha = false; await guardarActiva(); render(); },
  terminarEj: async () => { const e = S.activa.ej[S.foco.i]; if (e.series.some((x) => x.hecha)) { e.series = e.series.filter((x) => x.hecha); const n = primerPendiente(S.foco.i + 1); S.foco.j = null; if (n >= 0) S.foco.i = n; await guardarActiva(); } S.pila = S.pila.filter((c) => !c.t.startsWith('h')); render(); },
  terminar: async () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); await terminarSesion(); },
  descartar: async () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); if (await confirmar('Descartar entrenamiento', 'Se borrará el entrenamiento en curso y todas sus series. No se puede deshacer.', 'Descartar')) { await DB.borrar('sesiones', S.activa.id); S.desc = null; await recargar(); S.pila = []; render(); } else render(); },
  addEjSesion: () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); abrirSelector('Agregar ejercicios', (slugs) => { slugs.forEach((s) => S.activa.ej.push({ slug: s, descanso: 0, nota: '', series: [{ ...nuevaSerie(), hecha: false }] })); }); },
  quitarEj: async () => { S.activa.ej.splice(S.foco.i, 1); S.foco.j = null; await guardarActiva(); S.pila = S.pila.filter((c) => !c.t.startsWith('h')); render(); },
  reordSesion: () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); abrirCapa({ t: 'reord', titulo: 'Reordenar', quitar: true, items: S.activa.ej.map((e, i) => ({ id: i, nombre: info(e.slug).n, slug: e.slug })), alListo: async (items) => { S.activa.ej = items.map((x) => S.activa.ej[x.id]); S.foco = { i: 0, j: null }; await guardarActiva(); } }); },
  notaSesion: async () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); const e = S.activa.ej[S.foco.i]; const v = await dlg({ titulo: 'Comentario: ' + info(e.slug).n, campos: [{ tipo: 'area', v: e.nota || '' }], ok: 'Guardar' }); if (v) { e.nota = v[0].trim(); await guardarActiva(); } render(); },
  descEjSesion: async () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); const e = S.activa.ej[S.foco.i]; const v = await elegirDescanso(e.descanso); if (v !== null) { e.descanso = v; await guardarActiva(); } render(); },
  rangoSesion: async () => { S.pila = S.pila.filter((c) => !c.t.startsWith('h')); await A.rangoEj(S.activa.ej[S.foco.i].slug); },
  descMas: () => { if (S.desc) { S.desc.fin += 15000; S.desc.total += 15; } render(); },
  descMenos: () => { if (S.desc) { S.desc.fin -= 15000; } render(); },
  descOmitir: () => { S.desc = null; render(); },
  // --- sugerida ---
  sugerida: () => { S.sug = { pref: { ...PREF_INICIAL, ...cfg('sug', {}) }, propuesta: null, variante: 0 }; abrirCapa({ t: 'sugerida' }); },
  prefSug: (p) => { const [k, v] = p.split(':'); S.sug.pref[k] = ['dias', 'minutos'].includes(k) ? +v : v; render(); },
  cuidarSug: (p) => { const c = S.sug.pref.cuidar; const i = c.indexOf(p); if (i >= 0) c.splice(i, 1); else c.push(p); render(); },
  verSug: () => { setCfg('sug', S.sug.pref); S.sug.variante = 0; S.sug.propuesta = generarPropuesta(S.sug.pref, perfil(), S.cat, 0); render(); window.scrollTo(0, 0); },
  otraSug: () => { S.sug.variante++; S.sug.propuesta = generarPropuesta(S.sug.pref, perfil(), S.cat, S.sug.variante); render(); },
  atrasSug: () => { S.sug.propuesta = null; render(); },
  guardarSug: async () => {
    let orden = S.rutinas.reduce((m, x) => Math.max(m, x.orden || 0), 0); const aj = { ...cfg('aj', {}) };
    for (const d of S.sug.propuesta.dias) {
      const ej = d.ejercicios.map((x) => { if (!(aj[x.slug] && aj[x.slug].rMax)) aj[x.slug] = { rMin: x.repMin, rMax: x.repMax }; const reps = Math.ceil((x.repMin + x.repMax) / 2);
        return { slug: x.slug, notas: '', descanso: x.descanso, series: [...(x.calentamiento ? [{ peso: 0, reps: 8, tipo: 'CALENTAMIENTO' }] : []), ...Array.from({ length: x.series }, () => ({ peso: 0, reps, tipo: 'NORMAL' }))] }; });
      await DB.guardar('rutinas', { nombre: d.nombre, orden: ++orden, ej });
    }
    setCfg('aj', aj); const n = S.sug.propuesta.dias.length; await recargar(); S.pila = []; S.tab = 'entrenar'; render(); aviso(`Se guardaron ${n} rutinas sugeridas.`);
  },
};
function serieActual() {
  const e = S.activa.ej[S.foco.i]; const pend = e.series.findIndex((s) => !s.hecha); const j = S.foco.j !== null ? S.foco.j : pend >= 0 ? pend : e.series.length - 1;
  const prev = previaDe(e.slug, j); const s = e.series[j];
  return { e, j, base: { peso: s.peso > 0 ? s.peso : (prev ? prev.peso : 0), reps: s.reps > 0 ? s.reps : (prev ? prev.reps : 0) } };
}
async function cambiarSerie(campo, dir) {
  const { e, j, base } = serieActual(); const s = e.series[j];
  if (campo === 'peso') { const paso = lb() ? 5 : 2.5; const v = Math.max(0, aUnidad(base.peso, lb()) + dir * paso); s.peso = deUnidad(v, lb()); s.reps = s.reps || base.reps; }
  else { s.reps = Math.max(0, base.reps + dir); s.peso = s.peso || base.peso; }
  await guardarActiva(); render();
}
function abrirSelector(titulo, cb) { S.sel = { titulo, cb, set: new Set(), eq: new Set(), mu: new Set(), q: '' }; abrirCapa({ t: 'selector' }); }
function refrescarFiltro() {
  const c = S.pila[S.pila.length - 1]; const el = document.querySelector('.capa.hoja'); if (!el) return;
  const tmp = document.createElement('div'); tmp.innerHTML = hFiltro(c); el.replaceWith(tmp.firstElementChild);
  const l = $('lsel'); if (l) l.innerHTML = listaSel();
}
function menuAcciones(textos) {
  return new Promise((res) => {
    $('dlg').innerHTML = `<div class="dlg"><div><div class="col g8">${textos.map((t, i) => `<button class="sel-op" data-m="${i}">${esc(t)}</button>`).join('')}<button class="btn-t" data-m="x">Cancelar</button></div></div></div>`;
    $('dlg').querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { $('dlg').innerHTML = ''; res(b.dataset.m === 'x' ? -1 : +b.dataset.m); }));
  });
}
async function elegirDescanso(actual) {
  const ops = [0, 30, 45, 60, 90, 120, 180, 300]; const i = await menuAcciones(ops.map((s) => `${s === 0 ? 'Apagado' : fmtDescanso(s)}${s === actual ? '  ✓' : ''}`)); return i < 0 ? null : ops[i];
}

// ---------- Eventos ----------
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  if (ev.target.closest('[data-no]') && el.classList.contains('capa')) return; // clic dentro de la hoja
  const f = A[el.dataset.a]; if (!f || el.disabled) return;
  try { const r = f(el.dataset.p, el, ev); if (r && r.catch) r.catch((e) => console.error(e)); } catch (e) { console.error(e); }
});
document.addEventListener('input', (ev) => {
  const el = ev.target; const k = el.dataset && el.dataset.in; if (!k) return;
  if (k === 'q') { S.sel.q = el.value; const l = $('lsel'); if (l) l.innerHTML = listaSel(); return; }
  if (k === 'dnombre') { S.draft.nombre = el.value; return; }
  const [t, a, b] = k.split(':');
  if (t === 'dnota') S.draft.ej[+a].notas = el.value;
  else if (t === 'dp') S.draft.ej[+a].series[+b].peso = deUnidad(parseFloat(String(el.value).replace(',', '.')) || 0, lb());
  else if (t === 'dr') S.draft.ej[+a].series[+b].reps = parseInt(el.value) || 0;
});
document.addEventListener('change', (ev) => {
  const el = ev.target; const k = el.dataset && el.dataset.in;
  if (k && k.startsWith('perfil:')) {
    const campo = k.split(':')[1], p = { ...perfil() }; const v = parseFloat(String(el.value).replace(',', '.')) || 0;
    p[campo] = campo === 'pesoKg' ? deUnidad(v, lb()) : Math.round(v); setCfg('perfil', p);
    const st = $('pst'); if (st) { st.textContent = perfilCompleto(p) ? 'Datos completos: ya se estiman las calorías.' : 'Faltan datos para estimar las calorías.'; st.className = 'nota ' + (perfilCompleto(p) ? 'am' : ''); }
  }
  if (el.id === 'archivo' && el.files[0]) {
    el.files[0].text().then(async (t) => { try { if (await confirmar('Restaurar respaldo', 'Reemplazará tus datos actuales por los del archivo.', 'Restaurar')) { await DB.importar(t); cargarCfg(); await recargar(); S.pila = []; render(); aviso('Respaldo restaurado.'); } } catch (e) { aviso(e.message || 'No se pudo leer el archivo.'); } el.value = ''; });
  }
});
// Deslizar entre ejercicios en el modo enfoque
let tx = null;
document.addEventListener('touchstart', (e) => { if (e.target.closest('#capa-sesion') && !e.target.closest('input,textarea')) tx = { x: e.touches[0].clientX, y: e.touches[0].clientY }; else tx = null; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!tx || !S.activa) return; const dx = e.changedTouches[0].clientX - tx.x, dy = e.changedTouches[0].clientY - tx.y; tx = null;
  if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.8) { const n = S.foco.i + (dx < 0 ? 1 : -1); if (n >= 0 && n < S.activa.ej.length) { S.foco = { i: n, j: null }; render(); } }
}, { passive: true });

function cargarCfg() { S.cfg = {}; ['lb', 'meta', 'contarCal', 'perfil', 'sug', 'aj'].forEach((k) => { const v = DB.ls.leer(k, undefined); if (v !== undefined) S.cfg[k] = v; }); }

// ---------- Inicio de la app ----------
(async function iniciar() {
  try {
    S.cat = await (await fetch('data/catalogo.json')).json(); S.porSlug = Object.fromEntries(S.cat.map((e) => [e.s, e]));
    await DB.abrir(); cargarCfg(); await recargar(); DB.pedirPersistencia();
    if (S.activa) S.foco = { i: Math.max(0, primerPendiente()), j: null };
    render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { $('app').innerHTML = `<p style="padding:20px">No se pudo iniciar la app: ${esc(e.message)}</p>`; console.error(e); }
})();
window.__S = S; window.__A = A;
