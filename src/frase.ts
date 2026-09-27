import { BAL, C, RGB, clamp, difPlegada, hacia } from './config';
import { ondas } from './ondas';
import type { Voz } from './voz';

/**
 * FRASE — todo lo que se canta en el juego es una melodia corta.
 *
 * Quien la pide la canta primero (una luz, el piano, cada una de ellas, ella
 * misma al final), y despues hay que repetirla, nota por nota. La melodia se
 * dibuja como una fila de puntos a distinta altura: se ve su forma antes de
 * cantarla. Cada nota acertada queda encendida; si uno se pierde mucho rato,
 * vuelve a empezar.
 *
 * Las frases van creciendo: una luz pide una nota; el piano, tres; Mariela, dos;
 * la madre, tres; la abuela, cuatro; ella misma, la cancion entera.
 */

export type Resultado = 'nada' | 'nota' | 'completa' | 'error';

const PASO_DEMO = 620;
const SOSTENER = 620;

export class Frase {
  k = 0;
  private ms = 0;
  private mal = 0;
  dif = 0;
  luz: number[];
  hechas: boolean[];
  private msDemo = -1;
  private msEspera = 900;
  private msGuia = 0;

  constructor(public notas: number[]) {
    this.luz = notas.map(() => 0);
    this.hechas = notas.map(() => false);
  }

  get completa() { return this.k >= this.notas.length; }
  get progresoNota() { return clamp(this.ms / SOSTENER); }
  /** si la frase esta sonando sola (demostracion) */
  get sonando() { return this.msDemo >= 0; }

  reiniciar() {
    this.k = 0; this.ms = 0; this.mal = 0;
    this.hechas = this.notas.map(() => false);
  }

  /**
   * `sonar(n, guia)` hace sonar la nota n (semitonos sobre la nota del jugador).
   * `guia` = true cuando es el recordatorio suave mientras se canta.
   * `activa`: si se esta cerca / en el dialogo (si no, no escucha ni canta).
   */
  actualizar(dtMs: number, voz: Voz, sonar: (n: number, guia?: boolean) => void, activa = true): Resultado {
    for (let i = 0; i < this.luz.length; i++) this.luz[i] = Math.max(this.hechas[i] ? 1 : 0, this.luz[i] - dtMs / 700);
    if (this.completa || !activa) { this.msDemo = -1; return 'nada'; }
    const tararea = voz.estado === 'tarareo';

    // la demostracion: si nadie canta, cada tanto la frase suena sola
    if (this.msDemo >= 0) {
      // la primera nota suena en el cuadro en que arranca la demostracion
      const antes = this.msDemo === 0 ? -1 : this.msDemo;
      this.msDemo += dtMs;
      this.notas.forEach((n, i) => {
        const ti = i * PASO_DEMO;
        if (antes < ti && this.msDemo >= ti) { sonar(n); this.luz[i] = 1; }
      });
      if (this.msDemo > this.notas.length * PASO_DEMO + 300 || tararea) { this.msDemo = -1; this.msEspera = 4000; }
    } else if (!tararea) {
      this.msEspera -= dtMs;
      if (this.msEspera <= 0) this.msDemo = 0;
    } else this.msEspera = Math.max(this.msEspera, 3000);

    if (!tararea) { this.ms = Math.max(0, this.ms - dtMs); this.msGuia = 0; return 'nada'; }
    // mientras canta, la nota que toca suena bajito cada tanto: la referencia siempre esta
    this.msGuia -= dtMs;
    if (this.msGuia <= 0) { this.msGuia = 2000; sonar(this.notas[this.k], true); }
    this.dif = hacia(this.dif, difPlegada(voz.nota, voz.base + this.notas[this.k]), 10, dtMs / 1000);
    if (Math.abs(this.dif) < BAL.toleranciaSemitonos) {
      this.ms += dtMs;
      if (this.mal > 0) this.mal = 0;
      if (this.ms >= SOSTENER) {
        this.hechas[this.k] = true;
        this.luz[this.k] = 1;
        this.k++;
        this.ms = 0;
        this.mal = -1500;
        return this.completa ? 'completa' : 'nota';
      }
    } else {
      this.ms = Math.max(0, this.ms - dtMs * 0.5);
      this.mal += dtMs;
      if (this.mal > 4000 && this.k > 0) { this.reiniciar(); return 'error'; }
    }
    return 'nada';
  }

  /** La melodia como puntos a distinta altura; debajo, las dos ondas de la nota que toca. */
  dibujar(c: CanvasRenderingContext2D, cx: number, cy: number, ancho: number, t: number,
          o: { recuerdo: boolean; tuya: number; alpha?: number; conOndas?: boolean }) {
    const a = o.alpha ?? 1;
    if (a <= 0.01) return;
    const n = this.notas.length;
    const esp = Math.min(40, ancho / Math.max(1, n));
    const tinta = o.recuerdo ? '60,42,24' : RGB.hueso;
    c.save();
    c.globalAlpha = a;
    // una linea fina que une los puntos: la forma de la melodia
    c.strokeStyle = `rgba(${tinta},0.25)`; c.lineWidth = 1;
    c.beginPath();
    this.notas.forEach((nota, i) => {
      const x = cx + (i - (n - 1) / 2) * esp, y = cy - nota * 3.4;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.stroke();
    this.notas.forEach((nota, i) => {
      const x = cx + (i - (n - 1) / 2) * esp, y = cy - nota * 3.4;
      const hecha = this.hechas[i];
      const l = this.luz[i];
      const actual = i === this.k && !this.completa;
      if (hecha || l > 0.05) {
        c.save();
        c.shadowColor = C.calida; c.shadowBlur = 12 * Math.max(l, hecha ? 1 : 0);
        c.fillStyle = hecha ? `rgba(${RGB.calida},1)` : `rgba(${tinta},${0.25 + l * 0.7})`;
        c.beginPath(); c.arc(x, y, 6.5, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.strokeStyle = `rgba(${tinta},${actual ? 0.95 : 0.45})`;
      c.lineWidth = actual ? 2 : 1.2;
      c.beginPath(); c.arc(x, y, actual ? 9 + Math.sin(t * 5) * 1.2 : 6.5, 0, Math.PI * 2); c.stroke();
      if (actual && this.progresoNota > 0) {
        c.strokeStyle = `rgba(${RGB.calida},0.95)`; c.lineWidth = 2.5;
        c.beginPath(); c.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.progresoNota); c.stroke();
      }
    });
    c.restore();
    if ((o.conOndas ?? true) && !this.completa && o.tuya > 0.05) {
      ondas(c, cx, cy + 34, Math.max(120, ancho), t, { dif: this.dif, progreso: this.progresoNota, tuya: o.tuya, recuerdo: o.recuerdo, alpha: a });
    }
  }
}
