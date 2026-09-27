import { hash, rc } from './config';

/**
 * RETRATOS — las caricaturas de la caja de dialogo (placeholders).
 *
 * Convencion de juego de rol (Fran Bow, en el moodboard del grupo): ojos
 * enormes, trazo grueso, un gesto claro. Dos paletas: el presente (fria) y el
 * recuerdo (sepia, foto vieja). Cada combinacion personaje+gesto se exporta
 * como un PNG en assets/retratos/ para que el equipo la redibuje.
 */

export type IdRetrato = 'mariela' | 'mariela_nina' | 'madre' | 'madre_joven' | 'abuela' | 'abuela_joven' | 'senora' | 'aljibe' | 'reflejo' | 'josefina' | 'nina';
export type Gesto = 'miedo' | 'calma' | 'triste' | 'lejos' | 'pena';

type Ctx = CanvasRenderingContext2D;

export interface Paleta { piel: string; pelo: string; linea: string; ojo: string; pupila: string; ropa: string; fondoA: string; fondoB: string; }

export function paleta(recuerdo: boolean, pelo: string): Paleta {
  return recuerdo
    ? { piel: '#ecd0a8', pelo, linea: '#3d2c1a', ojo: '#fbf5e8', pupila: '#2d2012', ropa: '#c9a06a', fondoA: '#f6ead0', fondoB: '#c9ad82' }
    : { piel: '#e2dcd0', pelo, linea: '#08090c', ojo: '#f7f3ea', pupila: '#08090c', ropa: '#1b2430', fondoA: '#1d2836', fondoB: '#06090d' };
}

export function retrato(c: Ctx, id: IdRetrato, gesto: Gesto, x: number, y: number, s: number, t: number, recuerdo: boolean) {
  c.save();
  c.translate(x, y);
  const k = paleta(recuerdo, '#000');
  c.save();
  c.beginPath(); c.rect(0, 0, s, s); c.clip();
  const g = c.createRadialGradient(s / 2, s * 0.45, 10, s / 2, s / 2, s * 0.8);
  g.addColorStop(0, k.fondoA); g.addColorStop(1, k.fondoB);
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  c.translate(s / 2, s * 0.58);
  c.scale(s / 184, s / 184);
  if (gesto === 'miedo') c.translate(rc(t * 20, 1) * 1.5, rc(2, t * 20));
  switch (id) {
    case 'mariela_nina': nina(c, gesto, t, paleta(recuerdo, '#d9b56a'), true); break;
    case 'mariela': mariela(c, gesto, t, paleta(recuerdo, '#d9b56a')); break;
    case 'josefina': mariela(c, gesto, t, paleta(recuerdo, '#0c0e12')); break;
    case 'nina': nina(c, gesto, t, paleta(recuerdo, '#e0c27a'), false); break;
    case 'madre': case 'madre_joven': madre(c, gesto, t, paleta(recuerdo, recuerdo ? '#5a3e22' : '#0a0b0e'), id === 'madre'); break;
    case 'abuela': case 'abuela_joven': abuela(c, gesto, t, paleta(recuerdo, '#000')); break;
    case 'senora': senora(c, gesto, t, paleta(recuerdo, '#d8d2c6')); break;
    case 'aljibe': agua(c, t); break;
    case 'reflejo': reflejoNina(c, t); break;
  }
  c.restore();
  c.strokeStyle = recuerdo ? 'rgba(61,44,26,0.9)' : 'rgba(232,227,216,0.7)';
  c.lineWidth = 2;
  c.strokeRect(1, 1, s - 2, s - 2);
  c.restore();
}

