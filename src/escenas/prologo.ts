import { C, H, W, clamp, hash, lerp, suave } from '../config';
import { cabeza, cuadroEn, hoja, pintar } from '../sprites/hojas';
import { bocaDelAljibe, ondular } from '../pozo';
import type { EstadoPost } from '../tres/motor';
import type { Contexto, Escena, NombreEscena } from './escena';

/**
 * PROLOGO — como llego ahi. Sin palabras. Todo se cuenta con sombras, como en
 * el resto del juego.
 *
 *   1. La ruta de noche. El auto con la familia apretada. Alguien tararea la
 *      cancion de cuna.
 *   2. El patio de la siesta. La madre le tiene la mano a la nena; la nena se
 *      suelta y corre al aljibe. La sombra de la madre, en la pared, tiembla.
 *   3. Desde arriba: la cara de la nena en el agua. Tres cosas bajan colgadas
 *      detras de ella: una llave, un rosario, un espejito. Cae una gota y el
 *      agua se oscurece.
 *   4. De esa oscuridad sale su cara de grande, veinte anos despues.
 *
 * Mantener una tecla (o ESC) lo saltea.
 */

const TOMAS = [0, 8000, 16000, 25000, 32000];
const FIN = 33500;
const CABEZAS = ['madre', 'abuela', 'mariela'] as const;
/** lo que cada una le da: la llave, el rosario, el espejito */
const OBJETOS = ['objeto_llave', 'objeto_rosario', 'objeto_espejo'] as const;

export class Prologo implements Escena {
  siguiente: NombreEscena | null = null;
  encierro = 1;
  private t = 0;
  private ms = 0;
  private toma = -1;
  private msSaltear = 0;
  private agua = document.createElement('canvas');
  private x!: Contexto;

  constructor() { this.agua.width = this.agua.height = 720; }

  alEntrar(x: Contexto) {
    this.x = x;
    this.siguiente = null;
    this.t = 0;
    this.ms = 0;
    this.toma = -1;
    this.msSaltear = 0;
  }

  actualizar(dtMs: number, x: Contexto) {
    this.t += dtMs / 1000;
    this.ms += dtMs;
    let n = 0;
    while (n < TOMAS.length - 1 && this.ms >= TOMAS[n + 1]) n++;
    if (n !== this.toma) { this.toma = n; this.alCortar(n); }
    if (x.tec.pulsado('Escape') || x.tec.pulsado('Enter')) this.ms = Math.max(this.ms, FIN);
    this.msSaltear = x.tec.alguna ? this.msSaltear + dtMs : 0;
    if (this.msSaltear > 900) this.ms = Math.max(this.ms, FIN);
    if (this.ms >= FIN) { x.son.callarNotas(); this.siguiente = 'escenario'; }
  }

  private alCortar(n: number) {
    const s = this.x.son, v = this.x.voz;
    if (n === 0) { s.ambiente('ruta', 0.5, 4); s.viento(0.08); setTimeout(() => s.cancion(v.frecRelativa(-5), 0.1, 0.85), 1800); }
    if (n === 1) { s.ambiente('antes', 0.4, 3); s.viento(0.01); s.humedad(0.3); }
    if (n === 2) { setTimeout(() => s.gota(), 4200); }
    if (n === 3) { s.ambiente('ahora', 0.5, 4); s.humedad(0.7); s.tinta(4); }
    if (n === 4) s.ambiente('silencio');
  }

  dibujar(mundo: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    const c = mundo;
    const tt = this.toma >= 0 ? (this.ms - TOMAS[this.toma]) / 1000 : 0;
    if (this.toma === 0) this.ruta(c, tt);
    if (this.toma === 1) this.patio(c, tt);
    if (this.toma === 2) this.reflejo(c, tt);
    if (this.toma === 3) this.retratoAdulta(c, tt);
    if (this.toma >= 4) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }

