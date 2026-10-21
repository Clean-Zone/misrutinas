// Rutina sugerida: reglas locales (sin internet), igual que en la app de Android.
import { norm, secundarios } from './util.js';

export const OBJETIVOS = {
  MUSCULO: ['Ganar músculo', 'Volumen moderado y repeticiones de 8 a 12.'],
  FUERZA: ['Ganar fuerza', 'Menos repeticiones, más peso y descansos largos.'],
  GRASA: ['Bajar grasa', 'Descansos cortos y más repeticiones; suma cardio ligero.'],
  MANTENER: ['Mantenerme', 'Menos series para conservar lo que tienes.'],
};
export const NIVELES = {
  PRINCIPIANTE: ['Principiante', 'Menos de 6 meses entrenando.'],
  INTERMEDIO: ['Intermedio', 'De 6 meses a 2 años.'],
  AVANZADO: ['Avanzado', 'Más de 2 años de forma constante.'],
};
export const EQUIPO_DISP = {
  GIMNASIO: ['Gimnasio completo', 'Barras, máquinas, poleas y mancuernas.'],
  MANCUERNAS: ['Mancuernas', 'Mancuernas, banda y tu peso corporal.'],
  CASA: ['Sin equipo', 'Peso corporal y bandas elásticas.'],
};
export const CUIDAR = { HOMBROS: 'Hombros', ESPALDA_BAJA: 'Espalda baja', RODILLAS: 'Rodillas' };
export const PREF_INICIAL = { objetivo: 'MUSCULO', nivel: 'PRINCIPIANTE', dias: 3, minutos: 60, equipo: 'GIMNASIO', cuidar: [] };

const P = {
  PECHO_COMP: ['PECHO', true, ['press de banca (barra)', 'press de banca (mancuerna)', 'press de pecho (maquina)', 'flexiones']],
  PECHO_INCL: ['PECHO', true, ['press de banca inclinado (mancuerna)', 'press de banca inclinado (barra)', 'press de pecho inclinado', 'flexion declinada', 'flexiones inclinadas']],
  PECHO_AISL: ['PECHO', false, ['aperturas (mancuerna)', 'mariposa', 'aperturas de pecho sentado', 'cables cruzados', 'aperturas (banda)']],
  ESP_VERT: ['DORSALES', true, ['jalon al pecho (cable)', 'dominada (asistida)', 'jalon al pecho (maquina)', 'dominada', 'jalon al pecho (banda)', 'dominada (banda)']],
  ESP_HORIZ: ['ESPALDA_ALTA', true, ['remo sentado con cable - agarre recto', 'remo con mancuerna', 'remo sentado (maquina)', 'remo inclinado (barra)', 'remo inclinado (mancuerna)', 'remo inclinado (banda)', 'remo invertido']],
  HOMBRO_PRESS: ['HOMBROS', true, ['press de hombros sentado (mancuerna)', 'press de hombros (mancuerna)', 'press de hombros sentado (maquina)', 'press de hombros (barra)', 'flexion en pica']],
  HOMBRO_LAT: ['HOMBROS', false, ['elevacion lateral (mancuerna)', 'elevacion lateral (cable)', 'elevacion lateral (maquina)', 'elevacion lateral (banda)']],
  HOMBRO_POST: ['HOMBROS', false, ['vuelos posteriores (mancuerna)', 'vuelos posteriores (maquina)', 'tiron a la cara', 'vuelos posteriores (cable)']],
  BICEPS: ['BICEPS', false, ['curl de biceps (mancuerna)', 'curl de biceps (barra)', 'curl martillo (mancuerna)', 'curl de biceps (cable)', 'curl martillo (banda)']],
  TRICEPS: ['TRICEPS', false, ['extension de triceps (cable)', 'jalon de triceps con cuerda', 'extension de triceps (mancuerna)', 'press frances (mancuerna)', 'fondos en banco', 'flexiones diamante']],
  CUAD: ['CUADRICEPS', true, ['sentadilla (barra)', 'sentadilla goblet', 'press de piernas', 'sentadilla (maquina)', 'sentadilla (mancuerna)', 'sentadilla (peso corporal)']],
  CUAD2: ['CUADRICEPS', true, ['zancada (mancuerna)', 'sentadilla bulgara (mancuerna)', 'extension de pierna', 'zancada', 'zancadas caminando']],
  FEM: ['FEMORALES', true, ['peso muerto rumano (barra)', 'peso muerto rumano (mancuerna)', 'curl de pierna sentado', 'curl de piernas acostado (maquina)', 'puente de gluteos', 'curls nordicos']],
  GLUT: ['GLUTEOS', true, ['empuje de caderas (barra)', 'empuje de cadera (mancuerna)', 'empuje de cadera (maquina)', 'puente de gluteos (barra)', 'puente de gluteos', 'patada de gluteo con cable']],
  PANT: ['PANTORRILLAS', false, ['elevacion de gemelos de pie (maquina)', 'elevacion de gemelos de pie (mancuerna)', 'elevacion de gemelos de pie', 'elevacion de gemelos sentado']],
  ABS: ['ABDOMINALES', false, ['plancha', 'abdominal corto con cable', 'levantamiento de rodillas tumbado', 'crunch inverso', 'abdominal completo']],
};
const T = (nombre, ...h) => ({ nombre, huecos: h });
const FULL_A = T('Cuerpo entero A', 'CUAD', 'PECHO_COMP', 'ESP_HORIZ', 'HOMBRO_PRESS', 'FEM', 'BICEPS', 'ABS', 'PANT');
const FULL_B = T('Cuerpo entero B', 'FEM', 'PECHO_INCL', 'ESP_VERT', 'CUAD2', 'HOMBRO_LAT', 'TRICEPS', 'BICEPS', 'ABS');
const FULL_C = T('Cuerpo entero C', 'GLUT', 'PECHO_COMP', 'ESP_HORIZ', 'CUAD', 'HOMBRO_POST', 'BICEPS', 'TRICEPS', 'ABS');
const EMPUJE = T('Empuje', 'PECHO_COMP', 'HOMBRO_PRESS', 'PECHO_INCL', 'HOMBRO_LAT', 'TRICEPS', 'PECHO_AISL', 'ABS', 'TRICEPS');
const JALON = T('Jalón', 'ESP_VERT', 'ESP_HORIZ', 'HOMBRO_POST', 'BICEPS', 'ESP_HORIZ', 'BICEPS', 'ABS', 'ESP_VERT');
const PIERNA_A = T('Pierna A', 'CUAD', 'FEM', 'GLUT', 'CUAD2', 'PANT', 'ABS', 'FEM', 'PANT');
const PIERNA_B = T('Pierna B', 'GLUT', 'CUAD2', 'FEM', 'CUAD', 'PANT', 'ABS', 'GLUT', 'PANT');
const TORSO_A = T('Torso A', 'PECHO_COMP', 'ESP_HORIZ', 'HOMBRO_PRESS', 'ESP_VERT', 'BICEPS', 'TRICEPS', 'HOMBRO_LAT', 'ABS');
const TORSO_B = T('Torso B', 'ESP_VERT', 'PECHO_INCL', 'ESP_HORIZ', 'HOMBRO_LAT', 'TRICEPS', 'BICEPS', 'HOMBRO_POST', 'PECHO_AISL');

