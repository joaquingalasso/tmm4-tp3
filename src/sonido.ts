import { clamp } from './config';
import { sonidoArchivo } from './sonidos/archivos';

/**
 * SONIDO — sintetizado, y cada pieza reemplazable por un archivo
 * (ver sonidos/catalogo.ts). Si el archivo existe, suena el archivo.
 *
 * Capas:
 *   ambiente    el aire de cada lugar (presente, siesta, ruta, cuarto, patio)
 *   capas       tormenta, pantano, perseguidor, halo: volumenes que cambian solos
 *   notas       lo que cantan ellas en el recuerdo (su nota, para igualarla)
 *   cuerpo      latido, que sube con el miedo
 *   voces       los dialogos (archivo, o un murmullo en la nota de cada una)
 *   susurros    tus propios tarareos grabados, devueltos al reves
 * Todo pasa por una reverb larga y una saturacion que crece con el miedo.
 */

export type IdNota = string;
export type Ambiente = 'ahora' | 'antes' | 'ruta' | 'cuarto' | 'patio' | 'silencio';
export type Capa = 'tormenta' | 'pantano' | 'perseguidor' | 'halo';

const ACORDES: Record<Ambiente, number[]> = {
  ahora: [36.7, 55, 65.4],
  antes: [65.4, 98, 130.8, 164.8],
  ruta: [41.2, 61.7, 82.4],
  cuarto: [61.7, 92.5, 123.5],
  patio: [34.6, 51.9, 61.7],
  silencio: [36.7],
};

/** La cancion de cuna: sus notas son las de ellas tres (semitonos sobre tu nota). */
export const CANCION: [number, number][] = [[0, 0.7], [3, 0.7], [-4, 1.2], [0, 0.5], [3, 0.5], [5, 0.9], [3, 0.6], [-4, 1.6]];

interface VozNota { osc: OscillatorNode; osc2: OscillatorNode; gan: GainNode; vib: OscillatorNode; }
interface Bucle { src: AudioBufferSourceNode; gan: GainNode; }

export interface VozEnCurso { inicio: number; dur: number; nivel(): number; parar(): void; }

export class Sonido {
  ctx: BaseAudioContext;
  iniciado = false;
  private master!: GainNode;
  private satura!: WaveShaperNode;
  private driveActual = -1;
  private filtro!: BiquadFilterNode;
  private seco!: GainNode;
  private reverb!: ConvolverNode;
  private reverbGan!: GainNode;
  private ruido!: AudioBuffer;
  private droneGan!: GainNode;
  private droneOsc: OscillatorNode[] = [];
  private notas = new Map<IdNota, VozNota>();
  private bucles = new Map<string, Bucle>();
  private capaGan = new Map<Capa, GainNode>();
  private vientoGan!: GainNode;
  private chicharraGan!: GainNode;
  private proxLatido = 0;
  private proxSusurro = 0;
  private proxBurbuja = 0;
  private proxTrueno = 0;
  private volPantano = 0;
  private volTormenta = 0;

  constructor(ctx: BaseAudioContext) { this.ctx = ctx; }

  iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5;
    this.satura = ctx.createWaveShaper();
    this.master.connect(this.satura).connect(comp).connect(ctx.destination);

    this.filtro = ctx.createBiquadFilter();
    this.filtro.type = 'lowpass';
    this.filtro.frequency.value = 12000;
    this.seco = ctx.createGain();
    this.seco.connect(this.filtro).connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulso(4.2, 2.6);
    this.reverbGan = ctx.createGain();
    this.reverbGan.gain.value = 0.55;
    this.reverb.connect(this.reverbGan).connect(this.filtro);

