// Utilidades y cálculos (equivalentes a los de la app de Android).

export const MUSCULOS = {
  ABDOMINALES: ['Abdominales', 'SUP'], ANTEBRAZOS: ['Antebrazos', 'SUP'], BICEPS: ['Bíceps', 'SUP'], CUELLO: ['Cuello', 'SUP'],
  DORSALES: ['Dorsales', 'SUP'], ESPALDA_BAJA: ['Espalda baja', 'SUP'], ESPALDA_ALTA: ['Espalda superior', 'SUP'],
  HOMBROS: ['Hombros', 'SUP'], PECHO: ['Pecho', 'SUP'], TRAPECIO: ['Trapecio', 'SUP'], TRICEPS: ['Tríceps', 'SUP'],
  CUADRICEPS: ['Cuádriceps', 'INF'], FEMORALES: ['Isquiotibiales', 'INF'], GLUTEOS: ['Glúteos', 'INF'],
  PANTORRILLAS: ['Pantorrillas', 'INF'], ADUCTORES: ['Aductores', 'INF'], ABDUCTORES: ['Abductores', 'INF'],
  CUERPO_COMPLETO: ['Cuerpo entero', 'OTR'], CARDIO: ['Cardio', 'OTR'], OTRO: ['Otro', 'OTR'],
};
export const REGIONES = { SUP: 'Tren superior', INF: 'Tren inferior', OTR: 'Otros' };
export const EQUIPOS = {
  PESO_CORPORAL: 'Peso corporal', BARRA: 'Barra', MANCUERNA: 'Mancuerna', PESA_RUSA: 'Pesa rusa', POLEA: 'Polea',
  MAQUINA: 'Máquina', DISCO: 'Disco', BANDA: 'Banda elástica', SUSPENSION: 'Suspensión', OTRO: 'Otro',
};
export const TIPOS = {
  NORMAL: { et: 'Serie normal', letra: null }, CALENTAMIENTO: { et: 'Calentamiento', letra: 'W' },
  FALLO: { et: 'Fallo', letra: 'F' }, DROP: { et: 'Drop set', letra: 'D' },
};
export const KG_A_LB = 2.2046226218;
export const PESO_SECUNDARIO = 0.5;

export const norm = (t) => (t || '').trim().toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '');
export const palabrasDe = (t) => norm(t).split(/[^a-z0-9]+/).filter(Boolean);

