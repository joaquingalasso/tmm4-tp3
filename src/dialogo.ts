import { C, H, RGB, TIPO, W, clamp, hacia } from './config';
import { glifoGrito, glifoTarareo } from './arte';
import { glifoOnda, ondas } from './ondas';
import { Frase } from './frase';
import { retrato, type Gesto, type IdRetrato } from './retratos';
import { porId } from './sprites/catalogo';
import { pintar } from './sprites/hojas';
import { sonidoArchivo } from './sonidos/archivos';
import type { Sonido, VozEnCurso } from './sonido';
import type { Teclado } from './teclado';
import type { Voz } from './voz';

/**
 * DIALOGO — el unico lugar del juego donde hay palabras.
 *
 * Cara a cara, en primera persona: caja de texto, retrato, opciones. Quien
 * habla tiene voz (un archivo grabado, o un murmullo en su altura) y el texto
 * se escribe al ritmo de esa voz: avanza cuando suena y se detiene en los
 * silencios. La protagonista no habla: elige.
 *
 * Tararear se puede en cualquier momento: la interfaz de afinar aparece sola.
 * Si quien esta enfrente canta una nota (se ve su onda fria), igualarla cambia
 * la conversacion. Al final hay dos gestos mas: gritar (una opcion que solo se
 * dice con la voz) y saltar (una opcion que se elige... y no funciona).
 */

export type Salida = 'volver' | 'cruzar' | 'final_audere' | 'final_nopudo' | 'final_antes';

export interface Opcion {
  texto: string;
  voz?: 'gritar';
  especial?: 'saltar';
  ir?: string;
  salida?: Salida;
  traspaso?: boolean;
}

export interface Nodo {
  quien: string;
  retrato: IdRetrato;
  gesto: Gesto;
  texto: string;
  opciones: Opcion[];
  /** una melodia corta: quien habla la canta primero; repetirla lleva a `ir` o sale por `salida` */
  tararear?: { notas: number[]; ir?: string; salida?: Salida; etiqueta?: string };
  /** si esta, no hay opciones: dice lo suyo y la conversacion se cierra sola */
  auto?: { salida: Salida; traspaso?: boolean; ms?: number };
}

export interface Guion { id: string; inicio: string; nodos: Record<string, Nodo>; lado: 'A' | 'C'; /** altura de su voz, en semitonos */ voz: number; }

export interface OpcDialogo { alSaltar?: (intento: number) => void; alIgualar?: () => void; }

/** Id de la voz grabada de un nodo (y su archivo en sonidos/voces/). */
export const idVoz = (guion: string, nodo: string) => `voz_${guion}_${nodo}`;

export class Dialogo {
  activo = false;
  private guion: Guion | null = null;
  nodo: Nodo | null = null;
  private idNodo = '';
  letras = 0;
  private sel = 0;
  private t = 0;
  private msAparece = 0;
  private cerrando = 0;
  private salidaPendiente: { s: Salida; tr: boolean } | null = null;
  private alSalir: ((s: Salida, traspaso: boolean) => void) | null = null;
  private opc: OpcDialogo = {};

  // la voz de quien habla
  private vozEnCurso: VozEnCurso | null = null;
  private vozPedida = false;
  private msSilaba = 0;
  /** 0..1 cuanto esta sonando la voz ahora (para la boca del retrato) */
  hablando = 0;

  // la voz del jugador dentro del dialogo
  private afinar = 0;
  private frase: Frase | null = null;
  private msSinVoz = 99999;
  private gritar: { op: Opcion; progreso: number } | null = null;
  private saltos = 0;
  private sacudida = 0;
  private bloqueo = 0;
  private msAuto = 0;

  abrir(g: Guion, alSalir: (s: Salida, traspaso: boolean) => void, opc: OpcDialogo = {}) {
    this.guion = g;
    this.alSalir = alSalir;
    this.opc = opc;
    this.activo = true;
    this.cerrando = 0;
    this.salidaPendiente = null;
    this.msAparece = 0;
    this.saltos = 0;
    this.ir(g.inicio);
  }

  private ir(id: string) {
    this.callar();
    this.idNodo = id;
    this.nodo = this.guion!.nodos[id];
    this.letras = 0;
    this.sel = 0;
    this.msAuto = 0;
    this.frase = this.nodo.tararear ? new Frase(this.nodo.tararear.notas) : null;
    this.afinar = 0;
    this.gritar = null;
    this.vozPedida = false;
  }