function plantillas(dias, nivel) {
  switch (dias) {
    case 2: return [FULL_A, FULL_B];
    case 3: return nivel === 'PRINCIPIANTE' ? [FULL_A, FULL_B, FULL_C] : [EMPUJE, JALON, PIERNA_A];
    case 4: return [TORSO_A, PIERNA_A, TORSO_B, PIERNA_B];
    case 5: return [EMPUJE, JALON, PIERNA_A, TORSO_A, PIERNA_B];
    default: return [EMPUJE, JALON, PIERNA_A, EMPUJE, JALON, PIERNA_B];
  }
}
const AVANZADOS = ['pistol', 'muscle up', 'front lever', 'dragon', 'l-sit', 'kipping', 'a una mano', 'a una pierna', 'negativa'];
const IMPACTO = ['salto', 'burpee', 'sprint', 'pliometric'];
const RODILLAS = ['zancada', 'sentadilla', 'salto', 'extension de pierna', 'press de piernas', 'bulgara', 'pistol', 'cajon', 'hack', 'curtsy'];
const LUMBAR = ['peso muerto', 'buenos dias', 'hiperextension', 'remo inclinado (barra)', 'remo pendlay', 'remo meadows'];
const RANGO_EQ = { BARRA: 0, MANCUERNA: 1, MAQUINA: 2, POLEA: 3, PESO_CORPORAL: 4 };