function ojos(c: Ctx, g: Gesto, t: number, dx: number, y: number, r: number, k: Paleta) {
  const parpadeo = (t * 0.7) % 4 > 3.9 ? 0.1 : 1;
  for (const lado of [-1, 1]) {
    const ex = lado * dx;
    const alto = g === 'calma' ? r * 0.45 : g === 'triste' || g === 'pena' ? r * 0.7 : g === 'lejos' ? r * 0.6 : r;
    c.fillStyle = k.ojo;
    c.beginPath(); c.ellipse(ex, y, r, alto * parpadeo, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = k.linea; c.lineWidth = 2.2; c.stroke();
    const pr = g === 'miedo' ? r * 0.22 : r * 0.42;
    const mira = g === 'miedo' ? rc(t * 3, lado) * r * 0.25 : g === 'lejos' ? r * 0.35 : 0;
    c.fillStyle = k.pupila;
    c.beginPath(); c.arc(ex + mira, y + (g === 'triste' || g === 'pena' ? r * 0.25 : 0), pr * parpadeo, 0, Math.PI * 2); c.fill();
    c.strokeStyle = k.linea; c.lineWidth = 3;
    c.beginPath();
    if (g === 'miedo') { c.moveTo(ex - r * lado * 0.9, y - r * 1.5); c.lineTo(ex + r * lado * 0.7, y - r * 1.9); }
    else if (g === 'triste' || g === 'pena') { c.moveTo(ex - r * lado * 0.9, y - r * 1.2); c.lineTo(ex + r * lado * 0.8, y - r * 1.6); }
    else { c.moveTo(ex - r * 0.9, y - r * 1.2); c.lineTo(ex + r * 0.9, y - r * 1.25); }
    c.stroke();
  }
}

function boca(c: Ctx, g: Gesto, y: number, ancho: number, k: Paleta, t: number) {
  c.strokeStyle = k.linea; c.lineWidth = 2.6; c.lineCap = 'round';
  c.beginPath();
  if (g === 'miedo') { c.fillStyle = k.linea; c.ellipse(0, y, ancho * 0.28, ancho * 0.22 + Math.sin(t * 9) * 1.5, 0, 0, Math.PI * 2); c.fill(); }
  else if (g === 'calma') { c.moveTo(-ancho / 2, y); c.quadraticCurveTo(0, y + ancho * 0.25, ancho / 2, y); c.stroke(); }
  else if (g === 'lejos') { c.moveTo(-ancho / 2, y + 2); c.lineTo(ancho / 2, y + 2); c.stroke(); }
  else { c.moveTo(-ancho / 2, y + 4); c.quadraticCurveTo(0, y - ancho * 0.2, ancho / 2, y + 4); c.stroke(); }
}

function cabeza(c: Ctx, k: Paleta, rx: number, ry: number) {
  c.fillStyle = k.piel;
  c.beginPath(); c.ellipse(0, -2, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = k.linea; c.lineWidth = 2.5; c.stroke();
}

function nina(c: Ctx, g: Gesto, t: number, k: Paleta, muneca: boolean) {
  c.fillStyle = k.pelo;
  c.beginPath(); c.ellipse(0, -10, 62, 72, 0, Math.PI, 0); c.lineTo(66, 90); c.lineTo(-66, 90); c.closePath(); c.fill();
  c.fillStyle = k.ropa; c.fillRect(-60, 70, 120, 60);
  cabeza(c, k, 50, 58);
  c.fillStyle = k.pelo;
  c.beginPath(); c.moveTo(-54, -18); c.quadraticCurveTo(0, -84, 54, -18); c.lineTo(54, -30); c.quadraticCurveTo(0, -96, -54, -30); c.fill();
  c.fillRect(-54, -34, 108, 14);
  ojos(c, g, t, 21, 4, 15, k);
  boca(c, g, 36, 20, k, t);
  if (muneca) {
    c.fillStyle = '#a7a092';
    c.beginPath(); c.arc(46, 92, 20, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0b0c0e';
    c.beginPath(); c.arc(39, 88, 3.5, 0, Math.PI * 2); c.arc(53, 88, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(38, 86, 1.5, 1.5); c.fillRect(52, 86, 1.5, 1.5);
  }
}

/** Mariela, ahora: linda, suelta, los ojos apenas delineados, un cigarrillo. */
function mariela(c: Ctx, g: Gesto, t: number, k: Paleta) {
  c.fillStyle = k.pelo;
  c.beginPath(); c.ellipse(0, 0, 60, 78, 0, Math.PI, 0); c.lineTo(70, 110); c.lineTo(-70, 110); c.closePath(); c.fill();
  c.fillStyle = k.ropa; c.beginPath(); c.moveTo(-72, 130); c.lineTo(-44, 66); c.lineTo(44, 66); c.lineTo(72, 130); c.fill();
  cabeza(c, k, 44, 58);
  c.fillStyle = k.pelo;
  c.beginPath(); c.moveTo(-46, -8); c.quadraticCurveTo(-30, -70, 30, -58); c.quadraticCurveTo(-8, -40, -22, 20); c.closePath(); c.fill();
  ojos(c, g, t, 18, 2, 12, k);
  // delineado
  c.strokeStyle = k.linea; c.lineWidth = 3;
  for (const lado of [-1, 1]) { c.beginPath(); c.moveTo(lado * 30, 2); c.lineTo(lado * 36, -2); c.stroke(); }
  boca(c, g, 34, 18, k, t);
  c.strokeStyle = '#efe9dd'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(10, 36); c.lineTo(44, 30); c.stroke();
  c.strokeStyle = 'rgba(200,210,220,0.4)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(44, 30); c.quadraticCurveTo(60 + Math.sin(t * 2) * 4, 0, 50, -40); c.stroke();
}

function madre(c: Ctx, g: Gesto, t: number, k: Paleta, anteojos: boolean) {
  c.fillStyle = k.ropa;
  c.beginPath(); c.moveTo(-70, 130); c.lineTo(-44, 62); c.lineTo(44, 62); c.lineTo(70, 130); c.fill();
  c.fillStyle = k.piel; c.fillRect(-12, 40, 24, 30);
  cabeza(c, k, 42, 60);
  c.fillStyle = k.pelo;
  c.beginPath(); c.ellipse(0, -48, 46, 26, 0, Math.PI, 0); c.fill();
  c.beginPath(); c.arc(0, -76, 18, 0, Math.PI * 2); c.fill();
  ojos(c, g, t, 18, -4, 13, k);
  boca(c, g, 32, 16, k, t);
  if (anteojos) {
    // los anteojos oscuros, subidos a la cabeza
    c.fillStyle = '#050608';
    c.beginPath(); c.ellipse(-16, -46, 14, 8, 0, 0, Math.PI * 2); c.ellipse(16, -46, 14, 8, 0, 0, Math.PI * 2); c.fill();
  }
}

function abuela(c: Ctx, g: Gesto, t: number, k: Paleta) {
  c.fillStyle = k.ropa;
  c.beginPath(); c.moveTo(-78, 130); c.lineTo(-50, 58); c.lineTo(50, 58); c.lineTo(78, 130); c.fill();
  cabeza(c, k, 48, 56);
  c.fillStyle = k.fondoB === '#06090d' ? '#232c36' : '#8a6a44';
  c.beginPath(); c.moveTo(-58, 30); c.quadraticCurveTo(-64, -70, 0, -70); c.quadraticCurveTo(64, -70, 58, 30); c.lineTo(44, 10); c.quadraticCurveTo(0, -44, -44, 10); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,50,40,0.45)'; c.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-18, -22 + i * 5); c.lineTo(18, -22 + i * 5); c.stroke(); }
  ojos(c, g, t, 19, 4, 12, k);
  boca(c, g, 34, 18, k, t);
  c.fillStyle = '#8f887b';
  for (let i = 0; i < 11; i++) { const a = 0.3 + (i / 10) * (Math.PI - 0.6); c.beginPath(); c.arc(Math.cos(a) * 46, 70 + Math.sin(a) * 30, 3, 0, Math.PI * 2); c.fill(); }
  // la mandarina (solo en el presente la come tranquila)
  if (g === 'calma' || g === 'lejos') { c.fillStyle = '#e08a2c'; c.beginPath(); c.arc(-52, 104, 14, 0, Math.PI * 2); c.fill(); }
}

/** La Senora: vieja, el pelo gris revuelto, collares de rosarios, ojos con pena. */
function senora(c: Ctx, g: Gesto, t: number, k: Paleta) {
  c.fillStyle = '#3a2f2a';
  c.beginPath(); c.moveTo(-80, 130); c.lineTo(-48, 60); c.lineTo(48, 60); c.lineTo(80, 130); c.fill();
  c.fillStyle = k.pelo;
  for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(rc(i, 1) * 48, -40 + rc(1, i) * 30, 22, 0, Math.PI * 2); c.fill(); }
  cabeza(c, k, 44, 56);
  c.strokeStyle = 'rgba(60,50,40,0.5)'; c.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-20, -24 + i * 4); c.lineTo(20, -24 + i * 4); c.stroke(); }
  c.beginPath(); c.moveTo(-26, 26); c.lineTo(-18, 40); c.moveTo(26, 26); c.lineTo(18, 40); c.stroke();
  ojos(c, g, t, 18, 2, 11, k);
  boca(c, g, 34, 16, k, t);
  for (let r = 0; r < 3; r++) {
    c.fillStyle = ['#8f887b', '#b9b1a2', '#6a4a2a'][r];
    for (let i = 0; i < 13; i++) { const a = 0.3 + (i / 12) * (Math.PI - 0.6); c.beginPath(); c.arc(Math.cos(a) * (40 + r * 8), 64 + Math.sin(a) * (22 + r * 8), 2.6, 0, Math.PI * 2); c.fill(); }
  }
}