  private callar() { this.vozEnCurso?.parar(); this.vozEnCurso = null; }

  private salir(s: Salida, tr: boolean) {
    this.callar();
    this.salidaPendiente = { s, tr };
    this.cerrando = 0.001;
  }

  /** Si quien esta enfrente pide una melodia. */
  get pideCanto() { return !!this.frase && !this.frase.completa; }
  get gritando() { return !!this.gritar; }
  get afinando() { return this.afinar > 0.3; }
  get lado() { return this.guion?.lado ?? 'A'; }

  actualizar(dtMs: number, tec: Teclado, voz: Voz, son: Sonido) {
    if (!this.activo || !this.nodo) return;
    const dt = dtMs / 1000;
    this.t += dt;
    this.msAparece += dtMs;
    this.sacudida = Math.max(0, this.sacudida - dt * 2);
    this.bloqueo = Math.max(0, this.bloqueo - dtMs);

    if (this.cerrando > 0) {
      this.cerrando += dt * 2.5;
      if (this.cerrando >= 1) {
        this.activo = false;
        const p = this.salidaPendiente!;
        this.alSalir?.(p.s, p.tr);
      }
      return;
    }
    if (this.msAparece < 350) return;
    const n = this.nodo;
    const g = this.guion!;

    // --- su voz, y el texto al ritmo de su voz ---
    if (!this.vozPedida) {
      this.vozPedida = true;
      const b = sonidoArchivo(idVoz(g.id, this.idNodo));
      if (b) this.vozEnCurso = son.voz(b);
    }
    const largo = n.texto.length;
    if (this.letras < largo) {
      if (this.vozEnCurso) {
        const v = this.vozEnCurso;
        const tv = son.ctx.currentTime - v.inicio;
        const objetivo = largo * clamp(tv / (v.dur * 0.94));
        const nivel = v.nivel();
        this.hablando = hacia(this.hablando, clamp(nivel * 12), 18, dt);
        if (nivel > 0.015 || this.letras < objetivo - 10) this.letras = Math.min(objetivo, this.letras + dt * 70);
        if (tv >= v.dur) this.letras = largo;
      } else {
        const antes = Math.floor(this.letras);
        this.letras = Math.min(largo, this.letras + dt * 30);
        const ch = n.texto[Math.floor(this.letras)] ?? ' ';
        const pausa = ch === ',' || ch === '.' || ch === '?';
        this.msSilaba -= dtMs;
        if (Math.floor(this.letras) > antes && ch !== ' ' && !pausa && this.msSilaba <= 0) {
          son.murmullo(voz.frecRelativa(g.voz), 0.05);
          this.msSilaba = 85 + Math.random() * 40;
          this.hablando = 1;
        }
        if (pausa) this.letras = Math.min(largo, this.letras - dt * 18);
        this.hablando = hacia(this.hablando, 0, 10, dt);
      }
      if (tec.pulsado('Enter') || tec.pulsado('Space')) { this.letras = largo; }
      if (this.letras < largo) return;
    }
    this.hablando = hacia(this.hablando, this.vozEnCurso && this.vozEnCurso.nivel() > 0.015 ? 1 : 0, 10, dt);

    // --- gritar ---
    if (this.gritar) {
      if (tec.pulsado('Escape') || tec.pulsado('Backspace')) { this.gritar = null; return; }
      if (voz.grito > 0.3) this.gritar.progreso += (voz.grito * dt) / 1.2;
      else this.gritar.progreso = Math.max(0, this.gritar.progreso - dt * 0.12);
      if (this.gritar.progreso >= 1) {
        const op = this.gritar.op;
        this.gritar = null;
        if (op.salida) this.salir(op.salida, !!op.traspaso);
      }
      return;
    }

    // --- tararear: en cualquier momento. Si pide una melodia, se la repite nota por nota ---
    const tarareando = voz.estado === 'tarareo';
    this.msSinVoz = tarareando ? 0 : this.msSinVoz + dtMs;
    const quiere = (tarareando && voz.msTarareo > 200) || (this.afinar > 0.2 && this.msSinVoz < 1200);
    this.afinar = hacia(this.afinar, quiere ? 1 : 0, 6, dt);
    if (this.frase && n.tararear) {
      const r = this.frase.actualizar(dtMs, voz, (nota, guia) => son.canto(voz.frecRelativa(nota), guia ? 0.05 : 0.11, guia ? 0.9 : 0.55), true);
      if (r === 'nota') son.campana(voz.frecRelativa(this.frase.notas[this.frase.k - 1]), 0.07);
      if (r === 'error') for (const k of [0, 1, 6]) son.piano(voz.frecRelativa(-11 + k), 0.08);
      if (r === 'completa') {
        son.campana(voz.frecRelativa(0), 0.2);
        this.opc.alIgualar?.();
        if (n.tararear.ir) this.ir(n.tararear.ir);
        else if (n.tararear.salida) this.salir(n.tararear.salida, false);
        return;
      }
    }
    if (tarareando || this.bloqueo > 0) return;

    // un nodo que se cierra solo: despues de decirlo, espera y se va
    if (n.auto) {
      this.msAuto += dtMs;
      const esperaVoz = this.vozEnCurso ? this.vozEnCurso.nivel() > 0.01 : false;
      if (this.msAuto > (n.auto.ms ?? 1800) && !esperaVoz) this.salir(n.auto.salida, !!n.auto.traspaso);
      return;
    }

    // --- elegir ---
    const k = n.opciones.length;
    if (tec.pulsado('ArrowUp') || tec.pulsado('KeyW')) { this.sel = (this.sel + k - 1) % k; son.paso(0.03, 1800); }
    if (tec.pulsado('ArrowDown') || tec.pulsado('KeyS')) { this.sel = (this.sel + 1) % k; son.paso(0.03, 1800); }
    for (let i = 0; i < k; i++) if (tec.pulsado(`Digit${i + 1}`)) { this.sel = i; this.elegir(n.opciones[i], son); return; }
    if (tec.pulsado('Enter')) this.elegir(n.opciones[this.sel], son);
  }

