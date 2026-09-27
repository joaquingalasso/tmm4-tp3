import { hash, rc } from '../config';

/**
 * ESCENOGRAFIA — placeholders de objetos, telones y fondos del prologo.
 * Mismo criterio que pintura.ts: medidas y encuadre correctos, dibujo provisorio.
 */

type Ctx = CanvasRenderingContext2D;

const NOCHE = { pared: '#0e141b', pared2: '#121a23', madera: '#0a0e13', linea: '#05070a', borde: 'rgba(160,180,198,0.25)', vidrio: '#16222f' };
const SIESTA = { pared: '#ecdcb8', pared2: '#e2cfa6', madera: '#7a5a3a', linea: '#4b3923', cal: '#f6efe0', ladrillo: '#a3583c', verde: '#7f8c5c', verdeOsc: '#55603c', cielo: '#fbf4e2' };

// ---------------------------------------------------------------- objetos del presente

export function cama(c: Ctx, w: number, h: number) {
  c.fillStyle = NOCHE.madera;
  c.fillRect(0, h * 0.45, w, h * 0.35); c.fillRect(0, 0, w * 0.05, h); c.fillRect(w * 0.95, h * 0.25, w * 0.05, h * 0.75);
  c.fillStyle = '#1d2733'; c.fillRect(w * 0.04, h * 0.33, w * 0.92, h * 0.16);
  c.fillStyle = '#2a3542'; c.beginPath(); c.ellipse(w * 0.16, h * 0.32, w * 0.1, h * 0.08, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = NOCHE.borde; c.lineWidth = 2; c.strokeRect(1, h * 0.33, w - 2, h * 0.47);
}

export function velador(c: Ctx, w: number, h: number, cuadro: number) {
  c.fillStyle = '#0c1117'; c.fillRect(w * 0.1, h * 0.55, w * 0.8, h * 0.45);
  c.fillStyle = cuadro % 2 ? '#e6c98e' : '#dcbc7c';
  c.beginPath(); c.moveTo(w * 0.25, h * 0.1); c.lineTo(w * 0.75, h * 0.1); c.lineTo(w * 0.88, h * 0.38); c.lineTo(w * 0.12, h * 0.38); c.closePath(); c.fill();
  c.fillStyle = '#0c1117'; c.fillRect(w * 0.46, h * 0.38, w * 0.08, h * 0.17);
}

export function tele(c: Ctx, w: number, h: number, cuadro: number) {
  c.fillStyle = '#080b0f'; c.fillRect(0, 0, w, h * 0.8); c.fillRect(w * 0.35, h * 0.8, w * 0.3, h * 0.2);
  c.fillStyle = '#3a4a5c';
  c.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.62);
  for (let i = 0; i < 260; i++) {
    const v = hash(i * 7.3 + cuadro * 31) * 200;
    c.fillStyle = `rgb(${v * 0.7},${v * 0.8},${v})`;
    c.fillRect(w * 0.08 + hash(i + cuadro) * w * 0.84, h * 0.08 + hash(i * 2 + cuadro) * h * 0.62, 3, 2);
  }
}

export function piano(c: Ctx, w: number, h: number) {
  c.fillStyle = '#07090c';
  c.fillRect(0, h * 0.05, w, h * 0.95);
  c.fillStyle = '#0f141a'; c.fillRect(w * 0.05, h * 0.45, w * 0.9, h * 0.1);
  c.fillStyle = '#c9c4b8';
  for (let i = 0; i < 26; i++) c.fillRect(w * 0.06 + i * w * 0.034, h * 0.47, w * 0.03, h * 0.07);
  c.fillStyle = '#07090c';
  for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) c.fillRect(w * 0.08 + i * w * 0.034, h * 0.47, w * 0.016, h * 0.04);
  c.strokeStyle = NOCHE.borde; c.lineWidth = 2; c.strokeRect(1, h * 0.05, w - 2, h * 0.95 - 1);
}

export function marcoPuerta(c: Ctx, w: number, h: number, epoca: 'presente' | 'recuerdo') {
  c.fillStyle = epoca === 'presente' ? NOCHE.madera : SIESTA.madera;
  const g = w * 0.15;
  c.fillRect(0, 0, g, h); c.fillRect(w - g, 0, g, h); c.fillRect(0, 0, w, g);
  c.strokeStyle = epoca === 'presente' ? NOCHE.borde : 'rgba(75,57,35,0.8)'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
}