    if (this.msSaltear > 120) {
      capa.save();
      capa.strokeStyle = C.hueso; capa.globalAlpha = 0.6; capa.lineWidth = 2;
      capa.beginPath(); capa.arc(W - 40, H - 40, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(this.msSaltear / 900)); capa.stroke();
      capa.restore();
    }
  }

  private ruta(c: CanvasRenderingContext2D, tt: number) {
    // la ruta cubre toda la pantalla; el relampago va ENCIMA, como una luz que lo alcanza todo
    const alto = H, ancho = alto * (1920 / 540);
    const off = (this.t * 260) % ancho;
    for (let k = -1; k < 2; k++) pintar(c, 'pro_ruta', 0, k * ancho - off, 0, ancho, alto);
    const rw = 520, rh = rw * (260 / 600);
    pintar(c, 'pro_renault', cuadroEn('pro_renault', this.t), W * 0.36 - rw / 2 + Math.sin(this.t * 0.7) * 12, H * 0.9 - rh, rw, rh);
    const rel = Math.max(0, Math.sin(tt * 1.7) ** 40);
    if (rel > 0.01) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(150,170,195,${0.35 * rel})`); g.addColorStop(0.6, `rgba(150,170,195,${0.08 * rel})`); g.addColorStop(1, 'rgba(150,170,195,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.restore();
    }
  }

  private patio(c: CanvasRenderingContext2D, tt: number) {
    pintar(c, 'pro_patio', 0, 0, 0, W, H);
    const piso = H * 0.84;
    const aw = 230, ah = aw * (640 / 520);
    const ax = W * 0.7;
    const hm = hoja('madre_joven');
    const mh = 330, mw = mh * (hm.w / hm.h);
    const mx = W * 0.2;
    // su sombra en la pared, detras de todo: enorme, y tiembla cuando la nena se suelta
    const suelta = suave(1.4, 2.2, tt);
    const hs = hoja('sombra_madre');
    const sAlto = 560 + suelta * 60, sAncho = sAlto * (hs.w / hs.h);
    c.save();
    c.globalAlpha = 0.3 + suelta * 0.12;
    c.filter = 'brightness(0) blur(2px)';
    pintar(c, 'sombra_madre', cuadroEn('sombra_madre', this.t * (1 + suelta * 3)), mx + 60 - sAncho / 2 + suelta * Math.sin(this.t * 30) * 3, piso - 30 - sAlto, sAncho, sAlto);
    c.restore();
    pintar(c, 'aljibe_recuerdo', 0, ax - aw / 2, piso - ah, aw, ah);
    pintar(c, 'madre_joven', cuadroEn('madre_joven', this.t), mx - mw / 2, piso - mh, mw, mh, true);
    // la nena se suelta y corre
    const u = suave(1.6, 5.4, tt);
    const nx = lerp(mx + 70, ax - aw / 2 - 30, u);
    const corre = u > 0 && u < 1;
    const id = corre ? 'nina_camina' : 'nina_quieta';
    const h = hoja(id);
    const ph = 240, pw = ph * (h.w / h.h);
    pintar(c, id, cuadroEn(id, this.t * (corre ? 1.4 : 1)), nx - pw / 2, piso - ph, pw, ph);
  }

  private reflejo(c: CanvasRenderingContext2D, tt: number) {
    // desde arriba: la boca del aljibe; en el agua su cara, y tres cabezas que se asoman detras
    const a = this.agua.getContext('2d')!;
    a.clearRect(0, 0, 720, 720);
    pintar(a, 'pro_reflejo', cuadroEn('pro_reflejo', this.t), 0, 0, 720, 720);
    // tres cosas bajan colgadas sobre el agua, detras de su cara: una llave, un rosario, un espejito
    const asoma = suave(0.8, 4, tt);
    OBJETOS.forEach((id, i) => {
      const ang = -Math.PI / 2 + (i - 1) * 0.95;
      const r = lerp(470, 235, asoma);
      const tam = lerp(120, 190, asoma);
      const px = 360 + Math.cos(ang) * r + Math.sin(this.t * 1.2 + i) * 8, py = 360 + Math.sin(ang) * r;
      // el hilo del que cuelga, desde afuera del agua
      a.save();
      a.strokeStyle = `rgba(0,0,0,${0.7 * asoma})`; a.lineWidth = 3;
      a.beginPath(); a.moveTo(360 + Math.cos(ang) * 520, 360 + Math.sin(ang) * 520); a.lineTo(px, py); a.stroke();
      a.translate(px, py);
      // el cielo reflejado detras de cada cosa: asi se recortan contra el agua
      const cielo = a.createRadialGradient(0, 0, 0, 0, 0, tam * 0.8);
      cielo.addColorStop(0, `rgba(236,222,190,${0.55 * asoma})`); cielo.addColorStop(1, 'rgba(236,222,190,0)');
      a.fillStyle = cielo; a.beginPath(); a.arc(0, 0, tam * 0.8, 0, Math.PI * 2); a.fill();
      a.rotate(ang + Math.PI / 2 + Math.sin(this.t * 1.5 + i) * 0.15);
      a.globalAlpha = 0.95 * asoma;
      a.filter = 'brightness(0)';
      pintar(a, id, 0, -tam / 2, -tam / 2, tam, tam);
      a.restore();
    });
    const golpe = Math.max(0, tt - 4.2);
    const amp = 2.5 + (golpe > 0 ? 16 * Math.exp(-golpe * 1.2) : 0);
    const r = lerp(H * 0.42, H * 0.5, suave(0, 7, tt));
    bocaDelAljibe(c, W / 2, H / 2, r, (k) => ondular(k, this.agua, W / 2 - r, H / 2 - r, r * 2, r * 2, this.t, amp, 0.05), { recuerdo: true, t: this.t });
    // despues de la gota, el agua se oscurece de a poco
    const noche = suave(5.5, 9, tt);
    if (noche > 0) { c.fillStyle = `rgba(2,3,5,${noche})`; c.fillRect(0, 0, W, H); }
    // la gota, que cae desde arriba sobre el agua
    if (tt > 3.6 && tt < 4.25) {
      const u = (tt - 3.6) / 0.65;
      c.fillStyle = 'rgba(246,239,224,0.95)';
      c.beginPath(); c.ellipse(W / 2 + 40, lerp(H * 0.08, H / 2, u * u), 5, 9, 0, 0, Math.PI * 2); c.fill();
    }
  }

  /** De la oscuridad del agua sale su cara de grande: Josefina, veinte anos despues. */
  private retratoAdulta(c: CanvasRenderingContext2D, tt: number) {
    c.fillStyle = '#020305'; c.fillRect(0, 0, W, H);
    const a = suave(0.3, 2.6, tt) * (1 - suave(5, 7, tt));
    if (a <= 0) return;
    const tam = lerp(420, 470, suave(0, 7, tt));
    const tmp = this.agua.getContext('2d')!;
    tmp.clearRect(0, 0, 720, 720);
    pintar(tmp, 'retrato_josefina_lejos', 0, 0, 0, 720, 720);
    // el agua todavia tiembla un poco sobre su cara
    const amp = lerp(8, 0.5, suave(0, 4, tt));
    c.save();
    c.globalAlpha = a;
    c.beginPath(); c.ellipse(W / 2, H / 2, tam * 0.5, tam * 0.56, 0, 0, Math.PI * 2); c.clip();
    ondular(c, this.agua, W / 2 - tam / 2, H / 2 - tam / 2, tam, tam, this.t, amp, 0.05);
    const g = c.createRadialGradient(W / 2, H / 2, tam * 0.2, W / 2, H / 2, tam * 0.58);
    g.addColorStop(0, 'rgba(2,3,5,0)'); g.addColorStop(1, 'rgba(2,3,5,1)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.restore();
  }

  post(): Partial<EstadoPost> {
    let f = 0;
    for (let i = 1; i < TOMAS.length; i++) {
      if (i === 3) continue; // del agua a su cara: sin corte, se oscurece y aparece
      const d = this.ms - TOMAS[i];
      if (d > -600 && d < 600) f = Math.max(f, 1 - Math.abs(d) / 600);
    }
    if (this.ms < 900) f = Math.max(f, 1 - this.ms / 900);
    if (this.ms > TOMAS[4]) f = 1;
    return {
      fundido: f,
      // al oscurecerse el agua, la siesta se apaga con ella: al retrato se llega sin corte
      recuerdo: this.toma === 0 || this.toma === 3 ? 0 : this.toma === 2 ? 1 - suave(TOMAS[2] + 5500, TOMAS[2] + 9000, this.ms) : 1,
      miedo: this.toma === 3 ? 0.25 : 0.06,
    };
  }

  sonido() { return { miedo: 0, halo: 0, susurros: this.toma === 3 ? clamp((this.ms - TOMAS[3]) / 5000) * 0.35 : 0, latido: this.toma >= 3 ? 0.35 : 0 }; }
}
