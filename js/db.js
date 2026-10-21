// Base local en IndexedDB: rutinas y entrenamientos. Los ajustes sencillos van en localStorage.

let db;
export function abrir() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('misrutinas', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('rutinas', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('sesiones', { keyPath: 'id', autoIncrement: true });
    };
    r.onsuccess = () => { db = r.result; res(); };
    r.onerror = () => rej(r.error);
  });
}
const tx = (s, modo = 'readonly') => db.transaction(s, modo).objectStore(s);
const pedir = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
export const todos = (s) => pedir(tx(s).getAll());
export const guardar = (s, o) => pedir(tx(s, 'readwrite').put(o));
export const borrar = (s, id) => pedir(tx(s, 'readwrite').delete(id));
export const vaciar = (s) => pedir(tx(s, 'readwrite').clear());

export async function pedirPersistencia() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* sin soporte */ }
  return false;
}

export const ls = {
  leer(k, def) { try { const v = localStorage.getItem('mr_' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  guardar(k, v) { try { localStorage.setItem('mr_' + k, JSON.stringify(v)); } catch (e) { /* lleno o bloqueado */ } },
};

export async function exportar() {
  const claves = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mr_')) claves[k] = localStorage.getItem(k); }
  return JSON.stringify({ app: 'MisRutinas', version: 1, fecha: new Date().toISOString(), rutinas: await todos('rutinas'), sesiones: await todos('sesiones'), ajustes: claves });
}
export async function importar(texto) {
  const d = JSON.parse(texto);
  if (d.app !== 'MisRutinas') throw new Error('El archivo no es un respaldo de MisRutinas.');
  await vaciar('rutinas'); await vaciar('sesiones');
  for (const r of d.rutinas || []) await guardar('rutinas', r);
  for (const s of d.sesiones || []) await guardar('sesiones', s);
  for (const [k, v] of Object.entries(d.ajustes || {})) localStorage.setItem(k, v);
}
