import { hash, rc } from '../config';

/**
 * MIEDOS — placeholders de lo oscuro.
 *
 *   versiones oscuras: ellas, vistas por Josefina cuando pierde la calma
 *     ("la gente se vuelve monstruo al acercarse")
 *   perseguidores: lo que la persigue cuando no tararea. Al principio son
 *     sombras sin cara (ella cree que son suyas); cada recuerdo aceptado le
 *     pone cara a una: la de quien se lo dio.
 *   pantano: el barro que sube.
 */

type Ctx = CanvasRenderingContext2D;
const NEGRO = '#030405';

/** Una version monstruosa de cualquier dibujo: silueta negra, estirada, con ojos y dedos largos. */
export function oscurecer(c: Ctx, w: number, h: number, cuadro: number, total: number, base: (c: Ctx) => void) {
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d')!;
  base(t);
  // donde esta la cabeza: la primera fila con pintura
  const px = t.getImageData(0, 0, w, h).data;
  let arriba = h, izq = w, der = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (px[(y * w + x) * 4 + 3] > 40) { if (y < arriba) arriba = y; if (x < izq) izq = x; if (x > der) der = x; }
  }
  const fase = (cuadro / total) * Math.PI * 2;
  // un borde frio, apenas corrido, y encima la silueta negra
  c.save();
  c.filter = 'brightness(0) invert(0.55) sepia(1) hue-rotate(170deg) saturate(0.6)';
  c.globalAlpha = 0.5;
  c.drawImage(tmp, -2, -2);
  c.drawImage(tmp, 2, -1);
  c.restore();
  c.save();
  c.filter = 'brightness(0)';
  c.drawImage(tmp, 0, 0);
  c.restore();
  // brazos larguisimos que salen de los hombros y cuelgan hasta el piso, con dedos
  const cx = (izq + der) / 2, ancho = der - izq;
  const hombro = arriba + (h - arriba) * 0.2;
  c.strokeStyle = NEGRO; c.lineCap = 'round';
  for (const lado of [-1, 1]) {
    const x0 = cx + lado * ancho * 0.18, y0 = hombro;
    const x1 = cx + lado * (ancho * 0.55 + 20) + Math.sin(fase + lado) * 8, y1 = h - 20;
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx + lado * ancho * 0.6, y0 + (y1 - y0) * 0.3, x1, y1); c.stroke();
    for (let k = 0; k < 4; k++) {
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x1, y1);
      c.lineTo(x1 + lado * (k - 1.5) * 7 + Math.sin(fase * 2 + k) * 3, h - 4); c.stroke();
    }
  }
  // ojos que brillan, demasiados
  const altoCab = arriba + (h - arriba) * 0.07;
  c.fillStyle = '#e9e4d6';
  for (const [dx, dy, r] of [[-12, 0, 4], [12, 0, 4], [0, -14, 2.5], [-22, 12, 2], [20, 14, 2]] as const) {
    c.beginPath(); c.arc(cx + dx, altoCab + dy + Math.sin(fase + dx) * 1.5, r, 0, Math.PI * 2); c.fill();
  }
  // una boca que es un tajo
  c.strokeStyle = '#6f0f14'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - 14, altoCab + 26); c.quadraticCurveTo(cx, altoCab + 34 + Math.sin(fase) * 4, cx + 14, altoCab + 26); c.stroke();
}

