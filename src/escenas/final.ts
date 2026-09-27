import { C, H, TIPO, W, clamp, hash, lerp, suave } from '../config';
import { cabeza, cuadroEn, hoja, pintar, pintarParte, silueta } from '../sprites/hojas';
import { bocaDelAljibe } from '../pozo';
import { NOTAS } from '../guiones';
import type { EstadoPost } from '../tres/motor';
import { partida, type Contexto, type Escena, type NombreEscena, type TipoFinal } from './escena';

/**
 * LOS FINALES — tres animaciones cortas, como el prologo.
 *
 *   AUDERE  grito. El papel se rasgo. Sobre el blanco queda su sombra con las
 *           cabezas que no eran suyas; una por una se desprenden y se van.
 *           El titulo se escribe con la tinta que sobra.
 *   NO PUDO quiso saltar y no pudo. Desde el piso: el aljibe, ella misma
 *           asomada arriba, y el barro que sube. Las letras se hunden.
 *   ANTES   le canto a ella misma. El agua con las dos caras; la grande se
 *           hunde, queda la nena. El agua se queda quieta, se vuelve foto, la
 *           foto se quema de blanco. El titulo, y su reflejo en el agua; queda
 *           solo el reflejo.
 */

const DUR: Record<TipoFinal, number> = { audere: 23, nopudo: 21, antes: 27 };
const FIGS = ['mariela', 'madre', 'abuela'] as const;
const CREDITOS = 'Mauro Scaffidi · Ivan Saldaña · Zoe Ullua · Joaquín Galasso · Mathilda Esteban';

export class Final implements Escena {
  siguiente: NombreEscena | null = null;
  encierro = 1;
  private t = 0;
  private tipo: TipoFinal = 'audere';
  private plano: 'A' | 'C' = 'A';
  private reconocidos: string[] = [];
  private papel = document.createElement('canvas');
  private agua = document.createElement('canvas');
  private texto = document.createElement('canvas');
  private foto = document.createElement('canvas');
  private disparados = new Set<string>();
  private x!: Contexto;

