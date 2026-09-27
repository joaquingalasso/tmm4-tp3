import { CATALOGO, porId, type Recurso } from './catalogo';

/**
 * HOJAS — carga las imagenes del juego desde public/assets.
 *
 * Si un PNG falta o no carga, se dibuja el placeholder en memoria con el mismo
 * codigo que lo exporta: el juego nunca se rompe por una imagen que falta.
 */

export interface Hoja { fuente: CanvasImageSource; w: number; h: number; cuadros: number; fps: number; real: boolean; }

const hojas = new Map<string, Hoja>();

function placeholder(r: Recurso): Hoja {
  const cv = document.createElement('canvas');
  cv.width = r.w * r.cuadros; cv.height = r.h;
  const c = cv.getContext('2d')!;
  for (let i = 0; i < r.cuadros; i++) {
    c.save(); c.translate(i * r.w, 0);
    c.beginPath(); c.rect(0, 0, r.w, r.h); c.clip();
    r.dibujar(c, i, r.cuadros);
    c.restore();
  }
  return { fuente: cv, w: r.w, h: r.h, cuadros: r.cuadros, fps: r.fps, real: false };
}

function cargar(r: Recurso): Promise<void> {
  return new Promise((listo) => {
    const img = new Image();
    img.onload = () => {
      // si el equipo cambio la cantidad de cuadros, se respeta el alto y se deduce el resto
      const cuadros = Math.max(1, Math.round(img.width / r.w));
      hojas.set(r.id, { fuente: img, w: r.w, h: img.height, cuadros, fps: r.fps, real: true });
      listo();
    };
    img.onerror = () => { hojas.set(r.id, placeholder(r)); listo(); };
    img.src = `assets/${r.archivo}`;
  });
}

export async function cargarHojas(alAvanzar?: (p: number) => void) {
  let hechas = 0;
  await Promise.all(CATALOGO.map((r) => cargar(r).then(() => { hechas++; alAvanzar?.(hechas / CATALOGO.length); })));
}

export function hoja(id: string): Hoja {
  let h = hojas.get(id);
  if (!h) {
    const r = porId.get(id);
    if (!r) throw new Error(`recurso desconocido: ${id}`);
    h = placeholder(r);
    hojas.set(id, h);
  }
  return h;
}

/** Cuadro a mostrar segun el tiempo. `unaVez` se queda en el ultimo. */
export function cuadroEn(id: string, t: number, unaVez = false) {
  const h = hoja(id);
  if (h.cuadros <= 1 || h.fps <= 0) return 0;
  const n = Math.floor(t * h.fps);
  return unaVez ? Math.min(h.cuadros - 1, n) : n % h.cuadros;
}

/** Dibuja un cuadro de una hoja en el rectangulo dado. */
export function pintar(c: CanvasRenderingContext2D, id: string, cuadro: number, dx: number, dy: number, dw: number, dh: number, espejo = false) {
  const h = hoja(id);
  const i = ((cuadro % h.cuadros) + h.cuadros) % h.cuadros;
  if (espejo) {
    c.save();
    c.translate(dx + dw, dy);
    c.scale(-1, 1);
    c.drawImage(h.fuente, i * h.w, 0, h.w, h.h, 0, 0, dw, dh);
    c.restore();
  } else {
    c.drawImage(h.fuente, i * h.w, 0, h.w, h.h, dx, dy, dw, dh);
  }
}

export function cuantasReales() {
  let n = 0;
  for (const h of hojas.values()) if (h.real) n++;
  return { reales: n, total: CATALOGO.length };
}

/** Dibuja una parte de un cuadro (coordenadas en px del cuadro). */
export function pintarParte(c: CanvasRenderingContext2D, id: string, cuadro: number,
                            sx: number, sy: number, sw: number, sh: number,
                            dx: number, dy: number, dw: number, dh: number, espejo = false) {
  const h = hoja(id);
  const i = ((cuadro % h.cuadros) + h.cuadros) % h.cuadros;
  if (espejo) {
    c.save();
    c.translate(dx + dw, dy);
    c.scale(-1, 1);
    c.drawImage(h.fuente, i * h.w + sx, sy, sw, sh, 0, 0, dw, dh);
    c.restore();
  } else c.drawImage(h.fuente, i * h.w + sx, sy, sw, sh, dx, dy, dw, dh);
}

const cabezas = new Map<string, { x: number; y: number; w: number; h: number }>();

/** Donde esta la cabeza en el primer cuadro de una hoja (la parte mas alta con pintura). */
export function cabeza(id: string) {
  let r = cabezas.get(id);
  if (r) return r;
  const h = hoja(id);
  const cv = document.createElement('canvas');
  cv.width = h.w; cv.height = h.h;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(h.fuente, 0, 0, h.w, h.h, 0, 0, h.w, h.h);
  const d = c.getImageData(0, 0, h.w, h.h).data;
  let arriba = h.h;
  for (let y = 0; y < h.h && arriba === h.h; y += 2) for (let x = 0; x < h.w; x += 2) if (d[(y * h.w + x) * 4 + 3] > 60) { arriba = y; break; }
  const alto = Math.max(20, (h.h - arriba) * 0.2);
  let izq = h.w, der = 0;
  for (let y = arriba; y < arriba + alto && y < h.h; y += 2) for (let x = 0; x < h.w; x += 2) {
    if (d[(y * h.w + x) * 4 + 3] > 60) { if (x < izq) izq = x; if (x > der) der = x; }
  }
  if (der <= izq) { izq = h.w * 0.35; der = h.w * 0.65; }
  r = { x: izq, y: arriba, w: der - izq, h: alto };
  cabezas.set(id, r);
  return r;
}

/** Una silueta negra de un cuadro (para las sombras). */
export function silueta(c: CanvasRenderingContext2D, id: string, cuadro: number, dx: number, dy: number, dw: number, dh: number, espejo = false) {
  c.save();
  c.filter = 'brightness(0)';
  pintar(c, id, cuadro, dx, dy, dw, dh, espejo);
  c.restore();
}
