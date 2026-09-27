import { hash, rc } from '../config';

/**
 * PINTURA — los placeholders.
 *
 * Nada de esto es el arte final: son dibujos provisorios con las medidas, las
 * poses y los cuadros correctos, para que el equipo tenga una plantilla exacta
 * sobre la cual dibujar. exportar.html los guarda como PNG en public/assets;
 * el juego siempre lee los PNG. Cuando el equipo devuelve un PNG dibujado,
 * se reemplaza el archivo y listo.
 *
 * Dos paletas: el PRESENTE (noche, frio) y el RECUERDO (siesta, foto vieja).
 */

type Ctx = CanvasRenderingContext2D;

export const PAL = {
  presente: {
    piel: '#d6d1c7', pielSombra: '#a9a398', linea: '#06080b', borde: 'rgba(170,190,206,0.7)',
    ojo: '#0b0d10', fondo: '#0d131a',
  },
  recuerdo: {
    piel: '#ecd0a8', pielSombra: '#c9a57c', linea: '#4b3923', borde: 'rgba(255,246,222,0.75)',
    ojo: '#3a2a1a', fondo: '#efe2c4',
  },
} as const;

export type Epoca = keyof typeof PAL;

export interface Aspecto {
  epoca: Epoca;
  /** alto del personaje en px, dentro del cuadro */
  alto: number;
  cuerpo: 'nina' | 'joven' | 'mujer' | 'vieja';
  pose: 'pie' | 'sentada' | 'arrodillada';
  pelo: { color: string; forma: 'largo' | 'rubia' | 'rodete' | 'panuelo' | 'canoso' | 'melena' };
  ropa: string;
  ropa2?: string;
  largoRopa?: number;
  prop?: 'muneca' | 'cigarrillo' | 'mandarina' | 'rosario' | 'manos_boca' | 'manos_rezo' | 'nada';
  miedo?: boolean;
}

export type Anim = 'quieta' | 'camina' | 'tararea' | 'tiembla' | 'cae' | 'duerme';

// ---------------------------------------------------------------- personajes de perfil

/**
 * Un personaje de perfil, mirando a la derecha, con los pies en el centro de
 * abajo del cuadro. `cuadro` y `total` definen la fase de la animacion.
 */
