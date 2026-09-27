import { hash, rc } from '../config';

/**
 * LIMITES Y SOMBRAS — placeholders.
 *
 * Nada de paredes invisibles: todo lo que frena es algo. En el presente, sus
 * propias barricadas (muebles apilados contra las puertas: se encerro ella). En
 * el recuerdo, sabanas colgadas al sol de la siesta. Al principio de cada lado,
 * trastos; al final del patio, un porton.
 *
 * Las sombras de ellas y sus cabezas son siluetas pensadas como sombras: el
 * juego las pinta de negro, asi que se pueden dibujar de cualquier color.
 */

type Ctx = CanvasRenderingContext2D;

const NOCHE = { madera: '#1b1612', madera2: '#2a221b', linea: '#07090b', tela: '#3a4452', caja: '#2b2620' };
const SIESTA = { madera: '#8a6a44', linea: '#4b3923', sabana: '#fbf6ea', sabana2: '#efe4cc', cal: '#f6efe0', hierro: '#3b2f25' };

function caja(c: Ctx, x: number, y: number, w: number, h: number, color: string, linea: string, rot = 0) {
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot);
  c.fillStyle = color; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = linea; c.lineWidth = 3; c.strokeRect(-w / 2, -h / 2, w, h);
  c.beginPath(); c.moveTo(-w / 2, -h / 2 + 10); c.lineTo(w / 2, -h / 2 + 10); c.stroke();
  c.restore();
}

function silla(c: Ctx, x: number, base: number, s: number, color: string, linea: string, rot = 0) {
  c.save(); c.translate(x, base); c.rotate(rot); c.scale(s, s);
  c.strokeStyle = color; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-30, 0); c.lineTo(-30, -60); c.lineTo(30, -60); c.lineTo(30, 0);
  c.moveTo(-30, -60); c.lineTo(-30, -130); c.moveTo(-30, -110); c.lineTo(-30 + 8, -110);
  c.stroke();
  c.strokeStyle = linea; c.lineWidth = 2;
  c.strokeRect(-34, -64, 68, 8);
  c.restore();
}

/** Muebles apilados: la barricada que tapa una puerta del presente (va delante de la pared). */
export function barricada(c: Ctx, w: number, h: number) {
  const b = h - 4;
  // un colchon apoyado en diagonal
  c.save(); c.translate(w * 0.6, b); c.rotate(-0.22);
  c.fillStyle = NOCHE.tela; c.fillRect(-w * 0.22, -h * 0.85, w * 0.4, h * 0.85);
  c.strokeStyle = NOCHE.linea; c.lineWidth = 3; c.strokeRect(-w * 0.22, -h * 0.85, w * 0.4, h * 0.85);
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-w * 0.22, -h * 0.14 * i); c.lineTo(w * 0.18, -h * 0.14 * i); c.stroke(); }
  c.restore();
  caja(c, w * 0.04, b - 120, w * 0.4, 120, NOCHE.caja, NOCHE.linea);
  caja(c, w * 0.52, b - 100, w * 0.44, 100, NOCHE.madera2, NOCHE.linea, 0.04);
  caja(c, w * 0.1, b - 205, w * 0.32, 85, NOCHE.madera2, NOCHE.linea, -0.06);
  silla(c, w * 0.8, b - 100, 1.1, '#3a3027', NOCHE.linea, Math.PI + 0.2);
  silla(c, w * 0.28, b - 205, 0.9, '#2d251e', NOCHE.linea, 0.15);
}

/** Empapelado de la casa, de noche. TILEABLE en las dos direcciones. */
export function paredPresente(c: Ctx, w: number, h: number) {
  c.fillStyle = '#121921'; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += w / 16) {
    c.fillStyle = 'rgba(160,180,198,0.05)'; c.fillRect(x, 0, w / 48, h);
  }
  // un motivo de flores gastadas, repetido
  c.strokeStyle = 'rgba(160,180,198,0.07)'; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = (i + 0.5) * w / 4 + (j % 2) * w / 8, y = (j + 0.5) * h / 4;
    c.beginPath(); c.arc(x, y, w / 40, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; c.beginPath(); c.ellipse(x + Math.cos(a) * w / 26, y + Math.sin(a) * w / 26, w / 70, w / 110, a, 0, Math.PI * 2); c.stroke(); }
  }
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 20; i++) c.fillRect(hash(i) * w, hash(i + 4) * h, 2 + hash(i + 7) * 30, 2);
}