/** Tres caras en el agua negra, dadas vuelta. */
function agua(c: Ctx, t: number) {
  c.fillStyle = '#020304';
  c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#d8d3c7'; c.lineWidth = 5; c.stroke();
  for (let i = 0; i < 3; i++) {
    const a = t * 0.3 + (i * Math.PI * 2) / 3;
    c.save();
    c.translate(Math.cos(a) * 36, Math.sin(a) * 30);
    c.scale(1, -1);
    c.fillStyle = `rgba(230,223,210,${0.55 + hash(i) * 0.3})`;
    c.beginPath(); c.ellipse(0, 0, 16 + Math.sin(t * 2 + i) * 1.5, 20, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a0b0e';
    c.beginPath(); c.arc(-6, -3, 3, 0, Math.PI * 2); c.arc(6, -3, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 8, 4, 3 + Math.abs(Math.sin(t * 5 + i)) * 3, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

/** Su cara de nena en el agua: una luna con el pelo rubio. */
function reflejoNina(c: Ctx, t: number) {
  c.fillStyle = '#020304';
  c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#f6efe0'; c.lineWidth = 5; c.stroke();
  c.fillStyle = '#e0c27a';
  c.beginPath(); c.ellipse(Math.sin(t) * 2, -4, 40, 46, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2ead6';
  c.beginPath(); c.ellipse(Math.sin(t) * 2, 4, 28, 34, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0b0c0e';
  c.beginPath(); c.arc(-10 + Math.sin(t) * 2, 0, 3, 0, Math.PI * 2); c.arc(10 + Math.sin(t) * 2, 0, 3, 0, Math.PI * 2); c.fill();
}