  private elegir(op: Opcion, son: Sonido) {
    if (op.voz === 'gritar') { this.gritar = { op, progreso: 0 }; return; }
    if (op.especial === 'saltar') {
      // no puede: las manos resbalan, las rodillas se agarrotan
      this.saltos++;
      this.sacudida = 1;
      this.bloqueo = 1400;
      son.paso(0.25, 140);
      this.opc.alSaltar?.(this.saltos);
      if (this.saltos >= 3) this.salir('final_nopudo', false);
      return;
    }
    this.callar();
    if (op.ir) this.ir(op.ir);
    else if (op.salida) this.salir(op.salida, !!op.traspaso);
  }

  dibujar(c: CanvasRenderingContext2D, hayMic: boolean, tarareo: number) {
    if (!this.activo || !this.nodo) return;
    const n = this.nodo;
    const a = clamp(this.msAparece / 350) * (1 - clamp(this.cerrando));
    const antes = this.guion!.lado === 'C';
    const x0 = 70, y0 = H - 250, w = W - 140, h = 228;
    c.save();
    c.globalAlpha = a;
    if (this.sacudida > 0) c.translate(Math.sin(this.t * 55) * 7 * this.sacudida, 0);

    c.fillStyle = antes ? 'rgba(239,227,200,0.94)' : 'rgba(3,5,8,0.9)';
    c.fillRect(x0, y0, w, h);
    c.strokeStyle = antes ? 'rgba(75,57,35,0.8)' : `rgba(${RGB.hueso},0.5)`;
    c.lineWidth = 1.5;
    c.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
    const tinta = antes ? '#2d2012' : C.hueso;
    const tenue = antes ? 'rgba(45,32,18,0.45)' : 'rgba(232,227,216,0.42)';

    // el retrato: del PNG si existe, si no el dibujo provisorio. Habla: late.
    const idR = `retrato_${n.retrato}_${n.gesto}`;
    c.save();
    const lat = 1 + this.hablando * 0.018 * Math.sin(this.t * 30);
    c.translate(x0 + 26 + 90, y0 + 24 + 90); c.scale(lat, lat); c.translate(-90, -90);
    if (n.gesto === 'miedo') c.translate(Math.sin(this.t * 40) * 1.2, 0);
    if (porId.has(idR)) pintar(c, idR, 0, 0, 0, 180, 180);
    else retrato(c, n.retrato, n.gesto, 0, 0, 180, this.t, antes);
    c.restore();
    // si canta una nota, su onda sobre el retrato
    if (n.tararear) glifoOnda(c, x0 + 116, y0 + 28, 0.8, this.t, antes);

    if (n.quien) {
      c.fillStyle = tinta;
      c.font = `22px ${TIPO}`;
      c.fillText(n.quien, x0 + 232, y0 + 50);
    }
    c.fillStyle = tinta;
    c.font = `${n.quien ? '' : 'italic '}20px Georgia, serif`;
    const yTexto = y0 + (n.quien ? 84 : 60);
    const anchoTexto = w - 280 - (this.frase ? 250 : 0);
    envolver(c, n.texto.slice(0, Math.floor(this.letras)), x0 + 232, yTexto, anchoTexto, 27);

    const completo = this.letras >= n.texto.length;
    if (completo && !this.gritar) {
      const y = yTexto + lineas(c, n.texto, anchoTexto) * 27 + 14;
      c.save();
      if (this.afinar > 0.3) c.globalAlpha *= 0.35;
      n.opciones.forEach((op, i) => {
        const yy = y + i * 29;
        const elegida = i === this.sel;
        c.save();
        c.fillStyle = elegida ? tinta : tenue;
        c.font = `${elegida ? 'italic ' : ''}19px Georgia, serif`;
        if (elegida) c.fillText('▸', x0 + 236, yy);
        let tx = x0 + 258;
        if (op.voz === 'gritar') {
          c.save(); c.translate(tx + 9, yy - 6); c.scale(0.42, 0.42);
          glifoGrito(c, 0, 0, elegida ? 0.9 : 0.5, this.t);
          c.restore();
          tx += 26;
        }
        c.fillStyle = elegida ? tinta : tenue;
        c.fillText(op.voz === 'gritar' ? (op.texto || '(gritar)') : op.texto, tx, yy);
        c.restore();
      });
      c.restore();
      // la melodia que pide, al costado: sus notas como puntos
      if (this.frase) {
        const fx = x0 + w - 150, fy = y0 + 104;
        this.frase.dibujar(c, fx, fy, 200, this.t, { recuerdo: antes, tuya: tarareo, conOndas: true });
        glifoTarareo(c, fx - 60, y0 + h - 30, 0.55 + 0.3 * Math.sin(this.t * 2.5), this.t);
        c.fillStyle = tenue; c.font = 'italic 17px Georgia, serif';
        c.fillText(n.tararear?.etiqueta ?? '(cantarle)', fx - 38, y0 + h - 24);
      }
    }

    // si nadie pide nada, la voz suena sola: una onda calida abajo
    if (this.afinar > 0.02 && !this.frase) {
      const cx = x0 + 232 + (w - 290) / 2, cy = y0 + h - 40;
      ondas(c, cx, cy, w - 300, this.t, { dif: 0, progreso: 0, tuya: Math.max(tarareo, 0.3), recuerdo: antes, alpha: this.afinar, sinObjetivo: true });
      glifoTarareo(c, x0 + 222, cy, 0.9 * this.afinar, this.t);
    }
    if (this.gritar) this.dibujarGrito(c, x0 + 236, y0 + h - 70, w - 290, antes, hayMic);
    c.restore();
  }

  private dibujarGrito(c: CanvasRenderingContext2D, x: number, y: number, w: number, antes: boolean, hayMic: boolean) {
    const col = antes ? '45,32,18' : RGB.hueso;
    glifoGrito(c, x + w / 2, y - 6, 0.9, this.t);
    c.strokeStyle = `rgba(${col},0.9)`; c.lineWidth = 3;
    c.beginPath(); c.arc(x + w / 2, y - 6, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.gritar!.progreso); c.stroke();
    void hayMic;
  }
}

function partir(c: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = '';
  for (const p of texto.split(' ')) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (c.measureText(prueba).width > ancho && linea) { out.push(linea); linea = p; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}

function envolver(c: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, alto: number) {
  partir(c, texto, ancho).forEach((l, i) => c.fillText(l, x, y + i * alto));
}

function lineas(c: CanvasRenderingContext2D, texto: string, ancho: number) {
  c.font = '20px Georgia, serif';
  return partir(c, texto, ancho).length;
}