/** Pared de cal del recuerdo, a la siesta. TILEABLE. */
export function paredRecuerdo(c: Ctx, w: number, h: number) {
  c.fillStyle = '#f1e6cc'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(150,120,80,${0.04 + hash(i) * 0.08})`;
    c.beginPath(); c.ellipse(hash(i * 2.1) * w, hash(i * 3.7) * h, 10 + hash(i + 3) * 40, 3 + hash(i + 5) * 10, hash(i) * 3, 0, Math.PI * 2); c.fill();
  }
  // descascarado
  c.fillStyle = 'rgba(163,110,70,0.22)';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(hash(i * 9) * w, hash(i * 5) * h, 16 + hash(i) * 24, 8 + hash(i + 1) * 12, 0, 0, Math.PI * 2); c.fill(); }
}

/** Una puerta de la casa, cerrada, vista de frente (la hoja sola). */
export function puertaCasa(c: Ctx, w: number, h: number, epoca: 'presente' | 'recuerdo', conSilla = false) {
  const rec = epoca === 'recuerdo';
  c.fillStyle = rec ? '#7d6a4a' : NOCHE.madera; c.fillRect(0, 0, w, h);
  c.strokeStyle = rec ? '#4b3923' : NOCHE.linea; c.lineWidth = 4;
  c.strokeRect(2, 2, w - 4, h - 4);
  c.strokeRect(w * 0.14, h * 0.07, w * 0.72, h * 0.38); c.strokeRect(w * 0.14, h * 0.52, w * 0.72, h * 0.4);
  if (rec) {
    // un postigo: tablitas
    c.strokeStyle = 'rgba(75,57,35,0.5)'; c.lineWidth = 2;
    for (let y = h * 0.1; y < h * 0.44; y += 12) { c.beginPath(); c.moveTo(w * 0.16, y); c.lineTo(w * 0.84, y); c.stroke(); }
  }
  c.fillStyle = rec ? '#3b2f25' : 'rgba(200,190,150,0.7)';
  c.beginPath(); c.arc(w * 0.82, h * 0.5, 7, 0, Math.PI * 2); c.fill();
  if (conSilla) silla(c, w * 0.62, h, 1.25, '#3a3027', NOCHE.linea, -0.45);
}

/** Trastos apilados: el borde del mundo, del lado del presente (el fondo del cuarto). */
export function trastos(c: Ctx, w: number, h: number) {
  const b = h - 4;
  // un ropero
  c.fillStyle = NOCHE.madera; c.fillRect(w * 0.1, h * 0.12, w * 0.5, b - h * 0.12);
  c.strokeStyle = NOCHE.linea; c.lineWidth = 4; c.strokeRect(w * 0.1, h * 0.12, w * 0.5, b - h * 0.12);
  c.beginPath(); c.moveTo(w * 0.35, h * 0.12); c.lineTo(w * 0.35, b); c.stroke();
  c.fillStyle = 'rgba(160,180,198,0.3)'; c.fillRect(w * 0.31, h * 0.5, 5, 30); c.fillRect(w * 0.38, h * 0.5, 5, 30);
  // cajas encima y al lado
  caja(c, w * 0.12, h * 0.02, w * 0.3, h * 0.1, NOCHE.caja, NOCHE.linea, 0.05);
  caja(c, w * 0.58, b - 140, w * 0.36, 140, NOCHE.caja, NOCHE.linea);
  caja(c, w * 0.62, b - 250, w * 0.28, 110, NOCHE.madera2, NOCHE.linea, -0.08);
  silla(c, w * 0.78, b - 250, 0.8, '#2d251e', NOCHE.linea, 0.3);
}

/** Un ropero de los tios: el borde del mundo, del lado del recuerdo. */
export function ropero(c: Ctx, w: number, h: number) {
  const b = h - 4;
  c.fillStyle = SIESTA.madera; c.fillRect(w * 0.15, h * 0.1, w * 0.7, b - h * 0.1);
  c.strokeStyle = SIESTA.linea; c.lineWidth = 4; c.strokeRect(w * 0.15, h * 0.1, w * 0.7, b - h * 0.1);
  c.beginPath(); c.moveTo(w / 2, h * 0.1); c.lineTo(w / 2, b); c.stroke();
  // espejo en una puerta
  c.fillStyle = '#fff8e8'; c.fillRect(w * 0.2, h * 0.2, w * 0.25, h * 0.45);
  c.strokeStyle = SIESTA.linea; c.lineWidth = 2; c.strokeRect(w * 0.2, h * 0.2, w * 0.25, h * 0.45);
  c.fillStyle = SIESTA.linea; c.fillRect(w * 0.46, h * 0.5, 4, 24); c.fillRect(w * 0.52, h * 0.5, 4, 24);
  // una valija arriba
  caja(c, w * 0.22, h * 0.02, w * 0.5, h * 0.08, '#7a5236', SIESTA.linea);
}

/** El porton del fondo del patio. 2 cuadros: cerrado, abierto. */
export function porton(c: Ctx, w: number, h: number, cuadro: number) {
  const b = h - 4;
  c.fillStyle = SIESTA.cal; c.globalAlpha = 0.9;
  c.fillRect(0, h * 0.1, w * 0.12, b - h * 0.1); c.fillRect(w * 0.88, h * 0.1, w * 0.12, b - h * 0.1);
  c.globalAlpha = 1;
  c.fillStyle = 'rgba(40,30,20,0.5)';
  for (let i = 0; i < 6; i++) { c.fillRect(hash(i) * w * 0.1, h * 0.2 + hash(i + 1) * h * 0.6, 12, 6); c.fillRect(w * 0.9 + hash(i + 3) * w * 0.08, h * 0.2 + hash(i + 5) * h * 0.6, 12, 6); }
  c.strokeStyle = '#1c1916'; c.lineWidth = 5;
  const hoja = (x0: number, x1: number) => {
    c.strokeRect(Math.min(x0, x1), h * 0.2, Math.abs(x1 - x0), b - h * 0.2 - 10);
    for (let i = 1; i < 7; i++) { const x = x0 + (x1 - x0) * i / 7; c.beginPath(); c.moveTo(x, h * 0.2); c.lineTo(x, b - 10); c.stroke(); }
    c.beginPath(); c.moveTo(x0, h * 0.55); c.lineTo(x1, h * 0.55); c.stroke();
  };
  if (cuadro === 0) { hoja(w * 0.12, w * 0.5); hoja(w * 0.5, w * 0.88); c.fillStyle = '#1c1916'; c.fillRect(w * 0.47, h * 0.52, w * 0.06, h * 0.08); }
  else { hoja(w * 0.12, w * 0.2); hoja(w * 0.8, w * 0.88); }
}

/** La hoja de la puerta del piano: con la silla trabandola (cuadro 1) o suelta (cuadro 2). */
export function puertaTrabada(c: Ctx, w: number, h: number, cuadro: number) {
  puertaCasa(c, w, h, 'presente', cuadro === 0);
}

// ---------------------------------------------------------------- lo que cada una le da

/** El espejito de mano de Mariela. */
export function espejo(c: Ctx, w: number, h: number) {
  c.save(); c.translate(w / 2, h / 2); c.rotate(-0.5);
  c.fillStyle = '#0a0a0b';
  c.fillRect(-w * 0.05, h * 0.08, w * 0.1, h * 0.38);
  c.beginPath(); c.ellipse(0, -h * 0.12, w * 0.24, h * 0.28, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#0a0a0b'; c.lineWidth = w * 0.04;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * w * 0.26, -h * 0.12 + Math.sin(a) * h * 0.3, w * 0.035, 0, Math.PI * 2); c.stroke(); }
  c.restore();
}

/** La llave de la madre: la de la puerta de calle, grande, antigua. */
export function llave(c: Ctx, w: number, h: number) {
  c.save(); c.translate(w / 2, h / 2); c.rotate(0.6);
  c.fillStyle = '#0a0a0b'; c.strokeStyle = '#0a0a0b';
  c.lineWidth = w * 0.07;
  c.beginPath(); c.arc(0, -h * 0.25, w * 0.15, 0, Math.PI * 2); c.stroke();
  c.fillRect(-w * 0.035, -h * 0.12, w * 0.07, h * 0.5);
  c.fillRect(0, h * 0.26, w * 0.14, h * 0.05); c.fillRect(0, h * 0.34, w * 0.1, h * 0.05);
  c.restore();
}

/** El rosario de la abuela, con su crucecita. */
export function rosario(c: Ctx, w: number, h: number) {
  c.fillStyle = '#0a0a0b';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    c.beginPath(); c.arc(w / 2 + Math.cos(a) * w * 0.28, h * 0.38 + Math.sin(a) * h * 0.24, w * 0.028, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w / 2, h * 0.64 + i * h * 0.045, w * 0.026, 0, Math.PI * 2); c.fill(); }
  c.fillRect(w / 2 - w * 0.02, h * 0.8, w * 0.04, h * 0.16);
  c.fillRect(w / 2 - w * 0.07, h * 0.85, w * 0.14, h * 0.035);
}

// ---------------------------------------------------------------- sombras y cabezas

type Pelo = 'melena' | 'rodete' | 'panuelo' | 'canoso' | 'largo' | 'rubia';

/** Una cabeza de perfil (mirando a la derecha), lista para ser sombra. */
export function cabezaPerfil(c: Ctx, w: number, h: number, pelo: Pelo) {
  const cx = w * 0.5, cy = h * 0.5, r = w * 0.22;
  c.fillStyle = '#0a0a0b';
  // cuello
  c.beginPath(); c.moveTo(cx - r * 0.4, cy + r * 0.6); c.lineTo(cx - r * 0.55, h); c.lineTo(cx + r * 0.45, h); c.lineTo(cx + r * 0.3, cy + r * 0.7); c.fill();
  // craneo y cara: nariz, labios, menton
  c.beginPath();
  c.moveTo(cx - r * 0.9, cy);
  c.bezierCurveTo(cx - r * 0.95, cy - r * 1.3, cx + r * 0.8, cy - r * 1.35, cx + r * 0.95, cy - r * 0.25);
  c.lineTo(cx + r * 1.2, cy + r * 0.05);
  c.lineTo(cx + r * 0.95, cy + r * 0.2);
  c.quadraticCurveTo(cx + r * 1.05, cy + r * 0.4, cx + r * 0.9, cy + r * 0.55);
  c.quadraticCurveTo(cx + r * 0.9, cy + r * 0.85, cx + r * 0.5, cy + r * 0.9);
  c.quadraticCurveTo(cx - r * 0.4, cy + r * 0.9, cx - r * 0.9, cy);
  c.fill();
  // el pelo: lo que la hace reconocible
  if (pelo === 'melena' || pelo === 'rubia') {
    c.beginPath();
    c.moveTo(cx + r * 0.7, cy - r * 0.9);
    c.bezierCurveTo(cx, cy - r * 1.6, cx - r * 1.5, cy - r * 1.1, cx - r * 1.25, cy + r * 0.9);
    c.lineTo(cx - r * 0.2, cy + r * 0.8);
    c.quadraticCurveTo(cx - r * 0.1, cy - r * 0.3, cx + r * 0.7, cy - r * 0.9);
    c.fill();
  } else if (pelo === 'rodete') {
    c.beginPath(); c.arc(cx - r * 0.95, cy - r * 0.75, r * 0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(cx - r * 0.1, cy - r * 0.75, r * 1.0, r * 0.55, -0.2, Math.PI, 0); c.fill();
  } else if (pelo === 'panuelo') {
    c.beginPath();
    c.moveTo(cx + r * 0.85, cy - r * 0.3);
    c.bezierCurveTo(cx + r * 0.5, cy - r * 1.7, cx - r * 1.4, cy - r * 1.5, cx - r * 1.1, cy + r * 0.3);
    c.lineTo(cx - r * 0.6, cy + r * 0.7);
    c.fill();
    // el nudo y las puntas en la nuca
    c.beginPath(); c.moveTo(cx - r * 1.05, cy + r * 0.2); c.lineTo(cx - r * 1.7, cy + r * 0.8); c.lineTo(cx - r * 1.2, cy + r * 0.75); c.lineTo(cx - r * 1.5, cy + r * 1.2); c.lineTo(cx - r * 0.8, cy + r * 0.6); c.fill();
  } else if (pelo === 'canoso') {
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(cx - r * 0.3 + rc(i, 2) * r * 0.9, cy - r * 0.9 + rc(4, i) * r * 0.4, r * 0.45, 0, Math.PI * 2); c.fill(); }
  } else {
    c.beginPath(); c.moveTo(cx + r * 0.6, cy - r); c.bezierCurveTo(cx - r, cy - r * 1.6, cx - r * 1.4, cy, cx - r * 1.1, cy + r * 2.2); c.lineTo(cx - r * 0.5, cy + r * 1.8); c.fill();
  }
}

/** Una sombra de cuerpo entero, larga, como la que proyecta una vela baja. 4 cuadros de temblor. */
export function sombraCuerpo(c: Ctx, w: number, h: number, cuadro: number, total: number, pose: 'pie' | 'manos_boca' | 'rezo' | 'brazos_arriba', pelo: Pelo) {
  const t = (cuadro / total) * Math.PI * 2;
  const tiembla = pose === 'brazos_arriba' ? 0.4 : 1;
  c.save();
  c.translate(w / 2 + Math.sin(t * 2) * 3 * tiembla, 0);
  c.filter = 'blur(1.5px)';
  c.fillStyle = '#0a0a0b';
  const cab = h * 0.14, hombro = h * 0.24;
  const encorva = pose === 'rezo' ? 0.18 : 0;
  // el cuerpo: largo, se afina hacia los pies
  c.beginPath();
  c.moveTo(-w * 0.18, hombro);
  c.quadraticCurveTo(-w * 0.26, h * 0.6, -w * 0.12, h);
  c.lineTo(w * 0.12, h);
  c.quadraticCurveTo(w * 0.26 + encorva * w, h * 0.6, w * 0.16 + encorva * w * 0.5, hombro);
  c.closePath(); c.fill();
  // la cabeza con su pelo
  c.save(); c.translate(encorva * w * 0.6, 0);
  c.translate(-w * 0.4, cab - w * 0.4);
  cabezaPerfil(c, w * 0.8, w * 0.8, pelo);
  c.restore();
  // los brazos, segun la pose
  c.strokeStyle = '#0a0a0b'; c.lineCap = 'round'; c.lineWidth = w * 0.07;
  c.beginPath();
  if (pose === 'manos_boca') { c.moveTo(w * 0.1, hombro + 10); c.quadraticCurveTo(w * 0.3, hombro + h * 0.1, w * 0.1, cab + 16 + Math.sin(t * 3) * 3); }
  else if (pose === 'rezo') { c.moveTo(w * 0.12, hombro + 10); c.quadraticCurveTo(w * 0.36, hombro + h * 0.12, w * 0.3, hombro + h * 0.05 + Math.sin(t * 3) * 3); }
  else if (pose === 'brazos_arriba') {
    c.moveTo(-w * 0.12, hombro); c.quadraticCurveTo(-w * 0.34, hombro - h * 0.08, -w * 0.3 + Math.sin(t) * 6, hombro - h * 0.2);
    c.moveTo(w * 0.12, hombro); c.quadraticCurveTo(w * 0.34, hombro - h * 0.08, w * 0.3 - Math.sin(t) * 6, hombro - h * 0.2);
  } else { c.moveTo(w * 0.1, hombro + 8); c.quadraticCurveTo(w * 0.24, h * 0.4, w * 0.18, h * 0.52); }
  c.stroke();
  c.restore();
}