export function perfil(c: Ctx, w: number, h: number, a: Aspecto, anim: Anim, cuadro: number, total: number) {
  const P = PAL[a.epoca];
  const H = a.alto;
  const fase = (cuadro / total) * Math.PI * 2;
  const nina = a.cuerpo === 'nina';
  const R = H * (nina ? 0.12 : 0.09);
  let jx = 0, jy = 0;
  if (anim === 'tiembla' || a.miedo) { jx = (hash(cuadro * 7.1) - 0.5) * 3; jy = (hash(cuadro * 3.3) - 0.5) * 2; }
  let bob = 0;
  if (anim === 'quieta' || anim === 'tararea') bob = Math.sin(fase) * H * 0.006;
  if (anim === 'camina') bob = -Math.abs(Math.sin(fase)) * H * 0.016;
  const caer = anim === 'cae' ? Math.min(1, cuadro / Math.max(1, total - 2)) : 0;
  const pose: 'pie' | 'sentada' | 'arrodillada' | 'piso' = anim === 'duerme' ? 'sentada' : caer > 0.6 ? 'piso' : a.pose;

  c.save();
  c.translate(w / 2 + jx, h - 8 + bob + jy);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // puntos clave segun la pose
  let cad: [number, number], hom: [number, number];
  let piernas: [number, number][][];
  const sw = anim === 'camina' ? Math.sin(fase) * 0.45 : 0;
  if (pose === 'pie') {
    const baja = caer * H * 0.1;
    cad = [0, -H * 0.47 + baja];
    hom = [H * 0.01, -H * 0.8 + baja];
    piernas = [-1, 1].map((l) => {
      const ang = sw * l;
      const rod: [number, number] = [cad[0] + Math.sin(ang) * H * 0.23 + l * 2 + caer * H * 0.08, cad[1] + Math.cos(ang) * H * 0.23];
      const tob: [number, number] = [rod[0] + Math.sin(ang * 0.6 - Math.max(0, -ang) * 0.8) * H * 0.23 - caer * H * 0.06, -2];
      return [[cad[0] + l * 3, cad[1]], rod, tob];
    });
  } else if (pose === 'sentada') {
    const asiento = H * 0.26;
    cad = [0, -asiento];
    hom = [0, -asiento - H * 0.34];
    piernas = [[[0, -asiento], [H * 0.22, -asiento], [H * 0.24, -2]], [[-3, -asiento], [H * 0.19, -asiento + 3], [H * 0.2, -2]]];
  } else if (pose === 'piso') {
    cad = [0, -H * 0.06];
    hom = [-H * 0.05, -H * 0.38];
    piernas = [[[0, -H * 0.06], [H * 0.2, -H * 0.2], [H * 0.3, -2]], [[-3, -H * 0.06], [H * 0.17, -H * 0.17], [H * 0.27, -2]]];
  } else {
    cad = [H * 0.02, -H * 0.27];
    hom = [H * 0.1, -H * 0.56];
    piernas = [[[H * 0.02, -H * 0.27], [H * 0.1, -3], [-H * 0.18, -3]], [[0, -H * 0.27], [H * 0.07, -3], [-H * 0.21, -3]]];
  }

  const incl = anim === 'tararea' ? -0.16 : a.miedo || anim === 'tiembla' ? 0.2 : pose === 'arrodillada' ? 0.3 : pose === 'piso' ? 0.35 : anim === 'duerme' ? 0.5 : 0;
  const cab: [number, number] = [hom[0] + (pose === 'arrodillada' ? H * 0.04 : 0) + incl * R * 0.6, hom[1] - H * 0.035 - R];

  pelo(c, a, cab[0], cab[1], R, 'atras', fase, incl);

  piernas.forEach((pts, i) => miembro(c, pts, Math.max(3, H * 0.026), i === 0 ? P.pielSombra : P.piel, P.linea));
  c.fillStyle = a.epoca === 'presente' ? '#1a1f26' : '#6b4a2a';
  for (const pts of piernas) { const [x, y] = pts[pts.length - 1]; c.beginPath(); c.ellipse(x + H * 0.02, y, H * 0.03, H * 0.014, 0, 0, Math.PI * 2); c.fill(); }

  brazo(c, a, anim, fase, hom, H, R, cab, 'atras', pose);

  // vestido
  const ancho = H * (nina ? 0.1 : 0.085);
  const vestido = new Path2D();
  if (pose === 'pie') {
    const bajo = cad[1] + (a.largoRopa ?? 0.3) * H;
    vestido.moveTo(hom[0] - ancho, hom[1]);
    vestido.quadraticCurveTo(hom[0] + ancho * 1.3, hom[1] - 2, hom[0] + ancho * 1.05, hom[1] + H * 0.08);
    vestido.lineTo(ancho * 1.25 + sw * 6, cad[1] + H * 0.02);
    vestido.lineTo(ancho * 1.75 + sw * 10, bajo);
    vestido.quadraticCurveTo(0, bajo + 5, -ancho * 1.7 + sw * 10, bajo);
    vestido.lineTo(-ancho * 1.05, cad[1]);
  } else if (pose === 'sentada' || pose === 'piso') {
    vestido.moveTo(hom[0] - ancho, hom[1]);
    vestido.lineTo(hom[0] + ancho * 1.05, hom[1]);
    vestido.lineTo(cad[0] + ancho * 1.1, cad[1] - H * 0.05);
    vestido.lineTo(piernas[0][1][0] + 4, piernas[0][1][1] - 4);
    vestido.lineTo(piernas[0][1][0] + 2, piernas[0][1][1] + H * 0.06);
    vestido.lineTo(cad[0] - ancho * 1.2, cad[1] + H * 0.04);
  } else {
    vestido.moveTo(hom[0] - ancho * 0.9, hom[1] + 2);
    vestido.lineTo(hom[0] + ancho * 1.1, hom[1]);
    vestido.lineTo(cad[0] + ancho * 1.3, cad[1] + H * 0.04);
    vestido.lineTo(piernas[0][1][0] + 6, -2);
    vestido.lineTo(-H * 0.16, -2);
    vestido.lineTo(cad[0] - ancho * 1.4, cad[1]);
  }
  vestido.closePath();
  c.fillStyle = a.ropa;
  c.fill(vestido);
  c.save(); c.clip(vestido);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.fillRect(-H, cad[1] - H * 0.02, H * 0.9, H);
  if (a.ropa2) { c.fillStyle = a.ropa2; for (let i = -8; i < 8; i++) c.fillRect(i * H * 0.04, hom[1], H * 0.012, H); }
  c.restore();
  c.strokeStyle = P.linea; c.lineWidth = 2.2; c.stroke(vestido);
  c.strokeStyle = P.borde; c.lineWidth = 1; c.stroke(vestido);

  // cuello, cabeza, cara
  miembro(c, [[hom[0] + 1, hom[1] + 2], [cab[0] - R * 0.1, cab[1] + R * 0.85]], Math.max(4, R * 0.42), P.piel, P.linea);
  c.save();
  c.translate(cab[0], cab[1]);
  c.rotate(incl);
  c.fillStyle = P.piel;
  c.beginPath(); c.ellipse(0, 0, R * 0.9, R, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(R * 0.8, -R * 0.12); c.lineTo(R * 1.03, R * 0.2); c.lineTo(R * 0.78, R * 0.27); c.fill();
  c.strokeStyle = P.linea; c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, 0, R * 0.9, R, 0, -1.3, 4.4); c.stroke();
  if (anim === 'duerme') {
    c.beginPath(); c.moveTo(R * 0.3, R * 0.02); c.quadraticCurveTo(R * 0.46, R * 0.1, R * 0.62, R * 0.02); c.stroke();
  } else {
    const r = R * (a.miedo || anim === 'tiembla' ? 0.17 : 0.13);
    c.fillStyle = '#f4efe4';
    c.beginPath(); c.ellipse(R * 0.46, -R * 0.06, r * 1.2, r * 1.35, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.ojo;
    c.beginPath(); c.arc(R * 0.5, -R * 0.05, r * 0.75, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.linea; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(R * 0.26, -R * (a.miedo ? 0.42 : 0.32)); c.lineTo(R * 0.66, -R * 0.3); c.stroke();
  }
  if (a.epoca === 'presente' && a.cuerpo === 'joven') {
    c.strokeStyle = 'rgba(60,72,88,0.65)'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(R * 0.47, R * 0.16, R * 0.2, 0.2, Math.PI - 0.2); c.stroke();
  }
  c.strokeStyle = P.linea; c.lineWidth = 1.6;
  c.beginPath();
  if (a.miedo || anim === 'tiembla') c.ellipse(R * 0.6, R * 0.52, R * 0.09, R * 0.13, 0, 0, Math.PI * 2);
  else { c.moveTo(R * 0.46, R * 0.54); c.lineTo(R * 0.72, R * 0.5); }
  c.stroke();
  c.restore();
  pelo(c, a, cab[0], cab[1], R, 'adelante', fase, incl);

  brazo(c, a, anim, fase, hom, H, R, cab, 'adelante', pose);
  c.restore();
}

/** Un miembro con contorno: primero la linea gruesa, despues el color. */
function miembro(c: Ctx, pts: [number, number][], ancho: number, color: string, linea: string) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = linea; c.lineWidth = ancho + 3; c.stroke();
  c.strokeStyle = color; c.lineWidth = ancho; c.stroke();
}

function pelo(c: Ctx, a: Aspecto, x: number, y: number, R: number, capa: 'atras' | 'adelante', fase: number, incl = 0) {
  const P = PAL[a.epoca];
  c.save();
  c.translate(x, y);
  c.rotate(incl);
  c.fillStyle = a.pelo.color;
  c.strokeStyle = P.linea; c.lineWidth = 1.6;
  const f = a.pelo.forma;
  const trazar = (p: Path2D) => { c.fill(p); c.stroke(p); };
  if (capa === 'atras') {
    const p = new Path2D();
    if (f === 'largo') {
      // largo, lacio, pegado: el de alguien que hace mucho que no sale
      p.moveTo(-R * 0.2, -R * 0.95); p.quadraticCurveTo(-R * 1.5, R * 0.8, -R * 1.05 + Math.sin(fase) * 1.5, R * 3.4);
      p.lineTo(-R * 0.2, R * 2.6); p.quadraticCurveTo(-R * 0.3, R * 1.2, R * 0.1, R * 0.5); p.closePath(); trazar(p);
    } else if (f === 'rubia' || f === 'melena') {
      p.moveTo(-R * 0.2, -R * 0.98); p.quadraticCurveTo(-R * 1.45, R * 0.4, -R * 0.95, R * (f === 'melena' ? 2.4 : 1.4));
      p.quadraticCurveTo(-R * 0.3, R * 1.3, R * 0.05, R * 0.8); p.closePath(); trazar(p);
    } else if (f === 'canoso') {
      for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(-R * 0.35 + rc(i, 1) * R * 0.5, -R * 0.35 + rc(1, i) * R * 0.55, R * 0.5, 0, Math.PI * 2); c.fill(); }
    }
  } else {
    if (f === 'rodete') {
      const p = new Path2D(); p.ellipse(-R * 0.08, -R * 0.42, R * 0.98, R * 0.64, -0.2, Math.PI * 0.92, Math.PI * 2.08); trazar(p);
      const q = new Path2D(); q.arc(-R * 0.78, -R * 0.78, R * 0.45, 0, Math.PI * 2); trazar(q);
    } else if (f === 'panuelo') {
      const p = new Path2D();
      p.moveTo(-R * 1.08, R * 0.55); p.quadraticCurveTo(-R * 1.25, -R * 1.45, R * 0.55, -R * 1.02); p.lineTo(R * 0.72, -R * 0.35);
      p.quadraticCurveTo(-R * 0.3, -R * 0.78, -R * 0.55, R * 0.75); p.closePath(); trazar(p);
    } else if (f === 'canoso') {
      for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-R * 0.1 + rc(i * 3, 2) * R * 0.6, -R * 0.78 + rc(2, i * 3) * R * 0.25, R * 0.42, 0, Math.PI * 2); c.fill(); }
    } else {
      const p = new Path2D();
      p.ellipse(-R * 0.06, -R * 0.36, R * 0.98, R * 0.72, -0.12, Math.PI * 0.88, Math.PI * 2.02);
      trazar(p);
      c.fillRect(-R * 0.2, -R * 0.78, R * 0.98, R * 0.36);
      if (f === 'largo') for (let i = 0; i < 3; i++) c.fillRect(R * (0.28 + i * 0.17), -R * 0.5, R * 0.08, R * (0.45 + hash(i) * 0.3));
    }
  }
  c.restore();
}

