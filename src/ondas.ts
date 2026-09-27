import { C, RGB, clamp } from './config';

/**
 * ONDAS — el unico codigo visual de la voz, igual en todo el juego.
 *
 *   una onda FRIA flotando sobre algo = eso esta cantando una nota: se le puede cantar.
 *   tu onda CALIDA aparece cuando tarareas; sube si cantas agudo, baja si cantas grave.
 *   cuando las dos se juntan, se funden y se llenan de luz.
 */

type Ctx = CanvasRenderingContext2D;

export interface OpcOndas {
  /** diferencia en semitonos entre tu voz y la nota pedida (+ = mas agudo) */
  dif: number;
  /** 0..1 cuanto falta para igualar */
  progreso: number;
  /** 0..1 cuanto se ve tu onda (si estas tarareando) */
  tuya: number;
  recuerdo: boolean;
  alpha?: number;
  /** si no hay nota pedida: solo tu onda */
  sinObjetivo?: boolean;
}

export function ondas(c: Ctx, x: number, y: number, w: number, t: number, o: OpcOndas) {
  const a = o.alpha ?? 1;
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a;
  c.lineCap = 'round';
  const linea = (off: number, color: string, ancho: number, hasta = 1, amp = 7) => {
    c.strokeStyle = color; c.lineWidth = ancho;
    c.beginPath();
    const n = Math.max(2, Math.round(80 * hasta));
    for (let i = 0; i <= n; i++) {
      const s = i / 80;
      const env = Math.sin(s * Math.PI);
      const yy = y + Math.sin(s * w / 13 - t * 5) * amp * env + off * env;
      if (i === 0) c.moveTo(x - w / 2 + s * w, yy); else c.lineTo(x - w / 2 + s * w, yy);
    }
    c.stroke();
  };
  if (!o.sinObjetivo) linea(0, o.recuerdo ? 'rgba(75,57,35,0.75)' : `rgba(${RGB.frio},0.75)`, 1.6);
  if (o.tuya > 0.02) {
    c.globalAlpha = a * o.tuya;
    linea(o.sinObjetivo ? 0 : clamp(-o.dif * 9, -40, 40), `rgba(${RGB.calida},0.95)`, 2.4);
    if (!o.sinObjetivo && o.progreso > 0) {
      c.save(); c.shadowColor = C.calida; c.shadowBlur = 14;
      linea(0, o.recuerdo ? 'rgba(60,40,20,0.95)' : `rgba(${RGB.hueso},0.95)`, 3.2, o.progreso);
      c.restore();
    }
  }
  c.restore();
}

/** Icono chico: una onda fria que late. "Esto canta; se le puede cantar." */
export function glifoOnda(c: Ctx, x: number, y: number, a: number, t: number, recuerdo: boolean) {
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = recuerdo ? 'rgba(75,57,35,0.9)' : `rgba(${RGB.frio},0.9)`;
  c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const s = i / 30;
    const yy = y + Math.sin(s * Math.PI * 3 - t * 4) * 5 * Math.sin(s * Math.PI);
    if (i === 0) c.moveTo(x - 20 + s * 40, yy); else c.lineTo(x - 20 + s * 40, yy);
  }
  c.stroke();
  const f = (t * 0.8) % 1;
  c.globalAlpha = a * (1 - f) * 0.5;
  c.beginPath(); c.ellipse(x, y, 24 + f * 16, 10 + f * 8, 0, 0, Math.PI * 2); c.stroke();
  c.restore();
}