function distancia(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Búsqueda tolerante: sin importar orden, paréntesis ni acentos; acepta inicios, plurales y un error de una letra. */
export function coincideTexto(nombre, consulta) {
  const q = palabrasDe(consulta);
  if (!q.length) return true;
  const ws = palabrasDe(nombre);
  return q.every((t) => ws.some((w) => w.startsWith(t) || (t.length >= 3 && w.includes(t)) || (w.length >= 4 && t.startsWith(w)) ||
    (t.length >= 4 && [t.length - 1, t.length, t.length + 1].some((k) => k >= 1 && k <= w.length && distancia(w.slice(0, k), t) <= 1))));
}

const tiene = (n, ...cl) => cl.some((c) => n.includes(c));

/** Músculos secundarios deducidos por reglas (el catálogo solo guarda el principal). */
export function secundarios(nombre, p) {
  const n = norm(nombre);
  let l = [];
  switch (p) {
    case 'PECHO': l = tiene(n, 'apertura', 'mariposa', 'pec deck', 'cables cruzados', 'svend', 'alrededor del mundo') ? ['HOMBROS'] : ['TRICEPS', 'HOMBROS']; break;
    case 'HOMBROS': l = tiene(n, 'press', 'empuje', 'arnold', 'pica', 'verticales', 'toques de hombro') ? ['TRICEPS'] : tiene(n, 'remo vertical') ? ['TRAPECIO'] : tiene(n, 'posterior', 'tiron a la cara') ? ['ESPALDA_ALTA'] : []; break;
    case 'TRICEPS': l = tiene(n, 'press de banca', 'fondo', 'diamante', 'agarre cerrado') ? ['PECHO', 'HOMBROS'] : []; break;
    case 'BICEPS': l = ['ANTEBRAZOS']; break;
    case 'DORSALES': l = tiene(n, 'pullover') ? ['PECHO', 'TRICEPS'] : ['BICEPS', 'ESPALDA_ALTA']; break;
    case 'ESPALDA_ALTA': l = tiene(n, 'peso muerto') ? ['GLUTEOS', 'ESPALDA_BAJA'] : tiene(n, 'colgado') ? ['ANTEBRAZOS', 'DORSALES'] : tiene(n, 'escapular') ? ['DORSALES'] : ['DORSALES', 'BICEPS']; break;
    case 'ESPALDA_BAJA': l = tiene(n, 'superman') ? ['GLUTEOS'] : ['GLUTEOS', 'FEMORALES']; break;
    case 'CUADRICEPS': l = tiene(n, 'extension', 'extensiones') ? [] : tiene(n, 'salto', 'saltos') ? ['GLUTEOS', 'PANTORRILLAS'] : tiene(n, 'sumo') ? ['GLUTEOS', 'ADUCTORES'] : ['GLUTEOS']; break;
    case 'FEMORALES': l = tiene(n, 'peso muerto', 'buenos dias') ? ['GLUTEOS', 'ESPALDA_BAJA'] : tiene(n, 'elevacion de gluteos') ? ['GLUTEOS'] : []; break;
    case 'GLUTEOS': l = tiene(n, 'peso muerto sumo') ? ['ADUCTORES', 'FEMORALES', 'ESPALDA_BAJA'] : tiene(n, 'peso muerto') ? ['FEMORALES', 'ESPALDA_BAJA'] : tiene(n, 'empuje de cadera', 'puente', 'hiperextension') ? ['FEMORALES'] : []; break;
    case 'TRAPECIO': l = ['ANTEBRAZOS']; break;
    case 'ABDOMINALES': l = tiene(n, 'rueda') ? ['DORSALES'] : []; break;
    case 'CUERPO_COMPLETO': l = tiene(n, 'cargada', 'arrancada', 'envion', 'tiron') ? ['CUADRICEPS', 'GLUTEOS', 'TRAPECIO', 'HOMBROS'] : tiene(n, 'swing') ? ['GLUTEOS', 'FEMORALES', 'ESPALDA_BAJA'] : tiene(n, 'burpee') ? ['PECHO', 'CUADRICEPS', 'HOMBROS'] : tiene(n, 'thruster') ? ['CUADRICEPS', 'HOMBROS', 'GLUTEOS'] : []; break;
    default: l = [];
  }
  return l.filter((m) => m !== p);
}

// ---------- Pesos ----------
export const aUnidad = (kg, lb) => (lb ? kg * KG_A_LB : kg);
export const deUnidad = (v, lb) => (lb ? v / KG_A_LB : v);
const r1 = (v) => Math.round(v * 10) / 10;
export function textoPeso(kg, lb) { if (!kg) return ''; const v = r1(aUnidad(kg, lb)); return Number.isInteger(v) ? String(v) : v.toFixed(1); }
export function formatoPeso(kg, lb) { const v = r1(aUnidad(kg, lb)); return `${Number.isInteger(v) ? v : v.toFixed(1)} ${lb ? 'lb' : 'kg'}`; }
export const epley = (kg, reps) => (reps <= 1 ? kg : kg * (1 + reps / 30));

// ---------- Fechas ----------
export function inicioSemana(ms = Date.now()) {
  const d = new Date(ms); const atras = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - atras); d.setHours(0, 0, 0, 0); return d.getTime();
}
export const sumarDias = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
export function fmtDur(ms) { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; }
export function fmtCron(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const p = (n) => String(n).padStart(2, '0'); return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`; }
export function fmtRegresivo(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
export const fmtDescanso = (seg) => (seg > 0 ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}` : 'apagado');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function textoSemana(lunes) {
  const a = new Date(lunes), b = new Date(sumarDias(lunes, 6));
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MESES[b.getMonth()]}` : `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}
export function cuando(ms) {
  const dia = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dias = Math.round((dia(Date.now()) - dia(ms)) / 86400000);
  const d = new Date(ms); const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (dias === 0) return `Hoy, ${hora}`; if (dias === 1) return `Ayer, ${hora}`;
  const f = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
  return dias < 7 ? `Hace ${dias} días · ${f}` : `${f} ${d.getFullYear()}, ${hora}`;
}
export function fmtFechaLarga(ms) {
  const d = new Date(ms);
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

// ---------- Análisis ----------
/** series: [{id,sesionId,inicio,slug,peso,reps,tipo}] ordenadas por fecha. Devuelve récords y "anterior". */
export function analizar(series) {
  const mejor1rm = {}, mejorPeso = {}, records = new Set(), porSesion = {}, anterior = {};
  const sesiones = new Map();
  for (const s of series) { if (!sesiones.has(s.sesionId)) sesiones.set(s.sesionId, []); sesiones.get(s.sesionId).push(s); }
  for (const [sid, filas] of sesiones) {
    const porEj = new Map();
    for (const s of filas) { if (!porEj.has(s.slug)) porEj.set(s.slug, []); porEj.get(s.slug).push(s); }
    for (const [slug, lista] of porEj) {
      anterior[slug] = lista;
      const trab = lista.filter((s) => s.tipo !== 'CALENTAMIENTO' && s.reps > 0);
      if (!trab.length) continue;
      const t1 = trab.reduce((a, b) => (epley(b.peso, b.reps) > epley(a.peso, a.reps) ? b : a));
      const tp = trab.reduce((a, b) => (b.peso > a.peso ? b : a));
      if (mejor1rm[slug] !== undefined) {
        const nuevos = new Set();
        if (epley(t1.peso, t1.reps) > mejor1rm[slug] + 1e-6) nuevos.add(t1.id);
        if (tp.peso > mejorPeso[slug] + 1e-6) nuevos.add(tp.id);
        nuevos.forEach((x) => records.add(x));
        if (nuevos.size) porSesion[sid] = (porSesion[sid] || 0) + nuevos.size;
      }
      mejor1rm[slug] = Math.max(mejor1rm[slug] || 0, epley(t1.peso, t1.reps));
      mejorPeso[slug] = Math.max(mejorPeso[slug] || 0, tp.peso);
    }
  }
  return { records, porSesion, anterior };
}

/** Series equivalentes por músculo (principal 1, secundario 0.5). catalogo: mapa slug -> {n,m}. */
export function distribucion(series, porSlug, contarCal) {
  const t = {};
  for (const s of series) {
    if (!contarCal && s.tipo === 'CALENTAMIENTO') continue;
    const e = porSlug[s.slug]; if (!e) continue;
    t[e.m] = (t[e.m] || 0) + 1;
    for (const m of secundarios(e.n, e.m)) t[m] = (t[m] || 0) + PESO_SECUNDARIO;
  }
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}

export function perfilCompleto(p) { return (p.sexo === 'H' || p.sexo === 'M') && p.edad >= 10 && p.edad <= 100 && p.alturaCm >= 100 && p.alturaCm <= 250 && p.pesoKg >= 30 && p.pesoKg <= 300; }

/** Calorías aproximadas: Mifflin-St Jeor × MET (3.5–6.0 según densidad) × horas / 24. */
export function estimarKcal(durMs, seriesTrabajo, p) {
  if (!perfilCompleto(p) || durMs <= 0) return null;
  const min = durMs / 60000, dens = seriesTrabajo / Math.max(1, min);
  const met = 3.5 + 2.5 * Math.min(1, Math.max(0, (dens - 0.2) / 0.25));
  const basal = 10 * p.pesoKg + 6.25 * p.alturaCm - 5 * p.edad + (p.sexo === 'H' ? 5 : -161);
  return Math.round(met * (basal / 24) * (min / 60));
}

export const llegoAlTope = (repMax, reps) => repMax > 0 && reps.length > 0 && reps.every((r) => r >= repMax);