function brazo(c: Ctx, a: Aspecto, anim: Anim, fase: number, hom: [number, number], H: number, R: number,
               cab: [number, number], cual: 'atras' | 'adelante', pose: string) {
  const P = PAL[a.epoca];
  const S: [number, number] = [hom[0] + (cual === 'atras' ? -2 : 3), hom[1] + H * 0.025];
  const grosor = Math.max(3.5, H * 0.03);
  const manga = cual === 'atras' ? sombra(a.ropa) : a.ropa;
  const mano = (x: number, y: number) => { c.fillStyle = P.piel; c.strokeStyle = P.linea; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, Math.max(2.5, H * 0.02), 0, Math.PI * 2); c.fill(); c.stroke(); };
  const dibujar = (codo: [number, number], m: [number, number]) => { miembro(c, [S, codo, m], grosor, manga, P.linea); mano(m[0], m[1]); };
  const boca: [number, number] = [cab[0] + R * 0.75, cab[1] + R * 0.55];

  if (cual === 'adelante') {
    switch (a.prop) {
      case 'muneca': {
        const m: [number, number] = [S[0] + H * 0.12, S[1] + H * 0.13];
        c.fillStyle = a.epoca === 'presente' ? '#9c968a' : '#caa98a';
        c.strokeStyle = P.linea; c.lineWidth = 1.4;
        c.beginPath(); c.ellipse(m[0] + 2, m[1] - H * 0.06, H * 0.045, H * 0.045, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(m[0] + 2, m[1] + H * 0.01, H * 0.04, H * 0.055, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#0b0c0e'; c.fillRect(m[0] + 2, m[1] - H * 0.07, 2.5, 2.5); c.fillRect(m[0] + 7, m[1] - H * 0.07, 2.5, 2.5);
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(m[0] + 2, m[1] - H * 0.072, 1, 1); c.fillRect(m[0] + 7, m[1] - H * 0.072, 1, 1);
        dibujar([S[0] + H * 0.05, S[1] + H * 0.12], m);
        return;
      }
      case 'cigarrillo':
        dibujar([S[0] + H * 0.1, S[1] + H * 0.12], boca);
        c.strokeStyle = '#ede7db'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(boca[0], boca[1]); c.lineTo(boca[0] + R * 0.7, boca[1] - R * 0.2); c.stroke();
        c.strokeStyle = 'rgba(200,210,220,0.4)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(boca[0] + R * 0.7, boca[1] - R * 0.2); c.quadraticCurveTo(boca[0] + R * 1.2 + Math.sin(fase) * 4, boca[1] - R * 1.6, boca[0] + R * 0.8, boca[1] - R * 2.8); c.stroke();
        return;
      case 'mandarina': {
        const m: [number, number] = [S[0] + H * 0.16, S[1] + H * 0.16];
        dibujar([S[0] + H * 0.08, S[1] + H * 0.16], m);
        c.fillStyle = '#e08a2c'; c.strokeStyle = P.linea; c.lineWidth = 1.2;
        c.beginPath(); c.arc(m[0] + H * 0.02, m[1] - H * 0.02 + Math.sin(fase), H * 0.035, 0, Math.PI * 2); c.fill(); c.stroke();
        return;
      }
      case 'rosario':
      case 'manos_rezo': {
        const m: [number, number] = [cab[0] + R * 1.2, cab[1] + R * 1.5];
        dibujar([S[0] + H * 0.1, S[1] + H * 0.1], m);
        if (a.prop === 'rosario') {
          c.fillStyle = a.epoca === 'presente' ? '#8f887b' : '#6b4a2a';
          for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(m[0] + Math.sin(i * 0.9) * 3, m[1] + 4 + i * 3.2, 1.8, 0, Math.PI * 2); c.fill(); }
        }
        return;
      }
      case 'manos_boca':
        dibujar([S[0] + H * 0.1, S[1] + H * 0.08], boca);
        return;
    }
  } else if (a.prop === 'manos_boca' || a.prop === 'manos_rezo' || a.prop === 'rosario') {
    dibujar([S[0] + H * 0.08, S[1] + H * 0.1], [boca[0] - 2, boca[1] + 3]);
    return;
  }
  if (anim === 'tiembla' || (a.miedo && !a.prop)) {
    dibujar([S[0] + H * 0.1, S[1] + H * 0.14], [S[0] - H * 0.02, S[1] + H * 0.13]);
    return;
  }
  if (anim === 'duerme') { dibujar([S[0] + H * 0.08, S[1] + H * 0.16], [S[0] + H * 0.2, S[1] + H * 0.2]); return; }
  const lado = cual === 'adelante' ? 1 : -1;
  const sw = anim === 'camina' ? Math.sin(fase + Math.PI) * 0.45 * lado : anim === 'tararea' ? -0.08 : 0;
  if (pose === 'pie') {
    const codo: [number, number] = [S[0] + Math.sin(sw) * H * 0.16, S[1] + Math.cos(sw) * H * 0.16];
    dibujar(codo, [codo[0] + Math.sin(sw + 0.15) * H * 0.15, codo[1] + Math.cos(sw + 0.15) * H * 0.14]);
  } else {
    dibujar([S[0] + H * 0.06, S[1] + H * 0.14], [S[0] + H * 0.16, S[1] + H * 0.2]);
  }
}