    this.ruido = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // drone
    this.droneGan = ctx.createGain();
    this.droneGan.gain.value = 0;
    const lpD = ctx.createBiquadFilter();
    lpD.type = 'lowpass'; lpD.frequency.value = 520; lpD.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 180;
    lfo.connect(lfoG).connect(lpD.frequency); lfo.start();
    this.droneGan.connect(lpD);
    this.enviar(lpD, 0.8, 0.5);
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = 55;
      o.detune.value = (i - 2.5) * 7;
      const g = ctx.createGain(); g.gain.value = 0.05;
      o.connect(g).connect(this.droneGan);
      o.start();
      this.droneOsc.push(o);
    }

    // viento
    this.vientoGan = this.ruidoFiltrado('bandpass', 380, 0.6, 1, 0.2);
    // chicharras de la siesta
    this.chicharraGan = ctx.createGain(); this.chicharraGan.gain.value = 0;
    {
      const src = ctx.createBufferSource(); src.buffer = this.ruido; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 9;
      const trem = ctx.createGain(); trem.gain.value = 0.5;
      const lfoC = ctx.createOscillator(); lfoC.frequency.value = 23;
      const lfoCG = ctx.createGain(); lfoCG.gain.value = 0.5;
      lfoC.connect(lfoCG).connect(trem.gain); lfoC.start();
      src.connect(bp).connect(trem).connect(this.chicharraGan);
      this.enviar(this.chicharraGan, 0.5, 0.4);
      src.start();
    }

    // capas sintetizadas
    this.capaGan.set('tormenta', this.ruidoFiltrado('highpass', 1400, 0.4, 0.8, 0.6));
    this.capaGan.set('pantano', this.ruidoFiltrado('lowpass', 260, 1.2, 1, 0.3));
    {
      // el perseguidor: un arrastre que respira
      const g = this.ruidoFiltrado('bandpass', 240, 3, 0.9, 0.7);
      const lfoP = ctx.createOscillator(); lfoP.frequency.value = 0.7;
      const lfoPG = ctx.createGain(); lfoPG.gain.value = 0;
      lfoP.connect(lfoPG); lfoP.start();
      this.capaGan.set('perseguidor', g);
    }
    {
      // el halo: tu voz calienta el aire (acorde fijo, para no realimentar el microfono)
      const halo = ctx.createGain(); halo.gain.value = 0;
      for (const f of [130.8, 196, 261.6, 329.6]) {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 10;
        const g = ctx.createGain(); g.gain.value = 0.045;
        o.connect(g).connect(halo); o.start();
      }
      this.enviar(halo, 0.5, 0.9);
      this.capaGan.set('halo', halo);
    }

    this.saturar(0);
    this.proxLatido = ctx.currentTime + 1;
  }

  private ruidoFiltrado(tipo: BiquadFilterType, f: number, q: number, seco: number, humedo: number) {
    const src = this.ctx.createBufferSource(); src.buffer = this.ruido; src.loop = true;
    const bp = this.ctx.createBiquadFilter(); bp.type = tipo; bp.frequency.value = f; bp.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(bp).connect(g);
    this.enviar(g, seco, humedo);
    src.start(0, Math.random() * 2);
    return g;
  }

  private impulso(seg: number, caida: number): AudioBuffer {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * seg);
    const b = this.ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, caida);
    }
    return b;
  }

  private enviar(n: AudioNode, seco: number, humedo: number) {
    const s = this.ctx.createGain(); s.gain.value = seco;
    const h = this.ctx.createGain(); h.gain.value = humedo;
    n.connect(s).connect(this.seco);
    n.connect(h).connect(this.reverb);
  }

  private saturar(k: number) {
    if (Math.abs(k - this.driveActual) < 1.5) return;
    this.driveActual = k;
    const c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      c[i] = k < 0.5 ? x : ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    this.satura.curve = c;
  }

  // ------------------------------------------------------------ archivos

  /** Dispara un archivo si existe. Devuelve false si no hay (y hay que sintetizar). */
  private tocar(id: string, vol = 1, rate = 1, humedo = 0.4): boolean {
    const b = sonidoArchivo(id);
    if (!b || !this.iniciado) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = b; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); this.enviar(g, 0.9, humedo);
    src.start();
    return true;
  }

  /** Un archivo en bucle con su volumen. Devuelve false si no hay archivo. */
  private bucle(id: string, vol: number, seg = 1.2): boolean {
    const b = sonidoArchivo(id);
    if (!b) return false;
    let e = this.bucles.get(id);
    if (!e) {
      if (vol <= 0.001) return true;
      const src = this.ctx.createBufferSource(); src.buffer = b; src.loop = true;
      const gan = this.ctx.createGain(); gan.gain.value = 0;
      src.connect(gan); this.enviar(gan, 0.9, 0.3);
      src.start();
      e = { src, gan };
      this.bucles.set(id, e);
    }
    e.gan.gain.setTargetAtTime(vol, this.ctx.currentTime, seg / 3);
    return true;
  }

  // ------------------------------------------------------------ ambiente y capas

  /** El aire de un lugar. Con archivo `amb_<lugar>`, el archivo; si no, un acorde. */
  ambiente(lugar: Ambiente, vol = 0.7, seg = 3) {
    if (!this.iniciado) return;
    let conArchivo = false;
    for (const k of Object.keys(ACORDES) as Ambiente[]) {
      const hay = this.bucle(`amb_${k}`, k === lugar ? vol : 0, seg);
      if (k === lugar && hay) conArchivo = true;
    }
    if (conArchivo || lugar === 'silencio') this.droneGan.gain.setTargetAtTime(0, this.ctx.currentTime, seg / 3);
    else this.acorde(ACORDES[lugar], vol, seg);
    this.chicharraGan.gain.setTargetAtTime(lugar === 'antes' && !conArchivo ? 0.05 : 0, this.ctx.currentTime, seg / 3);
  }

  /** El acorde sintetizado. Frecuencias en Hz. */
  acorde(fs: number[], vol = 1, seg = 3) {
    if (!this.iniciado) return;
    const t = this.ctx.currentTime;
    this.droneOsc.forEach((o, i) => o.frequency.setTargetAtTime(fs[i % fs.length] * (i >= fs.length ? 2 : 1), t, seg / 3));
    this.droneGan.gain.setTargetAtTime(vol, t, seg / 3);
  }

  /** Volumen de una capa continua (0..1). */
  capa(id: Capa, vol: number) {
    if (!this.iniciado) return;
    if (id === 'pantano') this.volPantano = vol;
    if (id === 'tormenta') this.volTormenta = vol;
    const conArchivo = this.bucle(id, vol, 0.8);
    const escala = id === 'halo' ? 1 : id === 'tormenta' ? 0.35 : id === 'pantano' ? 0.5 : 0.4;
    this.capaGan.get(id)!.gain.setTargetAtTime(conArchivo ? 0 : vol * escala, this.ctx.currentTime, 0.25);
  }

  viento(v: number) { if (this.iniciado) this.vientoGan.gain.setTargetAtTime(v, this.ctx.currentTime, 0.8); }

  // ------------------------------------------------------------ voces

  /** Una nota sostenida y temblorosa (lo que canta una de ellas, asustada). */
  nota(id: IdNota, f: number, vol: number, temblor = 1) {
    if (!this.iniciado) return;
    let v = this.notas.get(id);
    const t = this.ctx.currentTime;
    if (!v) {
      const osc = this.ctx.createOscillator(); osc.type = 'triangle';
      const osc2 = this.ctx.createOscillator(); osc2.type = 'sine';
      const vib = this.ctx.createOscillator(); vib.frequency.value = 5.2;
      const vibG = this.ctx.createGain(); vibG.gain.value = 6;
      vib.connect(vibG); vibG.connect(osc.detune); vibG.connect(osc2.detune);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const gan = this.ctx.createGain(); gan.gain.value = 0;
      const g2 = this.ctx.createGain(); g2.gain.value = 0.5;
      osc.connect(lp); osc2.connect(g2).connect(lp); lp.connect(gan);
      this.enviar(gan, 0.6, 0.8);
      osc.start(); osc2.start(); vib.start();
      v = { osc, osc2, gan, vib };
      this.notas.set(id, v);
    }
    v.osc.frequency.setTargetAtTime(f, t, 0.05);
    v.osc2.frequency.setTargetAtTime(f * 2, t, 0.05);
    v.vib.frequency.setTargetAtTime(4 + temblor * 3, t, 0.3);
    v.gan.gain.setTargetAtTime(vol * 0.16, t, 0.25);
  }

  callarNota(id: IdNota, seg = 1.5) {
    const v = this.notas.get(id);
    if (!v) return;
    const t = this.ctx.currentTime;
    v.gan.gain.setTargetAtTime(0, t, seg / 3);
    setTimeout(() => { v.osc.stop(); v.osc2.stop(); v.vib.stop(); }, seg * 1000 + 400);
    this.notas.delete(id);
  }

  callarNotas() { for (const k of [...this.notas.keys()]) this.callarNota(k, 1); }

  /** Una linea de dialogo grabada. Devuelve como seguirla, para sincronizar el texto. */
  voz(b: AudioBuffer): VozEnCurso | null {
    if (!this.iniciado) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain(); g.gain.value = 1;
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    src.connect(g); g.connect(an);
    this.enviar(g, 1, 0.25);
    const inicio = ctx.currentTime + 0.02;
    src.start(inicio);
    const datos = new Float32Array(an.fftSize);
    let viva = true;
    src.onended = () => { viva = false; };
    return {
      inicio, dur: b.duration,
      nivel: () => {
        if (!viva) return 0;
        an.getFloatTimeDomainData(datos);
        let s = 0;
        for (let i = 0; i < datos.length; i++) s += datos[i] * datos[i];
        return Math.sqrt(s / datos.length);
      },
      parar: () => { if (viva) { g.gain.setTargetAtTime(0, ctx.currentTime, 0.08); src.stop(ctx.currentTime + 0.4); viva = false; } },
    };
  }

  /** Cuando no hay voz grabada: una silaba murmurada en la altura de quien habla. */
  murmullo(f: number, vol = 0.05) {
    if (!this.iniciado) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const dur = 0.07 + Math.random() * 0.07;
    const o = ctx.createOscillator(); o.type = 'triangle';
    const ff = f * Math.pow(2, (Math.random() * 4 - 2) / 12);
    o.frequency.setValueAtTime(ff, t);
    o.frequency.linearRampToValueAtTime(ff * (0.94 + Math.random() * 0.1), t + dur);
    const fm = ctx.createBiquadFilter(); fm.type = 'bandpass'; fm.frequency.value = 700 + Math.random() * 900; fm.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fm).connect(g); this.enviar(g, 0.8, 0.5);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** Una nota tarareada por alguien (para las frases que hay que repetir). */
  canto(f: number, vol = 0.1, dur = 0.55) {
    if (!this.iniciado) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
    const vib = ctx.createOscillator(); vib.frequency.value = 5;
    const vg = ctx.createGain(); vg.gain.value = 8;
    vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g);
    this.enviar(g, 0.6, 0.9);
    for (const x of [o, o2, vib]) { x.start(t); x.stop(t + dur + 0.05); }
  }

  /** La cancion de cuna, tarareada. `f0` es la frecuencia de la nota base. */
  cancion(f0: number, vol = 0.14, velocidad = 1) {
    if (!this.iniciado) return;
    if (this.tocar('cancion', vol * 5, 1, 0.9)) return;
    const ctx = this.ctx;
    let t = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(); o.type = 'sine';
    const o2 = ctx.createOscillator(); o2.type = 'triangle';
    const vib = ctx.createOscillator(); vib.frequency.value = 4.6;
    const vg = ctx.createGain(); vg.gain.value = 9;
    vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g);
    this.enviar(g, 0.5, 1);
    const inicio = t;
    for (const [n, d] of CANCION) {
      const f = f0 * Math.pow(2, n / 12);
      o.frequency.setTargetAtTime(f, t, 0.04);
      o2.frequency.setTargetAtTime(f, t, 0.04);
      g.gain.setTargetAtTime(vol, t, 0.06);
      g.gain.setTargetAtTime(vol * 0.55, t + d * 0.7 / velocidad, 0.1);
      t += d / velocidad;
    }
    g.gain.setTargetAtTime(0.0001, t, 0.4);
    for (const x of [o, o2, vib]) { x.start(inicio); x.stop(t + 2); }
  }

  /** Una tecla de piano viejo. */
  piano(f: number, vol = 0.2) {
    if (!this.iniciado) return;
    if (this.tocar('piano', vol * 4, f / 261.63, 0.8)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [m, a, dt] of [[1, 1, 0], [2, 0.5, 0.002], [3, 0.22, 0], [4.01, 0.1, 0]] as const) {
      const o = ctx.createOscillator(); o.type = m === 1 ? 'triangle' : 'sine';
      o.frequency.value = f * m; o.detune.value = (Math.random() - 0.5) * 14;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(vol * a, t + dt + 0.008);
      g.gain.exponentialRampToValueAtTime(vol * a * 0.3, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(g); this.enviar(g, 0.6, 0.9);
      o.start(t); o.stop(t + 3.3);
    }
  }

  // ------------------------------------------------------------ efectos

  /** Una campana consonante: se igualo la nota. */
  campana(f: number, vol = 0.25) {
    if (!this.iniciado) return;
    if (this.tocar('campana', vol * 3, f / 261.63, 1)) return;
    const t = this.ctx.currentTime;
    for (const [m, a] of [[1, 1], [2, 0.4], [3, 0.2], [4.2, 0.12]] as const) {
      const o = this.ctx.createOscillator(); o.frequency.value = f * m;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * a, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g); this.enviar(g, 0.5, 1);
      o.start(t); o.stop(t + 3.6);
    }
  }

  /** La sombra que pasa de una de ellas a la nena: un gorgoteo que baja. */
  tinta(dur = 2.2) {
    if (!this.iniciado) return;
    if (this.tocar('tinta', 1, 1, 0.8)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.ruido; s.loop = true;
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 14;
    f1.frequency.setValueAtTime(900, t);
    f1.frequency.exponentialRampToValueAtTime(90, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f1).connect(g);
    this.enviar(g, 0.7, 0.8);
    s.start(t); s.stop(t + dur + 0.1);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t + dur * 0.7);
    o.frequency.exponentialRampToValueAtTime(32, t + dur + 1);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.0001, t + dur * 0.7);
    go.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.75);
    go.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    o.connect(go); this.enviar(go, 1, 0.3);
    o.start(t + dur * 0.7); o.stop(t + dur + 1.3);
  }

  trueno() {
    if (!this.iniciado) return;
    if (this.tocar('trueno', 1, 0.9 + Math.random() * 0.2, 0.6)) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.3 + Math.random() * 0.6;
    const s = ctx.createBufferSource(); s.buffer = this.ruido;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    s.connect(lp).connect(g); this.enviar(g, 0.8, 0.6);
    s.start(t, 0, 3);
  }

  paso(vol = 0.05, brillo = 1100) {
    if (!this.iniciado) return;
    if (this.tocar(brillo > 1500 ? 'paso_antes' : 'paso_ahora', vol * 10, 0.92 + Math.random() * 0.16, 0.25)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.ruido;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = brillo * (0.8 + Math.random() * 0.4); bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(bp).connect(g); this.enviar(g, 1, 0.25);
    s.start(t, Math.random() * 2, 0.12);
  }

  gota(grave = false) {
    if (!this.iniciado) return;
    if (this.tocar('gota', grave ? 0.5 : 1, grave ? 0.5 : 1, 1.2)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    const f = grave ? 180 + Math.random() * 120 : 1400 + Math.random() * 900;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(grave ? 0.2 : 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); this.enviar(g, 0.3, 1.2);
    o.start(t); o.stop(t + 0.2);
  }

  /** La alcanzaron: hundirse. */
  ahogo() {
    if (!this.iniciado) return;
    if (this.tocar('ahogo', 1, 1, 0.8)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.ruido; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    s.connect(lp).connect(g); this.enviar(g, 0.9, 0.7);
    s.start(t); s.stop(t + 3.2);
    for (let i = 0; i < 6; i++) setTimeout(() => this.gota(true), 200 + i * 260);
  }

  /** La cinta que se rebobina: un chirrido que baja y tiembla. */
  rebobinar(dur: number) {
    if (!this.iniciado) return;
    if (this.tocar('rebobinar', 0.8, 2.2 / Math.max(0.5, dur), 0.3)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(1800, t);
    o.frequency.exponentialRampToValueAtTime(260, t + dur);
    const w = ctx.createOscillator(); w.frequency.value = 17;
    const wg = ctx.createGain(); wg.gain.value = 120;
    w.connect(wg).connect(o.frequency);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.1);
    g.gain.setValueAtTime(0.05, t + Math.max(0.2, dur - 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g); this.enviar(g, 0.8, 0.3);
    o.start(t); o.stop(t + dur + 0.05); w.start(t); w.stop(t + dur + 0.05);
    const s = ctx.createBufferSource(); s.buffer = this.ruido;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const gs = ctx.createGain(); gs.gain.value = 0.04;
    s.connect(hp).connect(gs); this.enviar(gs, 1, 0.1);
    s.start(t, 0, dur);
  }

  /** Papel que se rasga. */
  desgarro() {
    if (!this.iniciado) return;
    if (this.tocar('desgarro', 1, 1, 0.5)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.ruido;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.linearRampToValueAtTime(3600, t + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < 40; k++) g.gain.setValueAtTime(0.2 + Math.random() * 0.6, t + k * 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    s.connect(bp).connect(g); this.enviar(g, 1, 0.5);
    s.start(t, 0, 2);
  }

  /** El grito: primero todo se chupa hacia adentro, despues estalla. */
  estallido() {
    if (!this.iniciado) return;
    this.callarNotas();
    this.droneGan.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    for (const [id] of this.bucles) this.bucle(id, 0, 0.6);
    if (this.tocar('estallido', 1, 1, 1)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.ruido; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(8000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    s.connect(lp).connect(g); this.enviar(g, 0.9, 1);
    s.start(t); s.stop(t + 5.2);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(24, t + 3);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.9, t);
    go.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    o.connect(go).connect(this.master);
    o.start(t); o.stop(t + 4.1);
  }

  /** Callar todo lo continuo (para los finales). */
  apagarTodo(seg = 2) {
    if (!this.iniciado) return;
    const t = this.ctx.currentTime;
    this.callarNotas();
    this.droneGan.gain.setTargetAtTime(0, t, seg / 3);
    this.chicharraGan.gain.setTargetAtTime(0, t, seg / 3);
    this.vientoGan.gain.setTargetAtTime(0, t, seg / 3);
    for (const [, g] of this.capaGan) g.gain.setTargetAtTime(0, t, seg / 3);
    for (const [id] of this.bucles) this.bucle(id, 0, seg);
    this.volPantano = this.volTormenta = 0;
  }

  /** Un tono puro que queda despues de todo. */
  tonoFinal(f: number, vol = 0.1, seg = 12) {
    if (!this.iniciado) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 3);
    g.gain.linearRampToValueAtTime(0.0001, t + seg);
    o.connect(g); this.enviar(g, 0.5, 1);
    o.start(t); o.stop(t + seg + 0.2);
  }

  /** Un fragmento de tu propio tarareo, al reves, lento, lejos. */
  private susurro(banco: AudioBuffer[], vol: number) {
    const ctx = this.ctx, t = ctx.currentTime;
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 2 - 1;
    const g = ctx.createGain();
    pan.connect(g);
    this.enviar(g, 0.4, 1);
    if (banco.length) {
      const orig = banco[Math.floor(Math.random() * banco.length)];
      const b = ctx.createBuffer(1, orig.length, orig.sampleRate);
      const a = orig.getChannelData(0), d = b.getChannelData(0);
      let pico = 0.001;
      for (let i = 0; i < a.length; i++) { d[i] = a[a.length - 1 - i]; pico = Math.max(pico, Math.abs(d[i])); }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.playbackRate.value = 0.62 + Math.random() * 0.25;
      g.gain.value = clamp(0.35 / pico, 0, 30) * vol;
      s.connect(pan); s.start(t);
      return;
    }
    const s = ctx.createBufferSource(); s.buffer = this.ruido;
    const dur = 0.6 + Math.random();
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 10;
    f1.frequency.setValueAtTime(400 + Math.random() * 500, t);
    f1.frequency.linearRampToValueAtTime(300 + Math.random() * 900, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * vol, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f1).connect(pan); s.start(t, Math.random() * 2, dur);
  }

  actualizar(e: { miedo: number; halo: number; banco: AudioBuffer[]; susurros: number; latido: number }) {
    if (!this.iniciado) return;
    const t = this.ctx.currentTime;
    const m = e.miedo;
    this.filtro.frequency.setTargetAtTime(12000 - m * 10500, t, 0.4);
    this.capa('halo', e.halo);
    this.saturar(m * m * 24);
    if (e.latido > 0 && t >= this.proxLatido) {
      const bpm = 58 + m * 90;
      if (!this.tocar('latido', e.latido * (0.2 + m * 0.8), 1, 0.1)) {
        this.golpe(t, 50, e.latido * (0.15 + m * 0.7));
        this.golpe(t + 0.17, 44, e.latido * (0.1 + m * 0.45));
      }
      this.proxLatido = t + 60 / bpm;
    }
    if (e.susurros > 0 && t >= this.proxSusurro) {
      this.susurro(e.banco, e.susurros);
      this.proxSusurro = t + 0.6 + Math.random() * (2.4 - e.susurros * 1.6);
    }
    // el pantano burbujea; la tormenta truena sola
    if (this.volPantano > 0.15 && t >= this.proxBurbuja && !sonidoArchivo('pantano')) {
      this.gota(true);
      this.proxBurbuja = t + 0.15 + Math.random() * (1.4 - this.volPantano);
    }
    if (this.volTormenta > 0.2 && t >= this.proxTrueno && !sonidoArchivo('tormenta')) {
      this.trueno();
      this.proxTrueno = t + 5 + Math.random() * 7;
    }
  }

  golpe(t: number, f: number, vol: number) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.25);
  }

  volumen(v: number, seg = 0.6) { if (this.iniciado) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, seg / 3); }
  humedad(v: number) { if (this.iniciado) this.reverbGan.gain.setTargetAtTime(v, this.ctx.currentTime, 1); }
}