function cuerpoSombra(c: Ctx, w: number, h: number, fase: number, alto: number, encorvada: number) {
  // una figura humana sin cara, hecha de humo negro, encorvada hacia adelante (hacia la izquierda)
  c.fillStyle = NEGRO;
  const base = h - 8;
  const hombro = base - alto * 0.72;
  const cab = hombro - alto * 0.12;
  const avance = encorvada * alto * 0.25;
  c.beginPath();
  c.moveTo(w / 2 - alto * 0.12, base);
  c.quadraticCurveTo(w / 2 - alto * 0.2, base - alto * 0.4, w / 2 - avance, hombro);
  c.lineTo(w / 2 - avance + alto * 0.18, hombro + 6);
  c.quadraticCurveTo(w / 2 + alto * 0.2, base - alto * 0.4, w / 2 + alto * 0.14, base);
  c.closePath(); c.fill();
  c.beginPath(); c.ellipse(w / 2 - avance - 6, cab, alto * 0.075, alto * 0.095, -0.3, 0, Math.PI * 2); c.fill();
  // brazos larguisimos
  c.strokeStyle = NEGRO; c.lineCap = 'round'; c.lineWidth = alto * 0.035;
  for (const k of [0, 1]) {
    const a = fase + k * Math.PI;
    c.beginPath(); c.moveTo(w / 2 - avance + 8, hombro + 10);
    c.quadraticCurveTo(w / 2 - avance - alto * 0.2, hombro + alto * 0.2 + Math.sin(a) * 12, w / 2 - avance - alto * 0.34 + Math.cos(a) * 16, base - alto * 0.05 + Math.sin(a) * 6);
    c.stroke();
  }
  // humo que se desprende
  for (let i = 0; i < 14; i++) {
    const s = (i / 14 + fase / (Math.PI * 2)) % 1;
    c.globalAlpha = (1 - s) * 0.5;
    c.beginPath(); c.arc(w / 2 + rc(i, 1) * alto * 0.2 + s * 30, hombro - s * alto * 0.4, 4 + s * 12, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

/** La sombra sin cara: ella cree que es suya. */
export function sombraSinCara(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const fase = (cuadro / total) * Math.PI * 2;
  cuerpoSombra(c, w, h, fase, h * 0.82, 0.6 + Math.sin(fase) * 0.1);
}

/** Lo de abajo de la cama (el de Mariela): una mano enorme que camina con los dedos. */
export function miedoCama(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const fase = (cuadro / total) * Math.PI * 2;
  const base = h - 10, cx = w / 2;
  c.fillStyle = NEGRO; c.strokeStyle = NEGRO; c.lineCap = 'round';
  // la palma
  c.beginPath(); c.ellipse(cx + 20, base - 120 + Math.sin(fase * 2) * 4, 70, 46, 0.2, 0, Math.PI * 2); c.fill();
  // cinco dedos que caminan
  for (let i = 0; i < 5; i++) {
    const a = fase + i * 1.3;
    const x0 = cx - 30 + i * 22, y0 = base - 110;
    const x1 = x0 - 50 - i * 6 + Math.cos(a) * 14, y1 = base - 60 - Math.max(0, Math.sin(a)) * 30;
    const x2 = x1 - 20 + Math.cos(a) * 6, y2 = base - Math.max(0, Math.sin(a)) * 8;
    c.lineWidth = 16 - i;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  // un ojo de muneco en el dorso
  c.fillStyle = '#e9e4d6';
  c.beginPath(); c.arc(cx + 40, base - 132, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = NEGRO; c.beginPath(); c.arc(cx + 38, base - 132, 3, 0, Math.PI * 2); c.fill();
}

/** El de la madre: una mujer larga, empapada, que chorrea agua negra y no deja de caer hacia adelante. */
export function miedoAgua(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const fase = (cuadro / total) * Math.PI * 2;
  cuerpoSombra(c, w, h, fase, h * 0.95, 0.9);
  c.fillStyle = NEGRO;
  // pelo mojado que cuelga
  for (let i = 0; i < 10; i++) {
    const x = w / 2 - h * 0.23 + i * 5;
    c.fillRect(x, h * 0.18, 3, 60 + hash(i) * 70 + Math.sin(fase + i) * 8);
  }
  // gotas que caen
  for (let i = 0; i < 12; i++) {
    const s = (hash(i * 3) + fase / (Math.PI * 2)) % 1;
    c.beginPath(); c.ellipse(w / 2 + rc(i, 2) * 60, h * 0.3 + s * h * 0.65, 2.5, 6, 0, 0, Math.PI * 2); c.fill();
  }
  // un charco
  c.beginPath(); c.ellipse(w / 2, h - 8, w * 0.32, 8, 0, 0, Math.PI * 2); c.fill();
}

/** El de la abuela: la tormenta encorvada, con una calavera chiquita en el pecho. */
export function miedoTormenta(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const fase = (cuadro / total) * Math.PI * 2;
  c.fillStyle = NEGRO;
  // una nube que camina, jorobada
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI;
    c.beginPath();
    c.arc(w / 2 + Math.cos(a) * w * 0.26, h * 0.45 - Math.sin(a) * h * 0.2 + Math.sin(fase + i) * 4, w * 0.13, 0, Math.PI * 2);
    c.fill();
  }
  c.beginPath(); c.ellipse(w / 2, h * 0.52, w * 0.3, h * 0.16, 0, 0, Math.PI * 2); c.fill();
  // lluvia negra como piernas
  c.strokeStyle = NEGRO; c.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const x = w * 0.24 + i * w * 0.034 + Math.sin(fase + i) * 4;
    c.beginPath(); c.moveTo(x, h * 0.58); c.lineTo(x - 10, h - 8); c.stroke();
  }
  // un relampago adentro
  if (cuadro % 3 === 0) {
    c.strokeStyle = '#e9e4d6'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(w * 0.55, h * 0.32); c.lineTo(w * 0.5, h * 0.44); c.lineTo(w * 0.56, h * 0.46); c.lineTo(w * 0.49, h * 0.6); c.stroke();
  }
  // la calavera chiquita
  c.fillStyle = '#e9e4d6';
  c.beginPath(); c.arc(w * 0.44, h * 0.5, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = NEGRO;
  c.beginPath(); c.arc(w * 0.44 - 4, h * 0.5 - 2, 3, 0, Math.PI * 2); c.arc(w * 0.44 + 4, h * 0.5 - 2, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d8b04a';
  c.beginPath(); c.arc(w * 0.44 - 4, h * 0.5 - 2, 1.2, 0, Math.PI * 2); c.arc(w * 0.44 + 4, h * 0.5 - 2, 1.2, 0, Math.PI * 2); c.fill();
}

/** El pantano: barro negro con burbujas. Tileable en horizontal. */
export function pantano(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const fase = (cuadro / total) * Math.PI * 2;
  const borde = (x: number) => h * 0.3 + Math.sin((x / w) * Math.PI * 2 * 3 + fase) * 8 + Math.sin((x / w) * Math.PI * 2 * 7 - fase * 2) * 4;
  c.fillStyle = '#050607';
  c.beginPath(); c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) c.lineTo(x, borde(x));
  c.lineTo(w, h); c.closePath(); c.fill();
  // brillo humedo en el borde
  c.strokeStyle = 'rgba(140,160,180,0.25)'; c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x <= w; x += 8) { if (x === 0) c.moveTo(x, borde(x) + 2); else c.lineTo(x, borde(x) + 2); }
  c.stroke();
  // burbujas
  for (let i = 0; i < 7; i++) {
    const x = ((hash(i) * w) + cuadro * 7) % w;
    const s = ((cuadro / total) + hash(i + 3)) % 1;
    c.strokeStyle = `rgba(140,160,180,${0.35 * (1 - s)})`;
    c.beginPath(); c.arc(x, borde(x) - 2 - s * 10, 3 + s * 8, Math.PI, 0); c.stroke();
  }
}
