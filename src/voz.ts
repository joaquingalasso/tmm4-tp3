import { BAL, clamp, frecuencia, semitono } from './config';

/**
 * LA VOZ DEL JUGADOR.
 *
 * Audere se juega tarareando. El microfono no solo escucha si sonas: escucha
 * la ALTURA de tu voz (deteccion de pitch con YIN), cuanto sostenes la nota,
 * y si en vez de tararear gritas.
 *
 *   tarareo  voz tonal, sostenida, por encima del ruido del lugar
 *   voz      sonido que no llega a ser una nota (hablar, soplar)
 *   grito    muy fuerte, lo que el juego no pide hasta el final
 *
 * Al empezar se mide el ruido del lugar y la nota natural de quien juega: todas
 * las notas del juego son relativas a esa, asi funciona igual con cualquier voz.
 *
 * Ademas guarda fragmentos de lo que tarareaste. Despues, afuera, esos
 * fragmentos vuelven al reves y desafinados: la cancion que heredaste.
 */

export type EstadoVoz = 'silencio' | 'tarareo' | 'voz' | 'grito';

const WORKLET = `
class Grabador extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.i = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let k = 0; k < ch.length; k++) {
      this.buf[this.i++] = ch[k];
      if (this.i === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.i = 0; }
    }
    return true;
  }
}
registerProcessor('grabador-audere', Grabador);
`;

export class Voz {
  ctx: AudioContext;
  disponible = false;
  error = '';

  nivel = 0;
  piso = 0.0015;
  /** Frecuencia detectada (Hz) y su claridad 0..1. */
  f = 0;
  claridad = 0;
  /** Semitono suavizado (MIDI, con decimales). */
  nota = 0;
  /** La nota natural del jugador, medida al principio. */
  base = 57;
  baseMedida = false;

  estado: EstadoVoz = 'silencio';
  /** 0..1, que tan fuerte y firme es el tarareo. */
  fuerza = 0;
  /** ms de tarareo continuo. */
  msTarareo = 0;
  /** 0..1, fuerza del grito sostenido. */
  grito = 0;

  /** Respaldo de teclado cuando no hay microfono. */
  respaldoTarareo = false;
  respaldoGrito = false;
  respaldoNota = 0;

  banco: AudioBuffer[] = [];

  private analizador: AnalyserNode | null = null;
  private buf = new Float32Array(2048);
  private yinBuf = new Float32Array(1024);
  private historia: number[] = [];
  private msHueco = 0;
  private workletCargado = false;

  private anillo = new Float32Array(1);
  private escritos = 0;
  private inicioAct = -1;
  private msAct = 0;
  private msSilAct = 0;

  private calibrando = false;
  private muestrasPiso: number[] = [];
  private muestrasNota: number[] = [];

  constructor(ctx: AudioContext) { this.ctx = ctx; }