function sombra(color: string) {
  const n = parseInt(color.slice(1), 16);
  const f = 0.72;
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

// ---------------------------------------------------------------- de frente (primera persona)

/** El mismo personaje de frente, para el plano en primera persona. La cara, apenas. */
export function frente(c: Ctx, w: number, h: number, a: Aspecto, cuadro: number, total: number) {
  const P = PAL[a.epoca];
  const H = a.alto;
  const fase = (cuadro / total) * Math.PI * 2;
  const nina = a.cuerpo === 'nina';
  const R = H * (nina ? 0.1 : 0.075);
  const jx = a.miedo ? (hash(cuadro * 5.1) - 0.5) * 4 : 0;
  c.save();
  c.translate(w / 2 + jx, h - 6 + Math.sin(fase) * H * 0.004);
  c.lineJoin = 'round';
  const hombro = a.pose === 'pie' ? -H * 0.8 : a.pose === 'sentada' ? -H * 0.6 : -H * 0.58;
  const cadera = a.pose === 'pie' ? -H * 0.47 : -H * 0.26;
  const anchoH = H * 0.13;

  // piernas
  c.strokeStyle = P.pielSombra; c.lineWidth = H * 0.028;
  if (a.pose === 'pie') {
    c.beginPath(); c.moveTo(-anchoH * 0.4, cadera); c.lineTo(-anchoH * 0.45, 0); c.moveTo(anchoH * 0.4, cadera); c.lineTo(anchoH * 0.45, 0); c.stroke();
  } else if (a.pose === 'sentada') {
    c.beginPath(); c.moveTo(-anchoH * 0.4, cadera + H * 0.06); c.lineTo(-anchoH * 0.45, 0); c.moveTo(anchoH * 0.4, cadera + H * 0.06); c.lineTo(anchoH * 0.45, 0); c.stroke();
  }
  // pelo de atras
  const hy = hombro - H * 0.06 - R;
  c.fillStyle = a.pelo.color;
  if (a.pelo.forma === 'largo' || a.pelo.forma === 'melena' || a.pelo.forma === 'rubia') {
    c.beginPath(); c.ellipse(0, hy + R * (a.pelo.forma === 'rubia' ? 0.6 : 1.4), R * 1.25, R * (a.pelo.forma === 'rubia' ? 1.5 : 2.4), 0, 0, Math.PI * 2); c.fill();
  }
  // cuerpo
  const cuerpo = new Path2D();
  const bajo = cadera + (a.largoRopa ?? 0.3) * H * (a.pose === 'pie' ? 1 : 0.5);
  cuerpo.moveTo(-anchoH, hombro); cuerpo.lineTo(anchoH, hombro);
  cuerpo.lineTo(anchoH * 1.45, bajo); cuerpo.lineTo(-anchoH * 1.45, bajo); cuerpo.closePath();
  c.fillStyle = a.ropa; c.fill(cuerpo);
  c.strokeStyle = P.linea; c.lineWidth = 2; c.stroke(cuerpo);
  c.strokeStyle = P.borde; c.lineWidth = 1; c.stroke(cuerpo);
  // brazos
  c.strokeStyle = a.ropa; c.lineWidth = H * 0.03;
  const manos = a.prop === 'manos_rezo' || a.prop === 'rosario' ? [0, hombro + H * 0.06]
    : a.prop === 'manos_boca' ? [0, hy + R * 0.7]
      : a.prop === 'muneca' || a.prop === 'mandarina' ? [0, hombro + H * 0.2]
        : a.prop === 'cigarrillo' ? [anchoH * 0.5, hy + R * 0.7] : null;
  for (const lado of [-1, 1]) {
    c.beginPath(); c.moveTo(lado * anchoH * 0.95, hombro + 4);
    if (manos) c.quadraticCurveTo(lado * anchoH * 1.6, hombro + H * 0.18, manos[0] + lado * 5, manos[1]);
    else c.lineTo(lado * anchoH * 1.3, hombro + H * 0.33);
    c.stroke();
  }
  if (a.prop === 'muneca') {
    c.fillStyle = a.epoca === 'presente' ? '#9c968a' : '#caa98a';
    c.beginPath(); c.arc(0, hombro + H * 0.12, H * 0.055, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0b0c0e'; c.fillRect(-5, hombro + H * 0.11, 3, 3); c.fillRect(3, hombro + H * 0.11, 3, 3);
  }
  if (a.prop === 'mandarina') { c.fillStyle = '#e08a2c'; c.beginPath(); c.arc(0, hombro + H * 0.2, H * 0.04, 0, Math.PI * 2); c.fill(); }
  // cabeza
  c.fillStyle = P.piel;
  c.beginPath(); c.ellipse(0, hy, R * 0.85, R, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = P.linea; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = P.ojo;
  const oj = R * (a.miedo ? 0.16 : 0.1);
  c.beginPath(); c.arc(-R * 0.33, hy - R * 0.05, oj, 0, Math.PI * 2); c.arc(R * 0.33, hy - R * 0.05, oj, 0, Math.PI * 2); c.fill();
  c.strokeStyle = P.linea; c.lineWidth = 1.4;
  c.beginPath();
  if (a.miedo) c.ellipse(0, hy + R * 0.5, R * 0.12, R * 0.16, 0, 0, Math.PI * 2);
  else { c.moveTo(-R * 0.2, hy + R * 0.5); c.lineTo(R * 0.2, hy + R * 0.5); }
  c.stroke();
  // pelo de adelante
  c.fillStyle = a.pelo.color;
  const f = a.pelo.forma;
  if (f === 'rodete') { c.beginPath(); c.ellipse(0, hy - R * 0.55, R * 0.95, R * 0.55, 0, Math.PI, 0); c.fill(); c.beginPath(); c.arc(0, hy - R * 1.2, R * 0.42, 0, Math.PI * 2); c.fill(); }
  else if (f === 'panuelo') { c.beginPath(); c.moveTo(-R * 1.1, hy + R * 0.9); c.quadraticCurveTo(0, hy - R * 2.4, R * 1.1, hy + R * 0.9); c.lineTo(R * 0.8, hy); c.quadraticCurveTo(0, hy - R * 1.3, -R * 0.8, hy); c.fill(); }
  else if (f === 'canoso') { for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(rc(i, 3) * R * 0.9, hy - R * 0.8 + rc(3, i) * R * 0.25, R * 0.38, 0, Math.PI * 2); c.fill(); } }
  else {
    c.beginPath(); c.ellipse(0, hy - R * 0.4, R * 0.95, R * 0.68, 0, Math.PI, 0); c.fill();
    c.fillRect(-R * 0.85, hy - R * 0.55, R * 1.7, R * 0.3);
    if (f === 'largo') for (let i = 0; i < 6; i++) c.fillRect(-R * 0.7 + i * R * 0.28, hy - R * 0.4, R * 0.1, R * (0.35 + hash(i) * 0.5));
  }
  c.restore();
}

// ---------------------------------------------------------------- efectos

/** Cortina de tinta: el miedo del presente, colgando del techo. */
export function cortinaTinta(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const t = (cuadro / total) * Math.PI * 2;
  c.fillStyle = '#020304';
  for (let i = 0; i < 11; i++) {
    const x0 = w * 0.08 + (i / 10) * w * 0.84;
    const largo = h * (0.8 + hash(i) * 0.2);
    c.beginPath();
    c.moveTo(x0 - 7, 0);
    const pasos = 16;
    const izq: [number, number][] = [], der: [number, number][] = [];
    for (let k = 0; k <= pasos; k++) {
      const s = k / pasos;
      const ancho = 9 * Math.pow(1 - s, 0.7) + 0.5;
      const dx = Math.sin(t + i * 1.7 + s * 3) * 10 * s + rc(i, s * 3) * 6 * s;
      izq.push([x0 + dx - ancho, s * largo]);
      der.push([x0 + dx + ancho, s * largo]);
    }
    for (const p of izq) c.lineTo(p[0], p[1]);
    for (let k = der.length - 1; k >= 0; k--) c.lineTo(der[k][0], der[k][1]);
    c.closePath();
    c.fill();
  }
}

/** Hueco blanco: lo que no se recuerda. La foto quemada. */
export function huecoBlanco(c: Ctx, w: number, h: number, cuadro: number, total: number) {
  const t = (cuadro / total) * Math.PI * 2;
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,252,240,0)');
  g.addColorStop(0.25, 'rgba(255,252,240,0.96)');
  g.addColorStop(0.75, 'rgba(255,252,240,0.96)');
  g.addColorStop(1, 'rgba(255,252,240,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // bordes quemados, como fotografia pasada de luz
  c.fillStyle = 'rgba(190,140,70,0.35)';
  for (let i = 0; i < 24; i++) {
    const y = (i / 24) * h + Math.sin(t + i) * 6;
    c.beginPath(); c.ellipse(w * 0.2 + rc(i, t) * 4, y, 5, 10, 0, 0, Math.PI * 2); c.ellipse(w * 0.8 + rc(t, i) * 4, y, 5, 10, 0, 0, Math.PI * 2); c.fill();
  }
}

/** La sombra enorme en un biombo de papel, la del recuerdo: la siesta atraviesa el papel. */
export function biombo(c: Ctx, w: number, h: number, cuadro: number, total: number, conSombra: boolean) {
  const t = (cuadro / total) * Math.PI * 2;
  for (let i = 0; i < 3; i++) {
    c.fillStyle = i % 2 ? '#e7d6b0' : '#f0e2c0';
    c.fillRect(i * w / 3, 20, w / 3 - 2, h - 20);
  }
  c.strokeStyle = '#6b5236'; c.lineWidth = 6;
  c.strokeRect(3, 20, w - 6, h - 23);
  c.beginPath(); c.moveTo(w / 3, 20); c.lineTo(w / 3, h); c.moveTo(2 * w / 3, 20); c.lineTo(2 * w / 3, h); c.stroke();
  if (!conSombra) return;
  c.fillStyle = 'rgba(45,32,20,0.82)';
  c.beginPath();
  c.ellipse(w / 2 + Math.sin(t) * 6, h * 0.55, w * 0.16, h * 0.34, Math.sin(t * 0.5) * 0.05, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.3 + Math.sin(t + i) * 0.15;
    c.lineWidth = 12 - i % 3 * 3;
    c.strokeStyle = 'rgba(45,32,20,0.78)';
    c.beginPath();
    c.moveTo(w / 2, h * 0.35);
    c.quadraticCurveTo(w / 2 + Math.cos(a) * h * 0.2 + Math.sin(t * 2 + i) * 14, h * 0.35 + Math.sin(a) * h * 0.2, w / 2 + Math.cos(a) * h * 0.38, h * 0.35 + Math.sin(a) * h * 0.32);
    c.stroke();
  }
}

export function vela(c: Ctx, w: number, h: number, cuadro: number) {
  c.fillStyle = '#d8d0c0'; c.fillRect(w * 0.3, h * 0.4, w * 0.4, h * 0.6);
  c.fillStyle = cuadro % 2 ? '#f6dc9e' : '#f2cf86';
  c.beginPath(); c.ellipse(w / 2, h * 0.26, w * 0.16, h * (cuadro % 2 ? 0.16 : 0.13), 0, 0, Math.PI * 2); c.fill();
}
