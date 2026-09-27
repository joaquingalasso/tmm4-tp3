import { C, H, RES, RGB, TIPO, W, clamp, hash, lerp, rc, ruido } from './config';

/**
 * ARTE — todo procedural. Direccion: teatro de sombras.
 *
 * Todo es recorte oscuro sobre oscuro, con un borde de luz fria. Lo unico claro
 * es la nina: hueso sobre negro. A medida que absorbe sombras, se le manchan el
 * vestido y la cara de tinta desde adentro, hasta que al final es casi tan
 * oscura como todo lo demas.
 *
 * La tinta es el material del miedo: sombras en las paredes que se agitan,
 * cortinas que cierran el paso, corrientes que pasan de un cuerpo a otro.
 */

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- luz

/**
 * Mascara de luz: se llena de oscuridad y cada luz la perfora. Se aplica encima
 * del mundo ya dibujado. En la casa y en el tunel casi todo es negro, y lo que
 * alumbra tu tarareo es lo unico que se ve.
 */
export class Luces {
  lienzo = document.createElement('canvas');
  ctx: Ctx;
  constructor() {
    this.lienzo.width = W * RES;
    this.lienzo.height = H * RES;
    this.ctx = this.lienzo.getContext('2d')!;
    this.ctx.scale(RES, RES);
  }
  empezar(oscuridad: number) {
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    c.fillStyle = `rgba(1,2,4,${oscuridad})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'destination-out';
  }
  luz(x: number, y: number, r: number, i = 1) {
    if (r <= 1 || i <= 0.01) return;
    const c = this.ctx;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${clamp(i)})`);
    g.addColorStop(0.5, `rgba(0,0,0,${clamp(i) * 0.6})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  cono(x: number, y: number, ancho: number, largo: number, i = 1, ang = Math.PI / 2) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(ang - Math.PI / 2);
    const g = c.createLinearGradient(0, 0, 0, largo);
    g.addColorStop(0, `rgba(0,0,0,${clamp(i)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-8, 0); c.lineTo(8, 0); c.lineTo(ancho / 2, largo); c.lineTo(-ancho / 2, largo);
    c.closePath(); c.fill();
    c.restore();
  }
  aplicar(dest: Ctx) {
    dest.save();
    dest.setTransform(1, 0, 0, 1, 0, 0);
    dest.drawImage(this.lienzo, 0, 0);
    dest.restore();
  }
}

// ---------------------------------------------------------------- tinta

/** Un tentaculo de tinta que nace en (x0, y0) y serpentea. */
export function tentaculo(c: Ctx, x0: number, y0: number, ang: number, largo: number, ancho: number,
                          t: number, sem: number, agit: number, alpha = 0.9, color: string = C.tinta, segs = 14, borde = 0) {
  if (largo < 2) return;
  const izq: [number, number][] = [], der: [number, number][] = [];
  let x = x0, y = y0, a = ang;
  const paso = largo / segs;
  for (let i = 0; i <= segs; i++) {
    const s = i / segs;
    const w = ancho * Math.pow(1 - s, 0.75) + 0.4;
    izq.push([x + Math.cos(a - Math.PI / 2) * w, y + Math.sin(a - Math.PI / 2) * w]);
    der.push([x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w]);
    a += rc(sem + i * 0.41, t * 0.9 + sem) * 0.32 * agit + rc(sem * 3 + i, t * 3.1) * 0.08 * agit;
    x += Math.cos(a) * paso;
    y += Math.sin(a) * paso;
  }
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(izq[0][0], izq[0][1]);
  for (const p of izq) c.lineTo(p[0], p[1]);
  for (let i = der.length - 1; i >= 0; i--) c.lineTo(der[i][0], der[i][1]);
  c.closePath();
  c.fill();
  if (borde > 0) {
    c.globalAlpha = borde;
    c.strokeStyle = `rgba(${RGB.frio},1)`;
    c.lineWidth = 1.2;
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** Mancha de tinta de borde irregular. */
export function mancha(c: Ctx, x: number, y: number, rx: number, ry: number, t: number, sem: number, alpha = 0.9, color: string = C.tinta) {
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const k = 0.78 + ruido(Math.cos(a) * 1.6 + sem, Math.sin(a) * 1.6 + t * 0.4) * 0.44;
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
}

/**
 * La sombra de una figura en la pared: mucho mas grande que ella, se agita
 * y estira dedos hacia el techo.
 */
export function sombraPared(c: Ctx, x: number, pisoY: number, alto: number, t: number, agit: number, alpha: number, sem: number, encoger = 0) {
  if (alpha <= 0.01) return;
  const a = alpha * (1 - encoger);
  const h = alto * (1 - encoger * 0.7);
  mancha(c, x, pisoY - h * 0.42, 70 + agit * 20, h * 0.42, t * (0.6 + agit), sem, a * 0.9);
  for (let i = 0; i < 9; i++) {
    const ang = -Math.PI / 2 + (i - 4) * 0.24 + rc(sem + i, t * 0.5) * 0.2 * agit;
    tentaculo(c, x + (i - 4) * 12, pisoY - h * 0.55, ang, h * (0.45 + hash(sem + i) * 0.35), 9 + hash(i) * 6,
      t, sem + i * 7, 0.6 + agit * 1.4, a * 0.85);
  }
}

/** Cortina de tinta que cierra el paso de techo a piso. */
export function cortinaTinta(c: Ctx, x: number, techo: number, piso: number, t: number, retraida: number, alpha = 1) {
  if (retraida >= 0.999) return;
  const largo = (piso - techo) * (1 - retraida);
  for (let i = 0; i < 11; i++) {
    tentaculo(c, x + (i - 5) * 9 + rc(i, t * 0.3) * 6, techo - 5, Math.PI / 2 + rc(i * 2, t * 0.4) * 0.08,
      largo * (0.85 + hash(i) * 0.2), 10, t, i * 13.3, 0.45, alpha * 0.92);
  }
}

/** La corriente de tinta que pasa de la pared a la nina. p: 0 = en la pared, 1 = adentro de ella. */
export function corriente(c: Ctx, x0: number, y0: number, x1: number, y1: number, p: number, t: number, sem: number) {
  if (p <= 0 || p >= 1.2) return;
  const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 160;
  const punto = (s: number): [number, number] => {
    const u = 1 - s;
    return [u * u * x0 + 2 * u * s * cx + s * s * x1, u * u * y0 + 2 * u * s * cy + s * s * y1];
  };
  for (let k = 0; k < 5; k++) {
    const s1 = clamp(p - k * 0.04), s0 = clamp(s1 - 0.45);
    if (s1 <= s0) continue;
    c.globalAlpha = 0.85;
    c.fillStyle = C.tinta;
    const n = 26;
    const izq: [number, number][] = [], der: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * (i / n);
      const [px, py] = punto(s);
      const [qx, qy] = punto(Math.min(1, s + 0.01));
      const ang = Math.atan2(qy - py, qx - px) + Math.PI / 2;
      const w = (6 + 15 * Math.sin((i / n) * Math.PI)) * (1 - k * 0.15);
      const off = rc(sem + k * 5 + s * 6, t * 2) * 14;
      izq.push([px + Math.cos(ang) * (off + w), py + Math.sin(ang) * (off + w)]);
      der.push([px + Math.cos(ang) * (off - w), py + Math.sin(ang) * (off - w)]);
    }
    const cinta = new Path2D();
    cinta.moveTo(izq[0][0], izq[0][1]);
    for (const q of izq) cinta.lineTo(q[0], q[1]);
    for (let i = der.length - 1; i >= 0; i--) cinta.lineTo(der[i][0], der[i][1]);
    cinta.closePath();
    // un filo de luz fria, para que la tinta se lea contra la oscuridad
    c.globalAlpha = 0.5;
    c.strokeStyle = `rgba(${RGB.frio},0.55)`;
    c.lineWidth = 2;
    c.stroke(cinta);
    c.globalAlpha = 0.92;
    c.fill(cinta);
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- la nina

export interface EstadoNina {
  x: number; y: number; s: number; dir: number; fase: number; caminando: boolean;
  tarareo: number; carga: number; t: number; miedo: number; grito: number; agachada?: number;
  /** El reves: el cuerpo oscuro, el pelo claro, y la tinta adentro se vuelve luz. */
  negativo?: boolean;
}

/** Devuelve la boca y el pecho en coordenadas de pantalla. */
export function nina(c: Ctx, e: EstadoNina) {
  const { t } = e;
  const neg = !!e.negativo;
  const INK = neg ? C.hueso : C.tinta;
  const temblor = e.miedo * e.miedo * 1.8;
  const jx = rc(t * 30, 1) * temblor, jy = rc(2, t * 30) * temblor * 0.5;
  c.save();
  c.translate(e.x + jx, e.y + jy);
  c.scale(e.s * e.dir, e.s);
  c.lineCap = 'round';
  const ag = (e.agachada ?? 0) * 26;

  // las sombras que carga, detras
  const n = Math.ceil(e.carga - 0.01);
  for (let i = 0; i < n; i++) {
    const part = clamp(e.carga - i);
    tentaculo(c, -6, -70 + ag + i * 8, Math.PI + 0.25 - i * 0.25 + rc(i, t * 0.4) * 0.3,
      (45 + i * 28) * part, 7, t, 40 + i * 9, 1.4, 0.8 * part, neg ? '#f2ede2' : C.tinta);
  }

  const sw = e.caminando ? Math.sin(e.fase) : 0;
  const tono = neg ? lerp(0.1, 0.2, clamp(e.carga / 3)) : lerp(1, 0.52, clamp(e.carga / 3));
  const piel = `rgb(${Math.round(232 * tono)},${Math.round(227 * tono)},${Math.round(216 * tono)})`;

  // piernas
  c.strokeStyle = neg ? '#1b1d22' : `rgb(${Math.round(200 * tono)},${Math.round(194 * tono)},${Math.round(183 * tono)})`;
  c.lineWidth = 3.4;
  for (const lado of [-1, 1]) {
    c.beginPath();
    c.moveTo(lado * 3.5, -33 + ag);
    if (ag > 4) c.lineTo(lado * 3 + 12, -18 + ag * 0.3);
    c.lineTo(lado * 3.5 + sw * lado * 9, 0);
    c.stroke();
  }

  // cuerpo (vestido + cabeza) como un solo recorte
  const inclinacion = -e.tarareo * 0.12 + (e.miedo > 0.6 ? 0.15 : 0) + e.grito * -0.3;
  const cuerpo = new Path2D();
  cuerpo.moveTo(-9, -80 + ag);
  cuerpo.lineTo(9, -80 + ag);
  cuerpo.lineTo(17, -31 + ag * 0.6);
  cuerpo.quadraticCurveTo(0, -27 + ag * 0.6, -17, -31 + ag * 0.6);
  cuerpo.closePath();
  const hx = 1 + Math.sin(inclinacion) * 12, hy = -93 + ag;
  const cabeza = new Path2D();
  cabeza.ellipse(hx, hy, 10, 11.5, inclinacion, 0, Math.PI * 2);

  // pelo de atras
  c.fillStyle = INK;
  c.beginPath();
  c.moveTo(hx - 4, hy - 11);
  c.quadraticCurveTo(hx - 17 - sw * 2, hy + 14, hx - 11 - sw * 3, hy + 36);
  c.lineTo(hx - 2, hy + 18);
  c.closePath();
  c.fill();

  c.fillStyle = piel;
  c.fill(cuerpo);
  c.fill(cabeza);

  // la tinta que se le mete adentro
  if (e.carga > 0.01) {
    c.save();
    c.clip(cuerpo);
    const k = clamp(e.carga / 3);
    const cant = Math.floor(4 + k * 20);
    for (let i = 0; i < cant; i++) {
      const px = -15 + ruido(i * 3.1, t * 0.12) * 30;
      const py = -80 + ruido(i * 7.7 + 5, t * 0.1) * 52 + ag;
      mancha(c, px, py, (3 + hash(i) * 7) * (0.5 + k), (3 + hash(i + 3) * 7) * (0.5 + k), t, i, 0.85, INK);
    }
    c.restore();
    if (k > 0.3) {
      c.save();
      c.clip(cabeza);
      for (let i = 0; i < Math.floor((k - 0.3) * 8); i++) {
        mancha(c, hx - 8 + ruido(i * 2.3, t * 0.1) * 16, hy - 8 + ruido(i * 5.1, t * 0.1 + 3) * 16, 3 + hash(i) * 3, 3 + hash(i + 1) * 4, t, i + 50, 0.8, INK);
      }
      c.restore();
    }
  }

  // borde de luz fria
  c.strokeStyle = neg ? 'rgba(242,237,226,0.5)' : 'rgba(200,214,228,0.35)';
  c.lineWidth = 1;
  c.stroke(cuerpo);

  // brazos
  c.strokeStyle = piel;
  c.lineWidth = 3;
  if (e.grito > 0.3) {
    c.beginPath(); c.moveTo(7, -76 + ag); c.lineTo(22, -94 + ag); c.stroke();
    c.beginPath(); c.moveTo(-7, -76 + ag); c.lineTo(-20, -96 + ag); c.stroke();
  } else if (e.miedo > 0.6 || ag > 4) {
    c.beginPath(); c.moveTo(7, -76 + ag); c.lineTo(12, -60 + ag); c.lineTo(-3, -62 + ag); c.stroke();
    c.beginPath(); c.moveTo(-7, -76 + ag); c.lineTo(-4, -60 + ag); c.lineTo(8, -64 + ag); c.stroke();
  } else {
    for (const lado of [-1, 1]) {
      const b = -sw * lado * 0.35;
      c.beginPath(); c.moveTo(lado * 7.5, -76 + ag); c.lineTo(lado * 8 + Math.sin(b) * 26, -76 + ag + Math.cos(b) * 28); c.stroke();
    }
  }

  // pelo de arriba y flequillo
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(hx - 1.5, hy - 3.5, 11, 9, inclinacion - 0.15, Math.PI * 0.92, Math.PI * 2.08);
  c.fill();
  c.beginPath();
  c.ellipse(hx - 6.5, hy + 2, 4.2, 10, inclinacion, 0, Math.PI * 2);
  c.fill();

  // cara
  const ox = hx + 5.5 * Math.cos(inclinacion), oy = hy - 0.5;
  c.fillStyle = INK;
  c.beginPath(); c.arc(ox, oy, 1.3, 0, Math.PI * 2); c.fill();
  const bx = hx + 5.5, by = hy + 5.5 + inclinacion * 3;
  if (e.grito > 0.15) {
    c.beginPath(); c.ellipse(bx, by, 2.4 + e.grito * 1.5, 1.5 + e.grito * 3.5, 0, 0, Math.PI * 2); c.fill();
  } else {
    c.strokeStyle = neg ? 'rgba(242,237,226,0.75)' : 'rgba(2,3,4,0.75)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx - 2, by); c.lineTo(bx + 1.5, by + (e.tarareo > 0.1 ? 0 : 0.6)); c.stroke();
  }
  c.restore();

  const f = e.dir * e.s;
  return {
    boca: { x: e.x + jx + bx * f, y: e.y + jy + by * e.s },
    pecho: { x: e.x + jx, y: e.y + jy + (-62 + ag) * e.s },
  };
}

// ---------------------------------------------------------------- el tarareo

/** El halo del tarareo: la unica luz calida del juego es tu voz. */
export function halo(c: Ctx, x: number, y: number, r: number, fuerza: number, ondas: { r: number; a: number }[]) {
  if (fuerza <= 0.01 && ondas.length === 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  if (fuerza > 0.01) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${RGB.calida},${0.34 * fuerza})`);
    g.addColorStop(0.3, `rgba(${RGB.calida},${0.12 * fuerza})`);
    g.addColorStop(1, `rgba(${RGB.calida},0)`);
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  for (const o of ondas) {
    c.strokeStyle = `rgba(${RGB.calida},${Math.min(1, o.a * 1.5)})`;
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, o.r, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

/**
 * El afinador, sin una sola palabra: dos hilos ondulados entre la figura y la
 * nina. El frio es la nota de la figura; el calido, la tuya. Si cantas mas
 * agudo tu hilo queda arriba, si cantas mas grave queda abajo. Cuando las notas
 * coinciden, los hilos se funden y la luz avanza hacia la figura.
 */
export function hilo(c: Ctx, ax: number, ay: number, bx: number, by: number, t: number,
                     presencia: number, dif: number, fuerza: number, progreso: number) {
  if (presencia <= 0.01) return;
  const largo = Math.hypot(bx - ax, by - ay);
  const ang = Math.atan2(by - ay, bx - ax);
  const pasos = Math.max(20, Math.floor(largo / 6));
  const onda = (desfase: number, amp: number, off: number, hasta = 1) => {
    c.beginPath();
    for (let i = 0; i <= pasos * hasta; i++) {
      const s = i / pasos;
      const env = Math.sin(s * Math.PI);
      const px = ax + Math.cos(ang) * largo * s;
      const py = ay + Math.sin(ang) * largo * s;
      const o = Math.sin(s * largo / 11 - t * 5 + desfase) * amp * env + off * env;
      const qx = px - Math.sin(ang) * o, qy = py + Math.cos(ang) * o;
      if (i === 0) c.moveTo(qx, qy); else c.lineTo(qx, qy);
    }
    c.stroke();
  };
  c.save();
  c.lineCap = 'round';
  // la nota de la figura
  c.strokeStyle = `rgba(${RGB.frio},${0.4 * presencia})`;
  c.lineWidth = 1.3;
  onda(0, 6, 0);
  // tu nota
  if (fuerza > 0.02) {
    const off = clamp(-dif * 11, -70, 70);
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(${RGB.calida},${0.75 * fuerza * presencia})`;
    c.lineWidth = 1.6;
    onda(0.2, 6 * (0.5 + fuerza * 0.5), off);
  }
  // lo que ya se igualo
  if (progreso > 0.01) {
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(${RGB.hueso},${0.9 * presencia})`;
    c.lineWidth = 2.6;
    c.shadowColor = C.calida;
    c.shadowBlur = 12;
    // avanza desde la nina (b) hacia la figura (a)
    c.beginPath();
    const desde = 1 - progreso;
    for (let i = Math.floor(pasos * desde); i <= pasos; i++) {
      const s = i / pasos;
      const env = Math.sin(s * Math.PI);
      const px = ax + Math.cos(ang) * largo * s, py = ay + Math.sin(ang) * largo * s;
      const o = Math.sin(s * largo / 11 - t * 5) * 6 * env;
      const qx = px - Math.sin(ang) * o, qy = py + Math.cos(ang) * o;
      if (i === Math.floor(pasos * desde)) c.moveTo(qx, qy); else c.lineTo(qx, qy);
    }
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- las figuras

export type TipoFigura = 'hermana' | 'madre' | 'abuela';

/** Las tres figuras de la casa: recortes de tinta con la cara palida y sin rasgos. */
export function figura(c: Ctx, tipo: TipoFigura, x: number, y: number, s: number, t: number,
                       temblor: number, alpha: number, sem: number, espectral = false, negativo = false) {
  if (alpha <= 0.01) return;
  const CUERPO = negativo ? '#e3ddd1' : '#05070a';
  if (espectral) {
    // la version que sale de la nina en el pozo: tinta que chorrea, sin borde, con la cara encendida
    for (let i = 0; i < 7; i++) {
      tentaculo(c, x + (i - 3) * 9 * s, y - 20 * s, Math.PI / 2 + (i - 3) * 0.12, (40 + hash(sem + i) * 60) * s, 6 * s, t, sem + i * 3, 1.1, alpha * 0.9);
    }
    mancha(c, x + 8 * s, y - 70 * s, 34 * s, 70 * s, t, sem, alpha * 0.55);
  }
  const J = (i: number) => rc(sem + i * 3.3, t * 16) * temblor * 2.4;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(s, s);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.fillStyle = CUERPO;
  c.strokeStyle = CUERPO;
  const cara = negativo ? 'rgba(12,13,16,0.92)' : espectral ? 'rgba(236,232,224,0.95)' : 'rgba(214,209,199,0.92)';
  const borde = espectral ? 'rgba(0,0,0,0)' : negativo ? 'rgba(20,22,26,0.5)' : 'rgba(210,222,232,0.6)';
  if (espectral) { c.shadowColor = 'rgba(0,0,0,0)'; }

  if (tipo === 'hermana') {
    // sentada en el borde de la cama, abrazando un muneco
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(-2, -46); c.lineTo(20 + J(1), -48); c.lineTo(24 + J(2), -2); c.stroke();
    const torso = new Path2D();
    torso.moveTo(-12 + J(3), -44); torso.lineTo(12 + J(4), -46); torso.lineTo(16 + J(5), -98); torso.lineTo(-4 + J(6), -100);
    torso.closePath();
    c.fill(torso);
    c.strokeStyle = borde; c.lineWidth = 1.6; c.stroke(torso);
    // el muneco, con dos brillos de ojos
    c.fillStyle = '#9d978b';
    c.beginPath(); c.ellipse(24 + J(7), -72, 7, 10, 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(25 + J(7), -86, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0b0d10';
    c.fillRect(24 + J(7), -88, 1.6, 1.6); c.fillRect(28 + J(7), -88, 1.6, 1.6);
    c.strokeStyle = CUERPO; c.lineWidth = 6;
    c.beginPath(); c.moveTo(12, -92); c.lineTo(30 + J(8), -76); c.lineTo(16, -66); c.stroke();
    // cabeza gacha
    c.fillStyle = CUERPO;
    c.beginPath(); c.ellipse(12 + J(9), -112, 12, 13, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = cara;
    c.beginPath(); c.ellipse(17 + J(9), -109, 6, 8, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = CUERPO;
    for (let i = 0; i < 5; i++) { c.fillRect(8 + i * 3 + J(10), -120, 2.4, 22 + hash(i) * 10); }
  } else if (tipo === 'madre') {
    // de pie, rigida, con una mano en la cortina
    const cuerpo = new Path2D();
    cuerpo.moveTo(-22 + J(1), -2); cuerpo.lineTo(22 + J(2), -2); cuerpo.lineTo(13 + J(3), -112);
    cuerpo.lineTo(17 + J(4), -160); cuerpo.lineTo(-15 + J(5), -160); cuerpo.lineTo(-12 + J(6), -112);
    cuerpo.closePath();
    c.fill(cuerpo);
    c.strokeStyle = borde; c.lineWidth = 1.6; c.stroke(cuerpo);
    c.strokeStyle = CUERPO; c.lineWidth = 7;
    c.beginPath(); c.moveTo(14, -154); c.lineTo(30 + J(7), -168); c.lineTo(34 + J(8), -190); c.stroke();
    c.beginPath(); c.moveTo(-12, -154); c.lineTo(-16 + J(9), -100); c.stroke();
    c.fillStyle = CUERPO;
    c.beginPath(); c.ellipse(1 + J(10), -178, 12, 14, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-8 + J(10), -188, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = cara;
    c.beginPath(); c.ellipse(6 + J(10), -176, 6, 9, 0.1, 0, Math.PI * 2); c.fill();
  } else {
    // de rodillas, encorvada, las manos juntas
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(0, -38); c.lineTo(16 + J(1), -8); c.lineTo(-20 + J(2), -4); c.stroke();
    const manto = new Path2D();
    manto.moveTo(-18 + J(3), -34); manto.lineTo(14 + J(4), -40); manto.lineTo(22 + J(5), -92);
    manto.lineTo(10 + J(6), -112); manto.lineTo(-10 + J(7), -96);
    manto.closePath();
    c.fill(manto);
    c.strokeStyle = borde; c.lineWidth = 1.6; c.stroke(manto);
    c.strokeStyle = CUERPO; c.lineWidth = 6;
    c.beginPath(); c.moveTo(16, -88); c.lineTo(32 + J(8), -96); c.lineTo(30 + J(9), -110); c.stroke();
    c.fillStyle = CUERPO;
    c.beginPath(); c.ellipse(20 + J(10), -110, 11, 12, 0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = cara;
    c.beginPath(); c.ellipse(25 + J(10), -107, 5, 7, 0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9d978b';
    c.beginPath(); c.arc(32 + J(9), -106, 2.4, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/**
 * La figura de frente, para el plano de primera persona: gira y te mira.
 * La cara sigue sin rasgos; los rasgos aparecen solo en el retrato del dialogo.
 */
export function figuraFrente(c: Ctx, tipo: TipoFigura, x: number, y: number, s: number, t: number,
                             temblor: number, alpha: number, negativo = false) {
  if (alpha <= 0.01) return;
  const J = (i: number) => rc(i * 3.3, t * 16) * temblor * 2.4;
  const CU = negativo ? '#e3ddd1' : '#05070a';
  const CA = negativo ? 'rgba(12,13,16,0.92)' : 'rgba(222,217,207,0.95)';
  const BO = negativo ? 'rgba(20,22,26,0.5)' : 'rgba(210,222,232,0.55)';
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = CU;
  c.strokeStyle = BO;
  c.lineWidth = 1.5;
  const cuerpo = new Path2D();
  if (tipo === 'hermana') {
    // sentada en el borde de la cama: las piernas colgando, los hombros encogidos
    cuerpo.moveTo(-22 + J(3), -46); cuerpo.lineTo(22 + J(4), -46);
    cuerpo.lineTo(28 + J(5), -100); cuerpo.lineTo(-28 + J(6), -100);
    cuerpo.closePath();
    c.fill(new Path2D(`M ${-26 + J(1)} -46 L ${26 + J(2)} -46 L ${24} -34 L ${-24} -34 Z`));
    c.save(); c.strokeStyle = CU; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, -36); c.lineTo(-12 + J(7), -2); c.moveTo(10, -36); c.lineTo(12 + J(8), -2); c.stroke();
    // los brazos cruzados sobre el muneco
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(-26, -94); c.quadraticCurveTo(-30, -70, 8, -66); c.moveTo(26, -94); c.quadraticCurveTo(30, -72, -8, -64); c.stroke();
    c.restore();
  } else if (tipo === 'madre') {
    cuerpo.moveTo(-34 + J(1), 0); cuerpo.lineTo(34 + J(2), 0); cuerpo.lineTo(20 + J(3), -110);
    cuerpo.lineTo(26 + J(4), -160); cuerpo.lineTo(-26 + J(5), -160); cuerpo.lineTo(-20 + J(6), -110);
    cuerpo.closePath();
  } else {
    cuerpo.moveTo(-40 + J(1), 0); cuerpo.lineTo(40 + J(2), 0); cuerpo.lineTo(34 + J(3), -60);
    cuerpo.lineTo(22 + J(4), -100); cuerpo.lineTo(-22 + J(5), -100); cuerpo.lineTo(-34 + J(6), -60);
    cuerpo.closePath();
  }
  c.fill(cuerpo);
  c.stroke(cuerpo);
  const cabezaY = tipo === 'madre' ? -180 : tipo === 'hermana' ? -122 : -118;
  const R = tipo === 'madre' ? 15 : 14;
  c.fillStyle = CU;
  c.beginPath(); c.ellipse(J(9), cabezaY, R + 3, R + 5, 0, 0, Math.PI * 2); c.fill();
  if (tipo === 'madre') { c.beginPath(); c.arc(J(9), cabezaY - R - 8, 9, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = CA;
  c.beginPath(); c.ellipse(J(9), cabezaY + 2, R * 0.72, R, 0, 0, Math.PI * 2); c.fill();
  if (tipo === 'hermana') {
    // el pelo le cae sobre la cara; el muneco con dos brillos
    c.fillStyle = CU;
    for (let i = 0; i < 7; i++) c.fillRect(-R + i * 4.5 + J(10), cabezaY - R - 4, 2.6, R * 1.6 + hash(i) * 12);
    c.fillStyle = negativo ? '#3a3a3e' : '#a7a092';
    c.beginPath(); c.arc(J(7), -70, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = negativo ? '#f3eee4' : '#0b0d10';
    c.fillRect(-5 + J(7), -73, 2, 2); c.fillRect(3 + J(7), -73, 2, 2);
  }
  if (tipo === 'abuela') {
    c.fillStyle = negativo ? '#cfc8ba' : '#1d252e';
    c.beginPath(); c.moveTo(-R - 8, cabezaY + 16); c.quadraticCurveTo(0, cabezaY - R * 2.4, R + 8, cabezaY + 16); c.lineTo(R, cabezaY); c.quadraticCurveTo(0, cabezaY - R * 1.6, -R, cabezaY); c.fill();
    c.fillStyle = negativo ? '#f3eee4' : '#8f887b';
    c.beginPath(); c.arc(J(8), -86, 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = CU; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-18, -90); c.lineTo(J(8), -84); c.lineTo(18, -90); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- la gente de afuera

/** Una persona que, con miedo, deja de serlo. */
export function persona(c: Ctx, x: number, y: number, s: number, f: number, k: number, t: number, sem: number,
                        alto: number, fase = 0) {
  c.save();
  c.translate(x, y);
  c.scale(s * f, s);
  const J = (i: number) => rc(sem + i * 2.3, t * 12) * k * 3;
  const Hh = alto * (1 + k * 0.25);
  const hombro = -Hh * 0.8, cadera = -Hh * 0.46, ancho = alto * 0.15;
  // sombra que lo rodea
  if (k > 0.05) {
    for (let i = 0; i < 5; i++) {
      tentaculo(c, J(i), cadera, -Math.PI / 2 + (i - 2) * 0.5, Hh * 0.6, 12, t, sem + i * 3, 1.2, 0.35 * k);
    }
  }
  c.fillStyle = '#04060a';
  c.strokeStyle = '#04060a';
  c.lineCap = 'round';
  const sw = Math.sin(fase) * 0.4;
  c.lineWidth = 5 - k * 2;
  for (const lado of [-1, 1]) {
    c.beginPath(); c.moveTo(lado * 3, cadera); c.lineTo(Math.sin(sw * lado) * Hh * 0.2 + J(lado), 0); c.stroke();
  }
  const torso = new Path2D();
  torso.moveTo(-ancho + J(1), cadera); torso.lineTo(ancho + J(2), cadera);
  torso.lineTo(ancho * 0.9 + J(3), hombro); torso.lineTo(-ancho * 0.9 + J(4), hombro);
  torso.closePath();
  c.fill(torso);
  c.strokeStyle = `rgba(200,214,228,${0.28 - k * 0.15})`;
  c.lineWidth = 1.1;
  c.stroke(torso);
  c.strokeStyle = '#04060a';
  const largo = Hh * 0.4 + k * Hh * 0.4;
  for (const lado of [-1, 1]) {
    const b = Math.sin(fase + Math.PI) * 0.3 * lado + Math.sin(t * 1.5 + sem + lado) * k * 0.3;
    const hx = Math.sin(b) * largo + lado * 3, hy = hombro + Math.cos(b) * largo;
    c.lineWidth = 4 - k;
    c.beginPath(); c.moveTo(lado * ancho * 0.7, hombro + 3); c.lineTo(hx + J(lado + 5), hy); c.stroke();
    if (k > 0.45) {
      c.lineWidth = 1.2;
      for (let g = -1; g <= 1; g++) { c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + g * 3 + 2, hy + 7 + k * 7); c.stroke(); }
    }
  }
  const cuello = Hh * 0.04 + k * Hh * 0.3;
  const cx = J(7) + Math.sin(t * 1.1 + sem) * k * 10, cy = hombro - cuello;
  c.lineWidth = 5 - k * 1.5;
  c.beginPath(); c.moveTo(0, hombro); c.quadraticCurveTo(J(8) + k * 8, hombro - cuello / 2, cx, cy); c.stroke();
  const R = Hh * 0.085 * (1 + k * 0.6);
  c.save();
  c.translate(cx, cy - R * 0.8);
  c.rotate(Math.sin(t * 1.3 + sem) * k * 0.5 + k * 0.3);
  c.fillStyle = '#04060a';
  c.beginPath(); c.ellipse(0, 0, R * (1 + k * 0.15), R, 0, 0, Math.PI * 2); c.fill();
  if (k > 0.2) {
    const ojos = 1 + Math.floor(k * 7);
    c.shadowColor = C.hueso; c.shadowBlur = 6;
    for (let i = 0; i < ojos; i++) {
      const a = hash(sem + i * 5.3) * Math.PI * 2;
      const d = i === 0 ? 0 : hash(sem + i * 2.1) * R * 0.8;
      c.fillStyle = C.hueso;
      c.beginPath(); c.arc(R * 0.35 + Math.cos(a) * d * 0.8, -R * 0.15 + Math.sin(a) * d * 0.7, 1.2 + k * 2, 0, Math.PI * 2); c.fill();
    }
    c.shadowBlur = 0;
    if (k > 0.35) {
      const a = (k - 0.35) / 0.65;
      c.fillStyle = C.tinta;
      c.beginPath();
      c.moveTo(-R * 0.1, R * 0.3);
      c.quadraticCurveTo(R * 0.5, R * (0.4 + a * 1.1), R * 1.1 + a * R * 0.3, R * 0.05);
      c.quadraticCurveTo(R * 0.5, R * 0.35, -R * 0.1, R * 0.3);
      c.fill();
      c.fillStyle = C.hueso;
      for (let i = 0; i < 4 + Math.floor(a * 5); i++) {
        const tx = i * R * 0.13, ty = R * 0.3 - i * R * 0.025;
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + 2, ty); c.lineTo(tx + 1, ty + 2.5 + a * 3); c.fill();
      }
    }
  }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- arquitectura

export function paredInterior(c: Ctx, x0: number, x1: number, techo: number, piso: number, sem: number) {
  c.fillStyle = C.pared;
  c.fillRect(x0, techo, x1 - x0, piso - techo);
  // empapelado apenas visible
  c.fillStyle = 'rgba(200,214,228,0.018)';
  for (let x = x0 + 10; x < x1; x += 34) c.fillRect(x, techo, 12, piso - techo);
  // manchas de humedad
  for (let i = 0; i < Math.floor((x1 - x0) / 220); i++) {
    const mx = x0 + hash(sem + i) * (x1 - x0), my = techo + 20 + hash(sem + i + 9) * 80;
    const g = c.createRadialGradient(mx, my, 0, mx, my, 50 + hash(i) * 70);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(mx - 130, my - 130, 260, 260);
  }
  c.fillStyle = C.zocalo;
  c.fillRect(x0, piso - 16, x1 - x0, 16);
  c.fillStyle = C.piso;
  c.fillRect(x0, piso, x1 - x0, H - piso);
  c.fillStyle = 'rgba(200,214,228,0.05)';
  c.fillRect(x0, piso, x1 - x0, 1);
  c.fillStyle = '#05080b';
  c.fillRect(x0, 0, x1 - x0, techo);
}

export function vano(c: Ctx, x: number, techo: number, piso: number) {
  c.fillStyle = '#030406';
  c.fillRect(x - 36, techo + 60, 72, piso - techo - 60);
  c.fillStyle = '#0a0f15';
  c.fillRect(x - 44, techo + 52, 8, piso - techo - 52);
  c.fillRect(x + 36, techo + 52, 8, piso - techo - 52);
  c.fillRect(x - 44, techo + 52, 88, 8);
}

/** Ventana con la noche afuera. `relampago` 0..1 la ilumina. */
export function ventana(c: Ctx, x: number, y: number, w: number, h: number, t: number, relampago = 0, cortina = 0) {
  const g = c.createLinearGradient(x, y, x, y + h);
  const b = relampago;
  g.addColorStop(0, `rgb(${18 + b * 190},${26 + b * 196},${38 + b * 200})`);
  g.addColorStop(1, `rgb(${8 + b * 120},${12 + b * 130},${18 + b * 140})`);
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  // lluvia
  c.strokeStyle = `rgba(160,180,200,${0.12 + b * 0.3})`;
  c.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const rx = x + hash(i * 3.7) * w, ry = y + ((hash(i) * h + t * 240) % h);
    c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 3, ry + 12); c.stroke();
  }
  c.fillStyle = '#05080b';
  c.fillRect(x - 6, y - 6, w + 12, 6); c.fillRect(x - 6, y + h, w + 12, 8);
  c.fillRect(x - 6, y, 6, h); c.fillRect(x + w, y, 6, h);
  c.fillRect(x + w / 2 - 2, y, 4, h); c.fillRect(x, y + h / 2 - 2, w, 4);
  if (cortina > 0) {
    c.fillStyle = 'rgba(175,182,188,0.55)';
    const cw = w * 0.5 * cortina;
    c.fillRect(x - 4, y - 4, cw, h + 8);
    c.fillRect(x + w + 4 - cw * 0.7, y - 4, cw * 0.7, h + 8);
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + 2 + i * cw / 6, y - 4); c.lineTo(x + 2 + i * cw / 6 + Math.sin(t + i) * 2, y + h + 4); c.stroke(); }
  }
}

export function cama(c: Ctx, x: number, piso: number, w = 150) {
  c.fillStyle = '#0a0e13';
  c.fillRect(x - w / 2, piso - 44, w, 30);
  c.fillRect(x - w / 2 - 4, piso - 80, 8, 80);
  c.fillRect(x + w / 2 - 4, piso - 58, 8, 58);
  c.fillStyle = '#141b23';
  c.fillRect(x - w / 2 + 4, piso - 52, w - 8, 10);
  c.fillStyle = '#1b232c';
  c.beginPath(); c.ellipse(x - w / 2 + 26, piso - 56, 20, 8, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(200,214,228,0.12)';
  c.strokeRect(x - w / 2, piso - 52, w, 38);
}

/** El retrato familiar: tres figuras y un hueco con forma de nina. */
export function retrato(c: Ctx, x: number, y: number, brillo: number, t: number) {
  const w = 120, h = 90;
  c.fillStyle = '#0b0f14';
  c.fillRect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16);
  c.fillStyle = '#6e6a62';
  c.fillRect(x - w / 2, y - h / 2, w, h);
  c.fillStyle = '#2a2a28';
  for (const [dx, hh] of [[-34, 58], [0, 64], [30, 50]] as const) {
    c.beginPath(); c.ellipse(x + dx, y + h / 2 - hh + 8, 7, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(x + dx - 10, y + h / 2 - hh + 16, 20, hh - 16);
  }
  // el hueco
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath(); c.ellipse(x + 52 - 8, y + h / 2 - 36, 5, 6, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(x + 52 - 15, y + h / 2 - 30, 14, 30);
  c.restore();
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(${RGB.hueso},${0.12 + brillo * 0.4 + Math.sin(t * 2) * 0.03})`;
  c.beginPath(); c.ellipse(x + 44, y + h / 2 - 36, 5, 6, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(x + 37, y + h / 2 - 30, 14, 30);
  c.restore();
}

export function puertaSalida(c: Ctx, x: number, piso: number, abierta: number) {
  c.fillStyle = '#05070a';
  c.fillRect(x - 40, piso - 150, 80, 150);
  c.fillStyle = `rgba(${RGB.frio},${0.15 + abierta * 0.7})`;
  c.fillRect(x - 32, piso - 142, 64 * abierta, 142);
  c.fillStyle = '#0c1117';
  c.fillRect(x - 32 + 64 * abierta, piso - 142, 64 * (1 - abierta), 142);
}

export function edificio(c: Ctx, x: number, w: number, h: number, base: number, t: number, miedo: number, sem: number) {
  const m2 = miedo * miedo;
  const lean = Math.sin(t * 0.5 + sem) * m2 * 26;
  c.fillStyle = ['#0b1017', '#0d131b', '#0a0e14'][Math.floor(hash(sem) * 3)];
  c.beginPath();
  c.moveTo(x, base); c.lineTo(x + w, base); c.lineTo(x + w + lean, base - h); c.lineTo(x + lean, base - h);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(200,214,228,0.06)';
  c.stroke();
  const cols = Math.max(1, Math.floor(w / 64)), filas = Math.max(1, Math.floor((h - 80) / 70));
  for (let f = 0; f < filas; f++) for (let k = 0; k < cols; k++) {
    const r = hash(sem * 7 + f * 13 + k * 3);
    if (r < 0.25) continue;
    const fr = (40 + f * 70) / h;
    const vx = x + 16 + k * (w - 32) / cols + lean * fr, vy = base - h + 30 + f * 70;
    const luz = r > 0.85 && hash(Math.floor(t * 8) + sem + f + k) > miedo * 0.3;
    c.fillStyle = luz ? 'rgba(150,172,190,0.35)' : '#070a0e';
    c.fillRect(vx, vy, (w - 32) / cols - 18, 36);
    if (luz && miedo > 0.5 && r > 0.93) {
      c.fillStyle = C.tinta;
      c.beginPath(); c.arc(vx + 12, vy + 24, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.hueso; c.fillRect(vx + 9, vy + 21, 1.5, 1.5); c.fillRect(vx + 14, vy + 21, 1.5, 1.5);
    }
  }
}

export function farol(c: Ctx, x: number, base: number, encendido: number) {
  c.fillStyle = '#10161d';
  c.fillRect(x - 2, base - 250, 4, 250);
  c.fillRect(x - 24, base - 252, 24, 3);
  c.fillStyle = encendido > 0.5 ? '#e8eef2' : '#1d252e';
  c.fillRect(x - 30, base - 250, 12, 5);
}

/** Pasto alto: se aparta alrededor de la nina cuando tararea. */
export function pastizal(c: Ctx, x0: number, x1: number, base: number, alto: number, t: number,
                         apartaX: number, apartaR: number, tono: string, sem: number) {
  c.strokeStyle = tono;
  c.lineCap = 'round';
  for (let x = x0; x < x1; x += 5) {
    const i = Math.floor(x);
    const h = alto * (0.6 + hash(i * 0.37 + sem) * 0.6);
    const d = x - apartaX;
    const aparta = apartaR > 0 ? clamp(1 - Math.abs(d) / apartaR) : 0;
    const viento = Math.sin(t * 1.2 + x * 0.02) * 10 + rc(x * 0.05, t * 0.3) * 6;
    const doblez = viento + Math.sign(d || 1) * aparta * 60;
    c.lineWidth = 1.2 + hash(i) * 1.8;
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + doblez * 0.3, base - h * 0.5, x + doblez, base - h * (1 - aparta * 0.35));
    c.stroke();
  }
}

/** El aljibe: brocal redondo pintado de cal, descascarado, con el ladrillo abajo. */
export function aljibe(c: Ctx, x: number, base: number, s: number, t: number) {
  c.save();
  c.translate(x, base);
  c.scale(s, s);
  c.fillStyle = '#c9c4b8';
  c.beginPath();
  c.moveTo(-70, 0); c.lineTo(-70, -64); c.quadraticCurveTo(0, -80, 70, -64); c.lineTo(70, 0);
  c.quadraticCurveTo(0, 14, -70, 0);
  c.fill();
  c.fillStyle = '#6b3b2c';
  for (let i = 0; i < 9; i++) {
    const bx = -60 + hash(i * 3.1) * 110, by = -54 + hash(i * 5.7) * 44;
    c.fillRect(bx, by, 14 + hash(i) * 10, 6);
  }
  c.fillStyle = '#020304';
  c.beginPath(); c.ellipse(0, -66, 66, 12, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#d8d3c7'; c.lineWidth = 3;
  c.beginPath(); c.ellipse(0, -66, 68, 13, 0, 0, Math.PI * 2); c.stroke();
  // el arco de hierro
  c.strokeStyle = '#0a0d10'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-60, -66); c.quadraticCurveTo(0, -210, 60, -66); c.stroke();
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -164); c.lineTo(0, -120 + Math.sin(t) * 2); c.stroke();
  c.restore();
}

export function ruda(c: Ctx, x: number, base: number, alto: number, t: number, sem: number, tono = '#070b0f') {
  // tallos que se abren desde el piso, con hojitas a lo largo: un arbusto, no una nube
  c.strokeStyle = tono;
  c.fillStyle = tono;
  c.lineCap = 'round';
  const tallos = 9;
  for (let i = 0; i < tallos; i++) {
    const a = -Math.PI / 2 + (i / (tallos - 1) - 0.5) * 1.3 + (hash(sem + i) - 0.5) * 0.3;
    const l = alto * (0.55 + hash(sem + i * 3) * 0.45);
    const sw = Math.sin(t * 0.8 + i + sem) * 0.04;
    const cx = x + Math.cos(a + sw) * l * 0.5, cy = base + Math.sin(a + sw) * l * 0.5;
    const ex = x + Math.cos(a + sw * 2) * l, ey = base + Math.sin(a + sw * 2) * l;
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(cx, cy, ex, ey); c.stroke();
    for (let k = 3; k <= 10; k++) {
      const u = k / 10;
      const px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * base + 2 * (1 - u) * u * cy + u * u * ey;
      const lado = k % 2 ? 1 : -1;
      const r = 3.5 + hash(sem + i * 7 + k) * 3.5;
      c.beginPath();
      c.ellipse(px + lado * r * 0.8, py, r, r * 0.55, a + lado * 0.9, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// ---------------------------------------------------------------- atmosfera

let nieblaSprite: HTMLCanvasElement | null = null;
function spriteNiebla() {
  if (nieblaSprite) return nieblaSprite;
  const s = document.createElement('canvas');
  s.width = 1024; s.height = 256;
  const c = s.getContext('2d')!;
  for (let i = 0; i < 60; i++) {
    const x = hash(i) * 1024, y = 60 + hash(i + 7) * 140, r = 60 + hash(i + 3) * 120;
    for (const dx of [-1024, 0, 1024]) {
      const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  nieblaSprite = s;
  return s;
}

/** Bandas de niebla que se mueven con parallax. */
export function niebla(c: Ctx, camX: number, factor: number, y: number, alto: number, alpha: number, t: number) {
  const s = spriteNiebla();
  const off = (camX * factor + t * 12) % 1024;
  c.save();
  c.globalAlpha = alpha;
  c.globalCompositeOperation = 'lighter';
  c.filter = 'none';
  for (let x = -off - 1024; x < W + 1024; x += 1024) c.drawImage(s, x, y, 1024, alto);
  c.restore();
}

export interface Mota { x: number; y: number; vx: number; vy: number; vida: number; r: number; }

export function motas(c: Ctx, ps: Mota[], camX: number, color: string = RGB.frio) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const p of ps) {
    c.fillStyle = `rgba(${color},${0.5 * clamp(p.vida)})`;
    c.beginPath(); c.arc(p.x - camX, p.y, p.r, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- glifos (lo unico que se "lee")

export function glifoFlecha(c: Ctx, x: number, y: number, a: number, t: number) {
  if (a <= 0.01) return;
  const d = Math.sin(t * 3) * 5;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = C.hueso; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 14 + d, y); c.lineTo(x + 14 + d, y); c.moveTo(x + 6 + d, y - 8); c.lineTo(x + 14 + d, y); c.lineTo(x + 6 + d, y + 8); c.stroke();
  c.restore();
}

/** "mmm": una boca cerrada y tres ondas. Tararea. */
export function glifoTarareo(c: Ctx, x: number, y: number, a: number, t: number) {
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = C.calida; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 7, y); c.quadraticCurveTo(x, y + 3, x + 7, y); c.stroke();
  for (let i = 0; i < 3; i++) {
    const fase = (t * 0.9 + i / 3) % 1;
    c.globalAlpha = a * (1 - fase);
    c.beginPath(); c.arc(x, y, 12 + fase * 26, -0.7, 0.7); c.stroke();
    c.beginPath(); c.arc(x, y, 12 + fase * 26, Math.PI - 0.7, Math.PI + 0.7); c.stroke();
  }
  c.restore();
}

/** Una boca abierta con ondas quebradas. Grita. */
export function glifoGrito(c: Ctx, x: number, y: number, a: number, t: number) {
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = C.hueso; c.fillStyle = C.hueso; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.ellipse(x, y, 9, 13 + Math.sin(t * 6) * 2, 0, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 3; i++) {
    const fase = (t * 1.4 + i / 3) % 1;
    const r = 20 + fase * 40;
    c.globalAlpha = a * (1 - fase);
    c.beginPath();
    for (let k = 0; k <= 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const rr = r + (k % 2 ? 5 : -5);
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
  }
  c.restore();
}

/** Una tecla dibujada, para cuando no hay microfono: barra espaciadora o Enter. */
export function glifoTecla(c: Ctx, x: number, y: number, a: number, cual: 'espacio' | 'enter') {
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a * 0.8;
  c.strokeStyle = C.hueso; c.lineWidth = 1.5; c.lineJoin = 'round';
  const w = cual === 'espacio' ? 54 : 26;
  c.beginPath();
  c.roundRect(x - w / 2, y - 9, w, 18, 4);
  c.stroke();
  if (cual === 'enter') {
    c.beginPath(); c.moveTo(x + 6, y - 4); c.lineTo(x + 6, y + 2); c.lineTo(x - 6, y + 2); c.moveTo(x - 3, y - 1); c.lineTo(x - 6, y + 2); c.lineTo(x - 3, y + 5); c.stroke();
  }
  c.restore();
}

/** Auriculares y microfono, para la pantalla de titulo. */
export function glifoAuriculares(c: Ctx, x: number, y: number, a: number) {
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = C.hueso; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, 16, Math.PI, 0); c.stroke();
  c.fillStyle = C.hueso;
  c.fillRect(x - 19, y - 2, 6, 12); c.fillRect(x + 13, y - 2, 6, 12);
  c.beginPath(); c.moveTo(x - 16, y + 10); c.quadraticCurveTo(x - 14, y + 22, x - 2, y + 22); c.stroke();
  c.beginPath(); c.arc(x + 1, y + 22, 2.5, 0, Math.PI * 2); c.fill();
  c.restore();
}

export function titulo(c: Ctx, x: number, y: number, tam: number, a = 1) {
  c.save();
  c.globalAlpha = a;
  c.fillStyle = C.hueso;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `${tam}px ${TIPO}`;
  c.shadowColor = 'rgba(0,0,0,0.9)';
  c.shadowBlur = 30;
  c.fillText('AUDERE', x, y);
  c.restore();
}

/** Anillos de ladrillo tileables en horizontal: el shader los enrosca en el pozo. */
export function ladrillos(c: Ctx, desplaz: number, t: number, luzFondo: number) {
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  const filas = 40;
  for (let f = 0; f < filas; f++) {
    const y0 = ((f * 18 + desplaz) % (filas * 18)) - 18;
    const prof = 1 - y0 / H;
    const cols = 26;
    const off = (f % 2) * (W / cols / 2);
    for (let k = -1; k <= cols; k++) {
      const v = 10 + hash(f * 31 + k + Math.floor((f * 18 + desplaz) / (filas * 18)) * 97) * 24 + Math.pow(prof, 2.2) * 70;
      c.fillStyle = `rgb(${v},${v - 3},${v - 6})`;
      c.fillRect(k * (W / cols) + off + 1, y0 + 1, W / cols - 3, 15);
    }
  }
  // luz al fondo del pozo (arriba del lienzo = centro del pozo)
  const g = c.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, `rgba(${RGB.hueso},${luzFondo})`);
  g.addColorStop(1, `rgba(${RGB.hueso},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, 180);
  void t;
}