  async iniciar(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // La cancelacion de eco evita que el microfono escuche la musica del juego;
        // la supresion de ruido y el control de ganancia se apagan porque deforman la voz.
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      });
      await this.conectar(this.ctx.createMediaStreamSource(stream));
      this.disponible = true;
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  async conectar(src: AudioNode) {
    this.analizador = this.ctx.createAnalyser();
    this.analizador.fftSize = 2048;
    src.connect(this.analizador);
    this.anillo = new Float32Array(Math.floor(this.ctx.sampleRate * 6));
    try {
      if (!this.workletCargado) {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        await this.ctx.audioWorklet.addModule(url);
        this.workletCargado = true;
      }
      const nodo = new AudioWorkletNode(this.ctx, 'grabador-audere');
      nodo.port.onmessage = (e) => this.escribir(e.data as Float32Array);
      const mudo = this.ctx.createGain();
      mudo.gain.value = 0;
      src.connect(nodo);
      nodo.connect(mudo).connect(this.ctx.destination);
    } catch { /* sin grabacion: no hay susurros con tu voz, el resto anda */ }
  }

  private escribir(b: Float32Array) {
    const n = this.anillo.length;
    for (let i = 0; i < b.length; i++) this.anillo[(this.escritos + i) % n] = b[i];
    this.escritos += b.length;
  }

  empezarCalibracionPiso() { this.calibrando = true; this.muestrasPiso = []; }
  terminarCalibracionPiso() {
    this.calibrando = false;
    if (this.muestrasPiso.length < 5) return;
    const o = [...this.muestrasPiso].sort((a, b) => a - b);
    this.piso = Math.max(0.0008, o[Math.floor(o.length * 0.8)]);
  }

  /** Cada nota tarareada durante el primer contacto afina la nota base. */
  registrarBase() {
    if (this.estado !== 'tarareo' || this.baseMedida) return;
    this.muestrasNota.push(this.nota);
    if (this.muestrasNota.length > 70) {
      const o = [...this.muestrasNota].sort((a, b) => a - b);
      this.base = o[Math.floor(o.length / 2)];
      this.baseMedida = true;
    }
  }

  get umbral() { return Math.max(this.piso * BAL.factorPiso, BAL.minimoAbsoluto); }
  get umbralGrito() { return Math.max(this.piso * BAL.factorGrito, BAL.minimoGrito); }

  actualizar(dtMs: number) {
    const dt = dtMs / 1000;
    let crudo = 0;
    let tonal = false;
    if (this.analizador) {
      this.analizador.getFloatTimeDomainData(this.buf);
      let s = 0;
      for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i];
      crudo = Math.sqrt(s / this.buf.length);
      if (crudo > this.umbral * 0.8) {
        this.yin();
        tonal = this.claridad > BAL.claridadTarareo && this.f > 70 && this.f < 900;
      } else {
        this.claridad = 0;
      }
    }
    this.nivel += (crudo - this.nivel) * (crudo > this.nivel ? 0.4 : 0.1);
    if (this.calibrando) this.muestrasPiso.push(crudo);

    // --- clasificar ---
    let e: EstadoVoz = 'silencio';
    if (this.respaldoGrito) e = 'grito';
    else if (this.respaldoTarareo) e = 'tarareo';
    else if (this.nivel > this.umbralGrito) e = 'grito';
    else if (this.nivel > this.umbral) e = tonal ? 'tarareo' : 'voz';

    if (e === 'tarareo') {
      const n = this.respaldoTarareo ? this.base + this.respaldoNota : semitono(this.f);
      this.historia.push(n);
      if (this.historia.length > 5) this.historia.shift();
      const med = [...this.historia].sort((a, b) => a - b)[Math.floor(this.historia.length / 2)];
      this.nota = this.msTarareo < 60 ? med : this.nota + (med - this.nota) * 0.35;
      this.msTarareo += dtMs;
      this.msHueco = 0;
      this.estado = 'tarareo';
    } else {
      this.msHueco += dtMs;
      if (this.msHueco > BAL.msHueco) {
        this.msTarareo = 0;
        this.historia = [];
        this.estado = e;
      }
    }

    const fuerzaObj = this.estado === 'tarareo'
      ? (this.respaldoTarareo ? 0.75 : clamp(0.35 + (this.nivel - this.umbral) / (this.umbral * 5)))
      : 0;
    this.fuerza += (fuerzaObj - this.fuerza) * (fuerzaObj > this.fuerza ? 0.2 : 0.12);

    const gritando = this.estado === 'grito' || e === 'grito';
    const gObj = gritando ? clamp(this.respaldoGrito ? 1 : this.nivel / (this.umbralGrito * 1.6)) : 0;
    this.grito += (gObj - this.grito) * (gObj > this.grito ? 0.3 : 0.08);

    this.seguirActividad(dtMs, this.estado === 'tarareo' && !this.respaldoTarareo);
    void dt;
  }

  /** YIN sobre 1024 muestras. */
  private yin() {
    const sr = this.ctx.sampleRate;
    const N = 1024;
    const tauMax = Math.min(N - 1, Math.floor(sr / 70));
    const tauMin = Math.floor(sr / 900);
    const d = this.yinBuf;
    const x = this.buf;
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let i = 0; i < N; i++) { const v = x[i] - x[i + tau]; s += v * v; }
      d[tau] = s;
    }
    let acum = 0;
    d[0] = 1;
    for (let tau = 1; tau <= tauMax; tau++) {
      acum += d[tau];
      d[tau] = acum > 0 ? (d[tau] * tau) / acum : 1;
    }
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (d[t] < 0.15) {
        while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau < 0) {
      let min = 1;
      for (let t = tauMin; t <= tauMax; t++) if (d[t] < min) { min = d[t]; tau = t; }
    }
    if (tau <= 0) { this.claridad = 0; return; }
    const a = d[tau - 1] ?? d[tau], b = d[tau], c = d[tau + 1] ?? d[tau];
    const den = a + c - 2 * b;
    const fino = den !== 0 ? tau + (a - c) / (2 * den) : tau;
    this.f = sr / fino;
    this.claridad = clamp(1 - b);
  }

  private seguirActividad(dtMs: number, activo: boolean) {
    if (this.anillo.length < 2) return;
    if (activo) {
      if (this.inicioAct < 0) this.inicioAct = this.escritos;
      this.msAct += dtMs;
      this.msSilAct = 0;
      return;
    }
    if (this.inicioAct < 0) return;
    this.msSilAct += dtMs;
    if (this.msSilAct < 240) return;
    const sr = this.ctx.sampleRate;
    const dur = this.msAct / 1000;
    const hasta = this.escritos;
    const largo = Math.min(hasta - Math.max(0, this.inicioAct - sr * 0.1), Math.floor(sr * 4), this.anillo.length - 1);
    if (dur >= 0.5 && largo > sr * 0.4) {
      const b = this.ctx.createBuffer(1, largo, sr);
      const d = b.getChannelData(0);
      const n = this.anillo.length;
      for (let i = 0; i < largo; i++) d[i] = this.anillo[(hasta - largo + i) % n];
      this.banco.push(b);
      if (this.banco.length > 10) this.banco.shift();
    }
    this.inicioAct = -1;
    this.msAct = 0;
  }

  /** Frecuencia de una nota relativa a la base del jugador. */
  frecRelativa(semitonos: number) { return frecuencia(this.base + semitonos); }

  /** Para pruebas desde la consola. */
  simular(estado: EstadoVoz, notaRel = 0) {
    this.respaldoTarareo = estado === 'tarareo';
    this.respaldoGrito = estado === 'grito';
    this.respaldoNota = notaRel;
  }
}