/** La puerta de calle. 2 cuadros: cerrada, abierta (afuera, la noche del patio). */
export function puertaCalle(c: Ctx, w: number, h: number, cuadro = 0) {
  c.strokeStyle = '#1c242e'; c.lineWidth = w * 0.08;
  c.strokeRect(w * 0.06, h * 0.04, w * 0.88, h * 0.95);
  if (cuadro === 0) {
    c.fillStyle = '#131b25'; c.fillRect(w * 0.1, h * 0.06, w * 0.8, h * 0.92);
    c.strokeStyle = 'rgba(160,180,198,0.25)'; c.lineWidth = 3;
    c.strokeRect(w * 0.2, h * 0.14, w * 0.6, h * 0.3); c.strokeRect(w * 0.2, h * 0.52, w * 0.6, h * 0.38);
    c.fillStyle = '#9fb1bf'; c.beginPath(); c.arc(w * 0.78, h * 0.55, 5, 0, Math.PI * 2); c.fill();
  } else {
    const g = c.createLinearGradient(0, h * 0.06, 0, h);
    g.addColorStop(0, '#0e1a26'); g.addColorStop(1, '#070b10');
    c.fillStyle = g; c.fillRect(w * 0.1, h * 0.06, w * 0.8, h * 0.92);
    c.fillStyle = '#b8c4cc'; c.beginPath(); c.arc(w * 0.62, h * 0.2, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a0e13';
    for (let i = 0; i < 9; i++) c.fillRect(w * 0.1 + i * w * 0.09, h * 0.7 - hash(i) * h * 0.2, 4, h * 0.3);
    // la hoja abierta, de canto
    c.fillStyle = '#131b25'; c.fillRect(w * 0.1, h * 0.06, w * 0.12, h * 0.92);
  }
}

/** El aljibe. Del presente: descascarado, el ladrillo a la vista, entre pastos. Del recuerdo: blanco de cal. */
export function aljibe(c: Ctx, w: number, h: number, epoca: 'presente' | 'recuerdo') {
  const cx = w / 2, base = h - 6, s = w / 260;
  c.save();
  c.translate(cx, base);
  c.scale(s, s);
  const cal = epoca === 'recuerdo' ? SIESTA.cal : '#b9b3a6';
  c.fillStyle = cal;
  c.beginPath(); c.moveTo(-90, 0); c.lineTo(-90, -84); c.quadraticCurveTo(0, -104, 90, -84); c.lineTo(90, 0); c.quadraticCurveTo(0, 16, -90, 0); c.fill();
  if (epoca === 'presente') {
    c.fillStyle = SIESTA.ladrillo;
    for (let i = 0; i < 16; i++) c.fillRect(-80 + hash(i * 3.1) * 150, -74 + hash(i * 5.7) * 64, 16 + hash(i) * 14, 7);
    c.fillStyle = '#39422c';
    for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(-100 + i * 8, 4); c.lineTo(-96 + i * 8 + rc(i, 1) * 6, -30 - hash(i) * 40); c.lineTo(-92 + i * 8, 4); c.fill(); }
  }
  c.fillStyle = '#020304';
  c.beginPath(); c.ellipse(0, -86, 86, 15, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = epoca === 'recuerdo' ? '#fffaf0' : '#d8d3c7'; c.lineWidth = 4;
  c.beginPath(); c.ellipse(0, -86, 88, 16, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = epoca === 'recuerdo' ? '#5a4632' : '#0a0d10'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(-78, -86); c.quadraticCurveTo(0, -260, 78, -86); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.moveTo(0, -196); c.lineTo(0, -150); c.stroke();
  c.restore();
}

/** El altar con San La Muerte: el esqueleto con la guadana y lucecitas de guirnalda en las cuencas. */
export function altar(c: Ctx, w: number, h: number, cuadro: number, epoca: 'presente' | 'recuerdo') {
  const osc = epoca === 'presente';
  c.fillStyle = osc ? '#0b0f14' : '#6f5234';
  c.fillRect(w * 0.05, h * 0.62, w * 0.9, h * 0.38);
  // ofrendas: escarpines, estampitas, rosarios, flores secas
  for (let i = 0; i < 12; i++) {
    c.fillStyle = ['#c9c2b3', '#8a3a2a', '#d8c79a', '#6a7a5a'][i % 4];
    c.fillRect(w * 0.08 + i * w * 0.07, h * 0.58 - hash(i) * h * 0.06, w * 0.05, h * 0.05 + hash(i + 1) * h * 0.03);
  }
  // el esqueleto
  const hueso = osc ? '#d8d2c4' : '#f4ecda';
  const cx = w / 2, top = h * (osc ? 0.02 : 0.18), escala = osc ? 1 : 0.7;
  c.strokeStyle = hueso; c.fillStyle = hueso; c.lineWidth = 6 * escala;
  const hy = top + h * 0.1 * escala;
  c.beginPath(); c.ellipse(cx, hy, w * 0.11 * escala, h * 0.075 * escala, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(cx, hy + h * 0.07 * escala); c.lineTo(cx, h * 0.6); c.stroke();
  for (let i = 0; i < 5; i++) { const y = hy + h * (0.12 + i * 0.05) * escala; c.beginPath(); c.moveTo(cx - w * 0.1 * escala, y); c.quadraticCurveTo(cx, y + 8, cx + w * 0.1 * escala, y); c.stroke(); }
  c.beginPath(); c.moveTo(cx, hy + h * 0.12 * escala); c.lineTo(cx + w * 0.22 * escala, hy + h * 0.2 * escala); c.lineTo(cx + w * 0.3 * escala, h * 0.6); c.stroke();
  c.beginPath(); c.moveTo(cx + w * 0.3 * escala, h * 0.6); c.lineTo(cx + w * 0.3 * escala, top); c.stroke();
  c.beginPath(); c.moveTo(cx + w * 0.3 * escala, top); c.quadraticCurveTo(cx + w * 0.05, top - h * 0.02, cx - w * 0.05 * escala, top + h * 0.1 * escala); c.stroke();
  // cuencas negras y la sonrisa
  c.fillStyle = '#020304';
  c.beginPath(); c.arc(cx - w * 0.04 * escala, hy - h * 0.01, w * 0.03 * escala, 0, Math.PI * 2); c.arc(cx + w * 0.04 * escala, hy - h * 0.01, w * 0.03 * escala, 0, Math.PI * 2); c.fill();
  c.lineWidth = 2; c.strokeStyle = '#020304';
  c.beginPath(); c.moveTo(cx - w * 0.06 * escala, hy + h * 0.04 * escala); c.quadraticCurveTo(cx, hy + h * 0.065 * escala, cx + w * 0.06 * escala, hy + h * 0.04 * escala); c.stroke();
  // lucecitas intermitentes en las cuencas
  if (cuadro % 2 === 0) {
    for (const [dx, col] of [[-1, '#f23a2a'], [1, '#3ac25a']] as const) {
      c.fillStyle = col;
      c.beginPath(); c.arc(cx + dx * w * 0.04 * escala, hy - h * 0.01, w * 0.013 * escala + 2, 0, Math.PI * 2); c.fill();
    }
  }
}

// ---------------------------------------------------------------- objetos del recuerdo

export function ventilador(c: Ctx, w: number, h: number, cuadro: number) {
  c.strokeStyle = SIESTA.linea; c.lineWidth = 4;
  c.beginPath(); c.moveTo(w / 2, h * 0.3); c.lineTo(w / 2, h); c.moveTo(w * 0.2, h - 2); c.lineTo(w * 0.8, h - 2); c.stroke();
  c.fillStyle = 'rgba(122,90,58,0.3)';
  c.beginPath(); c.arc(w / 2, h * 0.22, w * 0.45, 0, Math.PI * 2); c.fill();
  c.strokeStyle = SIESTA.linea; c.lineWidth = 2; c.stroke();
  c.fillStyle = SIESTA.madera;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + cuadro * 0.9;
    c.beginPath(); c.ellipse(w / 2 + Math.cos(a) * w * 0.2, h * 0.22 + Math.sin(a) * w * 0.2, w * 0.18, w * 0.07, a, 0, Math.PI * 2); c.fill();
  }
}

export function mesaMandarinas(c: Ctx, w: number, h: number) {
  c.fillStyle = SIESTA.madera; c.fillRect(0, h * 0.35, w, h * 0.08); c.fillRect(w * 0.08, h * 0.4, w * 0.05, h * 0.6); c.fillRect(w * 0.87, h * 0.4, w * 0.05, h * 0.6);
  c.fillStyle = '#f1e7cf'; c.fillRect(w * 0.05, h * 0.3, w * 0.9, h * 0.06);
  for (let i = 0; i < 7; i++) { c.fillStyle = i % 3 ? '#e08a2c' : '#cf7a22'; c.beginPath(); c.arc(w * 0.25 + i * w * 0.08, h * 0.26 - (i % 2) * 6, w * 0.035, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#e8a050'; c.lineWidth = 3;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w * 0.72 + i * 10, h * 0.3, 6, 0.2, 2.6); c.stroke(); }
}

export function banqueta(c: Ctx, w: number, h: number) {
  c.fillStyle = SIESTA.madera; c.fillRect(0, 0, w, h * 0.15);
  c.fillRect(w * 0.1, h * 0.15, w * 0.1, h * 0.85); c.fillRect(w * 0.8, h * 0.15, w * 0.1, h * 0.85);
}

export function sillon(c: Ctx, w: number, h: number) {
  c.fillStyle = '#9a6f4a';
  c.fillRect(w * 0.05, h * 0.2, w * 0.9, h * 0.5);
  c.fillStyle = '#b58660';
  c.fillRect(0, h * 0.45, w, h * 0.3); c.fillRect(0, h * 0.25, w * 0.14, h * 0.5); c.fillRect(w * 0.86, h * 0.25, w * 0.14, h * 0.5);
  c.fillStyle = SIESTA.madera; c.fillRect(w * 0.06, h * 0.75, w * 0.06, h * 0.25); c.fillRect(w * 0.88, h * 0.75, w * 0.06, h * 0.25);
}

export function planta(c: Ctx, w: number, h: number, epoca: 'presente' | 'recuerdo', sem: number) {
  const tallo = epoca === 'recuerdo' ? SIESTA.verdeOsc : '#070b0f';
  const hoja = epoca === 'recuerdo' ? SIESTA.verde : '#0a1015';
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i / 8 - 0.5) * 1.3 + (hash(sem + i) - 0.5) * 0.3;
    const l = h * (0.55 + hash(sem + i * 3) * 0.42);
    const ex = w / 2 + Math.cos(a) * l, ey = h + Math.sin(a) * l;
    c.strokeStyle = tallo; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(w / 2, h); c.quadraticCurveTo(w / 2 + Math.cos(a) * l * 0.4, h + Math.sin(a) * l * 0.6, ex, ey); c.stroke();
    c.fillStyle = hoja;
    for (let k = 3; k <= 10; k++) {
      const u = k / 10;
      const px = w / 2 + (ex - w / 2) * u, py = h + (ey - h) * u;
      c.beginPath(); c.ellipse(px + (k % 2 ? 5 : -5), py, 5 + hash(k + i) * 3, 3, a + (k % 2 ? 0.9 : -0.9), 0, Math.PI * 2); c.fill();
    }
    if (epoca === 'recuerdo' && i % 3 === 0) { c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(ex, ey, 7, 0, Math.PI * 2); c.fill(); }
    if (epoca === 'presente' && i % 4 === 0) { c.fillStyle = '#3a2226'; c.beginPath(); c.arc(ex, ey, 6, 0, Math.PI * 2); c.fill(); }
  }
}

// ---------------------------------------------------------------- telones

export interface Mapa { X: (x: number) => number; Y: (y: number) => number; w: number; h: number; }

/** El presente: la casa de noche, y al final el patio de la Senora veinte anos despues. */
export function telonPresente(c: Ctx, m: Mapa) {
  const { X, Y, w, h } = m;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#020305'); g.addColorStop(1, '#070a0e');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const techo = Y(780), piso = Y(0), finCasa = X(5300);
  c.fillStyle = NOCHE.pared; c.fillRect(X(-600), techo, finCasa - X(-600), piso - techo);
  c.fillStyle = 'rgba(200,214,228,0.02)';
  for (let x = X(-600); x < finCasa; x += 18) c.fillRect(x, techo, 6, piso - techo);
  for (const x of [1450, 2950, 4450]) { c.fillStyle = '#05080b'; c.fillRect(X(x) - 16, techo, 32, piso - techo); }
  // el dormitorio: la ventana con lluvia y, en el techo, la mancha con cara de diablo
  ventanaNoche(c, X(420), Y(600), X(560) - X(420), Y(360) - Y(600));
  c.fillStyle = '#05070a';
  c.beginPath(); c.ellipse(X(300), Y(730), 40, 16, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(X(270), Y(740)); c.lineTo(X(262), Y(772)); c.lineTo(X(284), Y(744)); c.moveTo(X(330), Y(740)); c.lineTo(X(338), Y(772)); c.lineTo(X(316), Y(744)); c.fill();
  // el pasillo: el retrato del abuelo que nunca conocio
  c.fillStyle = '#0a0e13'; c.fillRect(X(2150), Y(620), X(2330) - X(2150), Y(380) - Y(620));
  c.fillStyle = '#1a222b'; c.beginPath(); c.ellipse(X(2240), Y(520), 24, 32, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#000'; c.fillRect(X(2230), Y(528), 5, 5); c.fillRect(X(2246), Y(528), 5, 5);
  // el living: ventana con cortina
  ventanaNoche(c, X(3600), Y(620), X(3780) - X(3600), Y(380) - Y(620));
  c.fillStyle = 'rgba(170,176,182,0.45)'; c.fillRect(X(3590), Y(630), 40, Y(370) - Y(630)); c.fillRect(X(3750), Y(630), 40, Y(370) - Y(630));
  // cuadros torcidos
  for (const x of [900, 1800, 3200, 4800]) {
    c.save(); c.translate(X(x), Y(520)); c.rotate((hash(x) - 0.5) * 0.14);
    c.strokeStyle = 'rgba(200,214,228,0.14)'; c.lineWidth = 3; c.strokeRect(-26, -34, 52, 68); c.restore();
  }
  c.fillStyle = '#07090c'; c.fillRect(X(-600), piso - 10, finCasa - X(-600), 10);
  c.fillStyle = '#080b0f'; c.fillRect(0, piso, w, h - piso);
  // el patio de la Senora, hoy: tapia, rosas muertas, ruda crecida hasta alturas insolitas, la luna
  c.fillStyle = '#0a0f15'; c.fillRect(finCasa, Y(360), X(8200) - finCasa, piso - Y(360));
  c.fillStyle = '#0c1219'; c.fillRect(X(5700), Y(700), X(6100) - X(5700), piso - Y(700));
  c.fillStyle = '#04060a'; c.fillRect(X(5840), Y(420), X(5960) - X(5840), piso - Y(420));
  for (let i = 0; i < 18; i++) {
    c.save(); c.translate(X(5350 + i * 150) - 40, Y(360) - 110);
    planta(c, 80, 110, 'presente', i * 3);
    c.restore();
  }
  c.fillStyle = '#8c9aa6'; c.beginPath(); c.arc(X(6900), Y(1350), 34, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#020305'; c.beginPath(); c.arc(X(6888), Y(1358), 33, 0, Math.PI * 2); c.fill();
}

function ventanaNoche(c: Ctx, x: number, y: number, w: number, h: number) {
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#16222f'); g.addColorStop(1, '#0a1119');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(160,180,200,0.18)'; c.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const rx = x + hash(i * 3.7) * w, ry = y + hash(i) * h; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 2, ry + 9); c.stroke(); }
  c.fillStyle = '#05080b';
  c.fillRect(x - 4, y - 4, w + 8, 4); c.fillRect(x - 4, y + h, w + 8, 5); c.fillRect(x - 4, y, 4, h); c.fillRect(x + w, y, 4, h);
  c.fillRect(x + w / 2 - 2, y, 4, h); c.fillRect(x, y + h / 2 - 2, w, 4);
}

/**
 * El recuerdo: una siesta en Corrientes, como una foto vieja pasada de luz.
 * La casa de los tios, la vereda caminando con la tia, y el patio de la Senora,
 * "un poco demasiado recargado de plantas".
 */
export function telonRecuerdo(c: Ctx, m: Mapa) {
  const { X, Y, w, h } = m;
  c.fillStyle = SIESTA.cielo; c.fillRect(0, 0, w, h);
  const techo = Y(760), piso = Y(0);
  // la casa de los tios (del lado del reves, x crece hacia la izquierda del lienzo)
  c.fillStyle = SIESTA.pared; c.fillRect(X(2250), techo, X(-600) - X(2250), piso - techo);
  c.fillStyle = 'rgba(122,90,58,0.06)';
  for (let x = X(2250); x < X(-600); x += 26) c.fillRect(x, techo, 9, piso - techo);
  for (const x of [600, 1500]) {
    // ventanas que queman de luz
    c.fillStyle = '#fffdf6'; c.fillRect(X(x) - 70, Y(600), 140, Y(360) - Y(600));
    c.strokeStyle = SIESTA.madera; c.lineWidth = 6; c.strokeRect(X(x) - 70, Y(600), 140, Y(360) - Y(600));
    c.fillStyle = 'rgba(122,90,58,0.45)'; for (let k = 0; k < 8; k++) c.fillRect(X(x) - 70, Y(600) + k * 12, 140, 4);
  }
  c.fillStyle = 'rgba(122,90,58,0.4)'; c.fillRect(X(2250), piso - 12, X(-600) - X(2250), 12);
  // la vereda: arboles, casas bajas, el calor pesado antes de la tormenta
  for (let i = 0; i < 6; i++) {
    const x = 2350 + i * 260;
    c.fillStyle = i % 2 ? '#e8d8b2' : '#dfcca2';
    c.fillRect(X(x + 240), Y(420 + hash(i) * 120), 240, piso - Y(420 + hash(i) * 120));
    c.fillStyle = SIESTA.verdeOsc; c.fillRect(X(x + 60) - 6, Y(420), 12, piso - Y(420));
    c.fillStyle = 'rgba(127,140,92,0.8)'; c.beginPath(); c.ellipse(X(x + 60), Y(520), 90, 70, 0, 0, Math.PI * 2); c.fill();
  }
  // el patio de la Senora: pared de cal, puerta al cuarto del altar, plantas por todos lados
  c.fillStyle = SIESTA.cal; c.fillRect(X(8200), Y(640), X(3850) - X(8200), piso - Y(640));
  c.fillStyle = '#5a4632'; c.fillRect(X(5960), Y(560), 120, piso - Y(560));
  c.fillStyle = 'rgba(163,88,60,0.25)'; c.fillRect(X(8200), piso - 14, X(3850) - X(8200), 14);
  for (let i = 0; i < 24; i++) {
    c.save(); c.translate(X(3950 + i * 180) - 50, Y(640) - 130);
    planta(c, 100, 130, 'recuerdo', i * 7);
    c.restore();
  }
  // el cielo blanco de la siesta y una luz que se come los bordes
  const luz = c.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, w * 0.7);
  luz.addColorStop(0, 'rgba(255,253,245,0.6)'); luz.addColorStop(1, 'rgba(255,253,245,0)');
  c.fillStyle = luz; c.fillRect(0, 0, w, h);
  c.fillStyle = '#e4d3ad'; c.fillRect(0, piso, w, h - piso);
}

// ---------------------------------------------------------------- prologo

/** La ruta de noche, tileable en horizontal. */
export function ruta(c: Ctx, w: number, h: number) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#04060a'); g.addColorStop(0.6, '#0b1119'); g.addColorStop(1, '#05070a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(200,214,228,${hash(i) * 0.5})`; c.fillRect(hash(i * 3.1) * w, hash(i * 7.7) * h * 0.45, 1.5, 1.5); }
  c.fillStyle = '#070a0e';
  for (let i = 0; i < 40; i++) { const x = (i / 40) * w; c.beginPath(); c.ellipse(x, h * 0.62, 50 + hash(i) * 60, 18 + hash(i + 2) * 22, 0, Math.PI, 0); c.fill(); }
  c.fillStyle = '#111820'; c.fillRect(0, h * 0.7, w, h * 0.2);
  c.fillStyle = 'rgba(220,210,180,0.35)';
  for (let x = 0; x < w; x += 120) c.fillRect(x, h * 0.795, 60, 4);
}

/** El Renault 12, con la familia adentro. Dos cuadros de traqueteo. */
export function renault(c: Ctx, w: number, h: number, cuadro: number) {
  const bob = cuadro % 2 ? 2 : 0;
  c.save();
  c.translate(0, bob);
  c.fillStyle = '#0d1218';
  c.beginPath();
  c.moveTo(w * 0.04, h * 0.82); c.lineTo(w * 0.04, h * 0.55); c.lineTo(w * 0.24, h * 0.5); c.lineTo(w * 0.34, h * 0.22);
  c.lineTo(w * 0.7, h * 0.22); c.lineTo(w * 0.8, h * 0.5); c.lineTo(w * 0.97, h * 0.56); c.lineTo(w * 0.97, h * 0.82); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(160,180,198,0.4)'; c.lineWidth = 2; c.stroke();
  // ventanas con las siluetas: el padre manejando, la madre, y atras la abuela, la nina apretada, la hermana
  c.fillStyle = '#1a2533';
  c.beginPath(); c.moveTo(w * 0.36, h * 0.27); c.lineTo(w * 0.52, h * 0.27); c.lineTo(w * 0.52, h * 0.48); c.lineTo(w * 0.29, h * 0.48); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(w * 0.54, h * 0.27); c.lineTo(w * 0.68, h * 0.27); c.lineTo(w * 0.76, h * 0.48); c.lineTo(w * 0.54, h * 0.48); c.closePath(); c.fill();
  c.fillStyle = '#05070a';
  for (const [x, r] of [[0.33, 0.07], [0.41, 0.06], [0.48, 0.07], [0.6, 0.075], [0.7, 0.075]] as const) {
    c.beginPath(); c.arc(w * x, h * 0.41, h * r, 0, Math.PI * 2); c.fill();
    c.fillRect(w * x - h * r, h * 0.41, h * r * 2, h * 0.08);
  }
  // la nina, en el medio, mas chiquita y rubia
  c.fillStyle = '#c9a86a'; c.beginPath(); c.arc(w * 0.41, h * 0.4, h * 0.045, 0, Math.PI * 2); c.fill();
  // los anteojos oscuros de la madre y la abuela
  c.fillStyle = '#000'; c.fillRect(w * 0.585, h * 0.39, h * 0.07, h * 0.02); c.fillRect(w * 0.47, h * 0.39, h * 0.07, h * 0.02);
  // ruedas y faro
  c.fillStyle = '#030405';
  c.beginPath(); c.arc(w * 0.23, h * 0.84, h * 0.12, 0, Math.PI * 2); c.arc(w * 0.8, h * 0.84, h * 0.12, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2e6c4'; c.fillRect(w * 0.955, h * 0.6, w * 0.02, h * 0.06);
  c.restore();
}

/** El patio de la siesta, de dia. */
export function patioSiesta(c: Ctx, w: number, h: number) {
  c.fillStyle = SIESTA.cielo; c.fillRect(0, 0, w, h);
  c.fillStyle = SIESTA.cal; c.fillRect(0, h * 0.35, w, h * 0.45);
  c.fillStyle = '#5a4632'; c.fillRect(w * 0.72, h * 0.42, w * 0.08, h * 0.38);
  c.fillStyle = '#e4d3ad'; c.fillRect(0, h * 0.8, w, h * 0.2);
  for (let i = 0; i < 14; i++) { c.save(); c.translate(i * w / 13 - 40, h * 0.62); planta(c, 120, 170, 'recuerdo', i * 5); c.restore(); }
}

/** Su cara en el agua negra, como una luna con el pelo rubio. */
export function reflejo(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const t = (cuadro / total) * Math.PI * 2;
  // solo el circulo del agua: afuera, transparente (el borde del aljibe lo pone el juego)
  c.save();
  c.beginPath(); c.arc(w / 2, h / 2, w * 0.5, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#020304'; c.fillRect(0, 0, w, h);
  const cielo = c.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.5);
  cielo.addColorStop(0, 'rgba(40,34,26,0)'); cielo.addColorStop(1, 'rgba(80,66,46,0.5)');
  c.fillStyle = cielo; c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2 + Math.sin(t) * 3, h / 2);
  c.fillStyle = '#e0c27a';
  c.beginPath(); c.ellipse(0, -h * 0.02, w * 0.2, h * 0.22, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2ead6';
  c.beginPath(); c.ellipse(0, h * 0.02, w * 0.14, h * 0.16, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0b0c0e';
  c.beginPath(); c.arc(-w * 0.05, 0, w * 0.014, 0, Math.PI * 2); c.arc(w * 0.05, 0, w * 0.014, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e0c27a'; c.fillRect(-w * 0.14, -h * 0.12, w * 0.28, h * 0.05);
  c.restore();
  c.strokeStyle = 'rgba(246,239,224,0.25)'; c.lineWidth = 2;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.12 * i + Math.sin(t + i) * 4, h * 0.06 * i, 0, 0, Math.PI * 2); c.stroke(); }
  c.restore();
}

/** El cuarto del altar, en penumbra de siesta. */
export function cuartoAltar(c: Ctx, w: number, h: number) {
  c.fillStyle = '#6f5a40'; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w * 0.25, h * 0.3, 10, w * 0.25, h * 0.3, w * 0.6);
  g.addColorStop(0, 'rgba(255,240,205,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#4e3d2a'; c.fillRect(0, h * 0.78, w, h * 0.22);
}