  constructor() {
    this.papel.width = W; this.papel.height = H;
    const c = this.papel.getContext('2d')!;
    c.fillStyle = '#efe9dc'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) {
      c.fillStyle = `rgba(90,70,40,${hash(i) * 0.06})`;
      c.fillRect(hash(i * 1.3) * W, hash(i * 2.7) * H, 1 + hash(i * 5) * 14, 1);
    }
    this.agua.width = this.agua.height = 720;
    this.texto.width = W; this.texto.height = 260;
    this.foto.width = W; this.foto.height = H;
  }

  alEntrar(x: Contexto) {
    this.x = x;
    this.siguiente = null;
    this.t = 0;
    this.disparados.clear();
    // para previsualizar: ?escena=final&final=nopudo&plano=C
    const q = new URLSearchParams(location.search);
    const f = partida.final ?? { tipo: (q.get('final') as TipoFinal) || 'audere', plano: (q.get('plano') as 'A' | 'C') || 'A' };
    if (!partida.final && !partida.reconocidos.length) partida.reconocidos = ['mariela', 'madre'];
    this.tipo = f.tipo;
    this.plano = f.plano;
    this.reconocidos = [...partida.reconocidos];
    x.son.apagarTodo(1.5);
    if (this.tipo === 'nopudo') { x.son.ambiente('silencio'); }
    if (this.tipo === 'antes') { x.son.ambiente('antes', 0.25, 6); }
  }

  /** Dispara algo una sola vez, cuando el reloj pasa por `seg`. */
  private una(clave: string, seg: number, fn: () => void) {
    if (this.t >= seg && !this.disparados.has(clave)) { this.disparados.add(clave); fn(); }
  }

  actualizar(dtMs: number, x: Contexto) {
    this.t += dtMs / 1000;
    const v = x.voz, s = x.son;
    if (this.tipo === 'audere') {
      FIGS.forEach((fig, i) => this.una(`cab${i}`, 4 + i * 2.2, () => {
        if (this.reconocidos.includes(fig)) s.campana(v.frecRelativa(NOTAS[fig]), 0.14);
        else s.gota(true);
      }));
      this.una('voz', 11.5, () => s.tonoFinal(v.frecRelativa(0), 0.08, 12));
    }
    if (this.tipo === 'nopudo') {
      s.capa('pantano', clamp(this.t / 6) * 0.8);
      for (let i = 0; i < 6; i++) this.una(`letra${i}`, 8 + i * 1.2, () => s.gota(true));
      this.una('fin', 16, () => s.capa('pantano', 0));
    }
    if (this.tipo === 'antes') {
      this.una('gota', 0.8, () => s.gota());
      this.una('foto', 8.5, () => s.campana(v.frecRelativa(12), 0.08));
      this.una('tono', 18, () => s.tonoFinal(v.frecRelativa(0), 0.07, 10));
    }
    const dur = DUR[this.tipo];
    if ((this.t > 13 && x.tec.alguna) || this.t > dur) this.siguiente = 'titulo';
  }

  dibujar(mundo: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    if (this.tipo === 'audere') this.audere(mundo, capa);
    else if (this.tipo === 'nopudo') this.noPudo(mundo, capa);
    else this.antes(mundo, capa);
  }

  // ------------------------------------------------------------ AUDERE

  private audere(c: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    const t = this.t;
    c.drawImage(this.papel, 0, 0);
    const prota = this.plano === 'A' ? 'josefina_quieta' : 'nina_quieta';
    const alto = this.plano === 'A' ? 470 : 360;
    const h = hoja(prota);
    const ancho = alto * (h.w / h.h);
    const cx = W / 2, piso = H * 0.86;
    const aclara = suave(11, 16, t);

    // la tinta que se corre en el papel, a sus pies
    c.save();
    c.fillStyle = `rgba(8,8,10,${0.5 * (1 - aclara * 0.7)})`;
    for (let i = 0; i < 14; i++) {
      const r = (18 + hash(i) * 40) * suave(0, 5, t);
      c.beginPath(); c.ellipse(cx + (hash(i * 3) - 0.5) * 160, piso - 4 + hash(i * 7) * 10, r * 1.6, r * 0.3, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();

    // su sombra, que se va aclarando
    c.save();
    c.globalAlpha = lerp(0.92, 0.28, aclara) * suave(0, 1.5, t);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
    silueta(c, prota, cuadroEn(prota, t * 0.5), cx - ancho / 2, piso - alto, ancho, alto);
    c.restore();

    // las tres cabezas que no eran suyas: se desprenden y se van
    const cabY = piso - alto * 0.86;
    FIGS.forEach((fig, i) => {
      const td = 4 + i * 2.2;
      const u = Math.max(0, t - td);
      const lado = i === 0 ? -1 : i === 1 ? 1 : 0.3;
      const x0 = cx + [-44, 46, 4][i], y0 = cabY + [18, 22, -26][i];
      const x = x0 + lado * u * 26 + Math.sin(u * 1.4 + i) * 10 * Math.min(1, u);
      const y = y0 - u * u * 9 - u * 22;
      const a = suave(0.5, 2, t) * (1 - suave(1.5, 5, u));
      if (a <= 0.01) return;
      c.save();
      c.globalAlpha = a;
      c.translate(x, y);
      c.rotate(lado * u * 0.3);
      if (this.reconocidos.includes(fig)) {
        // lo que le dieron: el espejito, la llave, el rosario, que se desprenden y se van
        const tam = 78;
        const obj = fig === 'mariela' ? 'objeto_espejo' : fig === 'madre' ? 'objeto_llave' : 'objeto_rosario';
        c.filter = 'brightness(0)';
        pintar(c, obj, 0, -tam / 2, -tam / 2, tam, tam);
        c.filter = 'none';
      } else {
        // una cabeza sin cara: humo
        c.fillStyle = '#060607';
        for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(Math.sin(k * 2.1 + t) * 9, Math.cos(k * 1.7 + t) * 9, 16, 0, Math.PI * 2); c.fill(); }
      }
      c.restore();
      // se deshace en gotas de tinta
      if (u > 0) {
        c.save();
        c.fillStyle = '#060607';
        for (let k = 0; k < 10; k++) {
          const s = (u * 0.6 + hash(k + i * 10)) % 1;
          c.globalAlpha = a * (1 - s) * 0.7;
          c.beginPath(); c.arc(x + (hash(k * 3 + i) - 0.5) * 60 * s, y + s * 90, 3 * (1 - s) + 1, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      }
    });

    // su voz: una onda calida alrededor, cuando queda sola
    if (aclara > 0.05) {
      c.save();
      c.strokeStyle = C.calida;
      for (let k = 0; k < 3; k++) {
        const f = ((t * 0.35) + k / 3) % 1;
        c.globalAlpha = aclara * (1 - f) * 0.6;
        c.lineWidth = 2;
        c.beginPath(); c.ellipse(cx, piso - alto * 0.55, 60 + f * 260, 80 + f * 300, 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }

    this.tituloEnTinta(capa, W / 2, H * 0.5, suave(14, 19, t), '#141210');
    creditos(capa, suave(18, 21, t) * 0.6, '#3a3128');
  }

  /** El titulo se escribe como tinta que se esparce en el papel. */
  private tituloEnTinta(c: CanvasRenderingContext2D, x: number, y: number, u: number, color: string) {
    if (u <= 0) return;
    const tx = this.texto.getContext('2d')!;
    tx.clearRect(0, 0, W, 260);
    // las manchas que crecen
    tx.fillStyle = '#000';
    for (let i = 0; i < 70; i++) {
      const r = clamp(u * 1.6 - hash(i * 5.1) * 0.6) * (26 + hash(i) * 40);
      if (r <= 0) continue;
      tx.beginPath(); tx.arc(W / 2 + (hash(i * 2.3) - 0.5) * 620, 130 + (hash(i * 3.9) - 0.5) * 120, r, 0, Math.PI * 2); tx.fill();
    }
    tx.globalCompositeOperation = 'source-in';
    tx.fillStyle = color;
    tx.font = `124px ${TIPO}`;
    tx.textAlign = 'center';
    tx.fillText('AUDERE', W / 2, 170);
    tx.globalCompositeOperation = 'source-over';
    c.drawImage(this.texto, x - W / 2, y - 150);
  }

  // ------------------------------------------------------------ NO PUDO

  private noPudo(c: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    const t = this.t;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05080d'); g.addColorStop(1, '#010203');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const nivel = lerp(H * 0.8, H * -0.05, suave(5, 19, t));

    // desde el piso: el aljibe enorme, y ella misma asomada arriba, mirando para abajo
    const idA = this.plano === 'A' ? 'aljibe_presente' : 'aljibe_recuerdo';
    const ha = hoja(idA);
    const aw = 560, ah = aw * (ha.h / ha.w);
    const ax = W / 2 - aw / 2, ay = H * 0.86 - ah;
    const idM = this.plano === 'A' ? 'nina_frente' : 'josefina_frente';
    const hm = hoja(idM);
    const mw = 300, mh = mw * (hm.h / hm.w);
    c.save();
    c.filter = 'brightness(0.6)';
    // la cabeza asomada por encima del borde
    c.save();
    c.beginPath(); c.rect(0, 0, W, ay + ah * 0.42); c.clip();
    pintar(c, idM, cuadroEn(idM, t), W / 2 - mw / 2 + Math.sin(t * 0.5) * 6, ay + ah * 0.42 - mh * 0.5 + Math.sin(t * 0.7) * 4, mw, mh);
    c.restore();
    pintar(c, idA, 0, ax, ay, aw, ah);
    c.restore();

    // las letras se hunden en el barro
    c.save();
    c.font = `112px ${TIPO}`;
    c.textAlign = 'center';
    const letras = 'AUDERE'.split('');
    const anchos = letras.map((l) => c.measureText(l).width + 6);
    let lx = W / 2 - anchos.reduce((a, b) => a + b, 0) / 2;
    const ondasLetras: { x: number; r: number }[] = [];
    letras.forEach((l, i) => {
      const ts = 6 + i * 1.2;
      const baja = Math.max(0, t - ts);
      const y = H * 0.17 + baja * baja * 8 + baja * 16;
      const aparece = suave(2.5, 4, t);
      c.save();
      c.beginPath(); c.rect(0, 0, W, nivel); c.clip();
      c.globalAlpha = aparece * 0.9;
      c.fillStyle = C.hueso;
      c.fillText(l, lx + anchos[i] / 2, y);
      c.restore();
      if (y > nivel - 40 && baja > 0) ondasLetras.push({ x: lx + anchos[i] / 2, r: (y - nivel + 40) * 0.8 });
      lx += anchos[i];
    });
    c.restore();

    // el barro
    c.fillStyle = '#030405';
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) c.lineTo(x, nivel + Math.sin(x * 0.02 + t * 1.3) * 4 + Math.sin(x * 0.05 - t) * 2);
    c.lineTo(W, H); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(140,160,180,0.3)'; c.lineWidth = 1.5;
    for (const o of ondasLetras) {
      c.globalAlpha = clamp(1 - o.r / 140);
      c.beginPath(); c.ellipse(o.x, nivel + 2, o.r, o.r * 0.12, 0, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
    creditos(capa, suave(17, 19.5, t) * 0.4, '#8a8f96');
  }

  // ------------------------------------------------------------ ANTES

  private antes(c: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    const t = this.t;
    // 1. el agua con las dos caras; la grande se hunde, queda la nena
    const a = this.agua.getContext('2d')!;
    a.clearRect(0, 0, 720, 720);
    pintar(a, 'pro_reflejo', t < 8 ? cuadroEn('pro_reflejo', t) : 0, 0, 0, 720, 720);
    const hunde = suave(1.5, 7.5, t);
    if (hunde < 1) {
      const cab = cabeza('josefina_frente');
      const w = lerp(260, 140, hunde), h = w * (cab.h / Math.max(1, cab.w));
      a.save();
      a.globalAlpha = (1 - hunde) * 0.75;
      a.filter = 'grayscale(1) brightness(0.8)';
      pintarParte(a, 'josefina_frente', 0, cab.x, cab.y, cab.w, cab.h, 540 - w / 2, 300 - h / 2 + hunde * 90, w, h);
      a.restore();
    }
    // 2. la boca del aljibe desde arriba; despues se queda quieta y se vuelve una foto vieja
    const fc = this.foto.getContext('2d')!;
    const r = H * 0.44;
    fc.save(); fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, W, H); fc.restore();
    bocaDelAljibe(fc, W / 2, H / 2, r, (k) => ondular(k, this.agua, W / 2 - r, H / 2 - r, r * 2, r * 2, t, lerp(10, 0, suave(3, 10, t)), 0.045), { recuerdo: true, t });
    const foto = suave(8, 12, t);
    const quema = suave(13.5, 18.5, t);
    c.fillStyle = '#e8dcc2'; c.fillRect(0, 0, W, H);
    const k = lerp(1, 0.62, foto);
    c.save();
    c.translate(W / 2, H / 2 + foto * 10);
    c.rotate(-0.04 * foto);
    if (foto > 0) {
      c.fillStyle = '#f6efdf';
      c.shadowColor = 'rgba(40,25,10,0.5)'; c.shadowBlur = 30 * foto;
      c.globalAlpha = foto;
      c.fillRect(-W * k / 2 - 24, -H * k / 2 - 24, W * k + 48, H * k + 72);
      c.shadowBlur = 0; c.globalAlpha = 1;
    }
    c.drawImage(this.foto, -W * k / 2, -H * k / 2, W * k, H * k);
    c.restore();
    // 3. la foto se quema de blanco desde el centro
    if (quema > 0) {
      const r = quema * W * 0.8;
      const g = c.createRadialGradient(W / 2, H / 2, r * 0.8, W / 2, H / 2, r * 1.02 + 1);
      g.addColorStop(0, '#fbf7ee'); g.addColorStop(0.9, 'rgba(160,110,50,0.8)'); g.addColorStop(1, 'rgba(60,35,10,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(W / 2, H / 2, r * 1.02 + 1, 0, Math.PI * 2); c.fill();
    }
    // 4. el titulo y su reflejo en el agua; queda solo el reflejo
    const titulo = suave(18, 20, t);
    if (titulo > 0) {
      const y = H * 0.46;
      c.save();
      c.strokeStyle = `rgba(60,40,20,${0.3 * titulo})`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(W * 0.2, y + 14); c.lineTo(W * 0.8, y + 14); c.stroke();
      c.restore();
      const tx = this.texto.getContext('2d')!;
      tx.clearRect(0, 0, W, 260);
      tx.fillStyle = '#3b2a18';
      tx.font = `110px ${TIPO}`;
      tx.textAlign = 'center';
      tx.textBaseline = 'alphabetic';
      tx.fillText('AUDERE', W / 2, 200);
      // arriba: el titulo, que se va
      c.save();
      c.globalAlpha = titulo * (1 - suave(21.5, 24, t));
      c.drawImage(this.texto, 0, y - 200 + 10);
      c.restore();
      // abajo: su reflejo, dado vuelta y temblando en el agua
      c.save();
      c.globalAlpha = titulo * 0.55;
      c.translate(0, y + 18);
      c.scale(1, -0.8);
      ondular(c, this.texto, 0, -200, W, 200, t * 1.2, 4, 0.18);
      c.restore();
    }
    creditos(capa, suave(20, 23, t) * 0.6, '#5a4430');
  }

  post(): Partial<EstadoPost> {
    const t = this.t, dur = DUR[this.tipo];
    let fundido = clamp((t - (dur - 1.5)) / 1.5);
    let flash = 0;
    if (this.tipo === 'audere' || this.tipo === 'antes') flash = 1 - suave(0, 1.6, t);
    if (this.tipo === 'nopudo') fundido = Math.max(fundido, 1 - clamp(t / 1.4));
    return {
      fundido,
      flash,
      recuerdo: this.tipo === 'antes' ? lerp(0.4, 1, suave(6, 12, t)) : this.tipo === 'audere' ? 0.45 : 0,
      miedo: this.tipo === 'nopudo' ? 0.45 : 0.04,
      pantano: 0,
    };
  }

  sonido() {
    return {
      miedo: this.tipo === 'nopudo' ? 0.5 : 0,
      halo: 0,
      susurros: this.tipo === 'nopudo' ? clamp(0.5 - this.t / 30) : 0,
      latido: this.tipo === 'nopudo' ? clamp(0.8 - this.t / 18) : 0,
    };
  }
}

/** Dibuja una imagen fila por fila, cada fila corrida: el temblor del agua. */
function ondular(c: CanvasRenderingContext2D, src: HTMLCanvasElement | OffscreenCanvas & { width: number; height: number }, dx: number, dy: number, dw: number, dh: number, t: number, amp: number, frec: number) {
  if (amp < 0.2) { c.drawImage(src, dx, dy, dw, dh); return; }
  const filas = 120;
  const sh = src.height / filas, h = dh / filas;
  for (let i = 0; i < filas; i++) {
    const off = Math.sin(i * frec * 6 + t * 3) * amp + Math.sin(i * frec * 17 - t * 5) * amp * 0.3;
    c.drawImage(src, 0, i * sh, src.width, sh + 0.5, dx + off, dy + i * h, dw, h + 0.6);
  }
}

function creditos(c: CanvasRenderingContext2D, a: number, color: string) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha = a;
  c.fillStyle = color;
  c.font = `13px ${TIPO}`;
  c.textAlign = 'center';
  c.fillText(CREDITOS, W / 2, H - 40);
  c.restore();
}
