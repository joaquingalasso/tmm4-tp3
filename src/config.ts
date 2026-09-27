/**
 * AUDERE — configuracion, paleta y ruido.
 */

/** Coordenadas logicas. Los lienzos dibujan a RES veces esto. */
export const W = 1280;
export const H = 720;
export const RES = 1.25;

export const C = {
  noche0: '#030508',
  noche1: '#080d13',
  noche2: '#0f1720',
  pared: '#0d131a',
  pared2: '#111a23',
  zocalo: '#070a0e',
  piso: '#090d12',
  tinta: '#020304',
  /** La nina y el titulo. Lo unico claro del mundo. */
  hueso: '#e8e3d8',
  huesoSombra: '#b9b3a7',
  frio: '#8ea3b4',
  /** El tarareo: la unica luz calida del juego es la voz del jugador. */
  calida: '#f2bc70',
} as const;

export const RGB = {
  frio: '200,214,228',
  calida: '242,184,104',
  niebla: '120,138,156',
  hueso: '232,227,216',
} as const;

export const TIPO = '"Gloock", Georgia, serif';

export const BAL = {
  velNina: 92,

  // Acto I — el traspaso
  toleranciaSemitonos: 0.9,
  msParaIgualar: 1700,
  decaeIgualar: 0.3,

  // Acto II — afuera
  miedoBase: 0.006,
  miedoOscuridad: 0.018,
  miedoPresencia: 0.075,
  radioPresencia: 360,
  golpeContacto: 0.22,
  alivioTarareo: 0.34,
  alivioFarol: 0.05,
  radioHaloMin: 70,
  radioHaloMax: 300,
  empujeHalo: 140,
  miedoTrasCaer: 0.45,

  // Voz
  factorPiso: 2.6,
  minimoAbsoluto: 0.004,
  claridadTarareo: 0.78,
  factorGrito: 18,
  minimoGrito: 0.16,
  msHueco: 220,
} as const;

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const suave = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Acerca `a` a `b` de forma independiente del framerate. */
export const hacia = (a: number, b: number, velocidad: number, dt: number) => a + (b - a) * (1 - Math.exp(-velocidad * dt));

export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function h2(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Ruido de valor 2D, 0..1. */
export function ruido(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  const ab = a + (b - a) * u, cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}

/** Ruido centrado, -1..1. */
export const rc = (x: number, y: number) => ruido(x, y) * 2 - 1;

/** Semitono MIDI de una frecuencia. */
export const semitono = (f: number) => 12 * Math.log2(f / 440) + 69;
export const frecuencia = (s: number) => 440 * Math.pow(2, (s - 69) / 12);
/** Diferencia en semitonos plegada a una octava: cantar una octava arriba tambien vale. */
export const difPlegada = (s: number, objetivo: number) => {
  const d = (((s - objetivo) % 12) + 18) % 12 - 6;
  return d;
};