function permitido(e, pref, perfil) {
  const ok = pref.equipo === 'GIMNASIO' ? !['OTRO', 'SUSPENSION', 'DISCO', 'PESA_RUSA'].includes(e.e)
    : pref.equipo === 'MANCUERNAS' ? ['MANCUERNA', 'PESO_CORPORAL', 'BANDA'].includes(e.e) : ['PESO_CORPORAL', 'BANDA'].includes(e.e);
  if (!ok) return false;
  const n = norm(e.n);
  if (n.includes('peso anadido')) return false;
  if (pref.nivel !== 'AVANZADO' && AVANZADOS.some((a) => n.includes(a))) return false;
  const sec = secundarios(e.n, e.m);
  if (pref.cuidar.includes('HOMBROS') && (e.m === 'HOMBROS' || sec.includes('HOMBROS'))) return false;
  if (pref.cuidar.includes('ESPALDA_BAJA') && (e.m === 'ESPALDA_BAJA' || sec.includes('ESPALDA_BAJA') || LUMBAR.some((a) => n.includes(a)))) return false;
  if (pref.cuidar.includes('RODILLAS') && RODILLAS.some((a) => n.includes(a))) return false;
  const imc = perfil.alturaCm > 0 && perfil.pesoKg > 0 ? perfil.pesoKg / (perfil.alturaCm / 100) ** 2 : 0;
  if (imc >= 30 && IMPACTO.some((a) => n.includes(a))) return false;
  return true;
}
const coincide = (nn, p) => nn === p || nn.startsWith(p + ' (');

export function generarPropuesta(pref, perfil, catalogo, variante) {
  const validos = catalogo.filter((e) => permitido(e, pref, perfil));
  const huecosMax = pref.minutos <= 30 ? 4 : pref.minutos <= 45 ? 5 : pref.minutos <= 60 ? 6 : pref.minutos <= 75 ? 7 : 8;
  const usadosGlobal = new Set();
  const mayor50 = perfil.edad >= 50;
  const dias = plantillas(Math.min(6, Math.max(2, pref.dias)), pref.nivel).map((pl, idx) => {
    const usadosSesion = new Set(), items = [];
    for (const h of pl.huecos.slice(0, huecosMax)) {
      const [musculo, comp, prefer] = P[h];
      const disp = [...new Set(prefer.map((p) => validos.find((e) => coincide(norm(e.n), p) && !usadosSesion.has(e.s))).filter(Boolean))];
      const mejores = disp.slice(0, 3);
      let lista = mejores.filter((e) => !usadosGlobal.has(e.s)); if (!lista.length) lista = mejores.slice(0, 2);
      let el;
      if (lista.length) el = lista[(variante + idx) % lista.length];
      else {
        const cand = validos.filter((e) => e.m === musculo && !usadosSesion.has(e.s)).sort((a, b) => (RANGO_EQ[a.e] ?? 5) - (RANGO_EQ[b.e] ?? 5));
        el = cand.filter((e) => !usadosGlobal.has(e.s))[variante % 3] || cand[0];
      }
      if (!el) continue;
      usadosSesion.add(el.s); usadosGlobal.add(el.s);
      let series = pref.nivel === 'PRINCIPIANTE' ? (comp ? 3 : 2) : (comp ? 4 : 3);
      if (pref.objetivo === 'FUERZA' && comp) series += 1;
      if (pref.objetivo === 'MANTENER') series -= 1;
      series = Math.min(5, Math.max(2, series));
      let rep;
      if (pref.objetivo === 'FUERZA') rep = mayor50 && comp ? [6, 10] : comp ? [3, 6] : [6, 10];
      else if (pref.objetivo === 'GRASA') rep = comp ? [8, 12] : [12, 15];
      else rep = comp ? [8, 12] : [10, 15];
      const descanso = { FUERZA: comp ? 180 : 90, GRASA: comp ? 75 : 45, MUSCULO: comp ? 120 : 75, MANTENER: comp ? 90 : 60 }[pref.objetivo];
      const calentar = !items.length && comp && ['BARRA', 'MANCUERNA', 'MAQUINA'].includes(el.e) && pref.nivel !== 'PRINCIPIANTE';
      items.push({ slug: el.s, series, calentamiento: calentar, repMin: rep[0], repMax: rep[1], descanso });
    }
    return { nombre: `${pl.nombre} · ${OBJETIVOS[pref.objetivo][0]}`, ejercicios: items };
  }).filter((d) => d.ejercicios.length);
  const notas = ['Descansa al menos 48 horas antes de volver a trabajar el mismo músculo con carga alta.',
    'Empieza con un peso con el que te queden 2 o 3 repeticiones en reserva y sube cuando llegues al máximo del rango.'];
  if (pref.objetivo === 'GRASA') notas.push('Para bajar grasa suma 2 o 3 sesiones de cardio ligero (20 a 30 minutos); la alimentación pesa más que el entrenamiento.');
  if (mayor50) notas.push('Por tu edad evité cargas máximas: prioriza la técnica y recupérate bien.');
  if (pref.cuidar.length) notas.push(`Evité ejercicios que cargan: ${pref.cuidar.map((c) => CUIDAR[c].toLowerCase()).join(', ')}.`);
  notas.push('Es una guía general de entrenamiento, no consejo médico. Si tienes una lesión o condición de salud, consulta a un profesional.');
  return { dias, notas };
}
