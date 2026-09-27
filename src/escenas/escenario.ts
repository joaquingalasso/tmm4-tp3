import * as THREE from 'three';
import { C, H, RGB, TIPO, W, clamp, hacia, hash, lerp, rc, suave } from '../config';
import { glifoFlecha, glifoTarareo } from '../arte';
import { Dialogo, type Guion, type Salida } from '../dialogo';
import {
  ABUELA_AHORA, FRASE, MADRE_AHORA, MARIELA_AHORA, MELODIAS, abuelaAntes, madreAntes, marielaAntes, misma, senora,
} from '../guiones';
import { glifoOnda } from '../ondas';
import { Frase } from '../frase';
import { TELON, porId } from '../sprites/catalogo';
import { cabeza, cuadroEn, hoja, pintar } from '../sprites/hojas';
import { Carta, GLOBAL, type OpcCarta } from '../tres/carta';
import type { EstadoPost } from '../tres/motor';
import { Aura, partida, type Contexto, type Escena, type NombreEscena } from './escena';

/**
 * EL ESCENARIO — un teatro de papel con dos telones y una bisagra.
 *
 *   A  AHORA    de frente al escenario. La casa de noche. Josefina, joven, tiene
 *               miedo; ellas estan tranquilas, pero le tienen miedo a ella: si se
 *               acerca temblando, retroceden y se vuelven monstruos.
 *               Si no tararea, todo se empantana y la persiguen sus miedos.
 *   B  DE FRENTE la camara entra en sus ojos. Lo que tiene enfrente, y nada mas:
 *               el resto se hunde en lo oscuro. Aca, y solo aca, hay palabras.
 *   C  ANTES    del otro lado del escenario: el recuerdo, una siesta sepia. La
 *               nena no tiene miedo; ellas si, y su miedo es una sombra enorme en
 *               un biombo. Cantarles la cancion de cuna las calma... y la sombra
 *               se le escurre a la nena.
 *
 * La cancion es una sola: calma, y por ella pasa lo que pesa. En el presente la
 * sostiene; en el recuerdo la condena. Cada miedo que acepta en el recuerdo le
 * pone cara a una de las sombras que la persiguen en el presente: la de quien
 * se lo dio. La que ella creia suya.
 *
 * No se puede ir de A a C sin pasar por B. En el presente cierran el paso
 * cortinas de tinta; en el recuerdo, huecos blancos (lo que no se recuerda).
 * Al final, el camino al aljibe es en primera persona, lento; y del otro lado
 * del agua esta ella misma.
 */

const D = 700;
const FZ = 900;
const ALTO_CAM = 250;
const ADELANTE = 150;
const FOV_LADO = 2 * Math.atan(360 / D) * 180 / Math.PI;
const PARADA_A = 250;
const PARADA_C = 200;
const PROF = 620;

// escalas: unidades del mundo por pixel de cada hoja
const SP = 0.6;
const SF = 0.44;
const SO = 0.5;
const PW = 260 * SP, PH = 340 * SP;
const FW = 420 * SF, FH = 480 * SF;
const MW = 360 * 0.5, MH = 360 * 0.5;

/** Donde queda cada cosa. */
const X = {
  inicio: 170, velador: 440,
  marielaP: 1150, cortina1: 1500,
  marielaN: 1950, hueco1: 2350,
  piano: 2250, cortinaPiano: 2560, tele: 2840,
  madreP: 3000, cortina2: 3350,
  madreJ: 3800, hueco2: 4200,
  lampara: 4430, abuelaP: 4580, cortina3: 4900,
  abuelaR: 5300, hueco3: 5650,
  puerta: 5350, altar: 5700, senora: 5860, tapia: 6010,
  aljibe: 6560, misma: 6700,
};
const CORTINAS = [X.cortina1, X.cortina2, X.cortina3];
const HUECOS = [X.hueco1, X.hueco2, X.hueco3];
/**
 * Las luces son los refugios. Empiezan apagadas: se encienden tarareandoles
 * cerca (la tele, resolviendo el piano). Una luz encendida calma, los miedos
 * no entran en ella, y es adonde se vuelve cuando la alcanzan.
 */
interface Lampara { x: number; z: number; sprite: 'velador' | 'vela' | 'tele'; alto: number; nota: number; encendida: boolean; frase: Frase; carta?: Carta; }
const LAMPARAS_BASE: Omit<Lampara, 'encendida' | 'frase'>[] = [
  { x: X.velador, z: -70, sprite: 'velador', alto: 120, nota: 0 },
  { x: 1030, z: -70, sprite: 'velador', alto: 120, nota: 0 },
  { x: 1830, z: -60, sprite: 'vela', alto: 60, nota: 3 },
  { x: X.tele, z: -90, sprite: 'tele', alto: 110, nota: 0 },
  { x: 3680, z: -70, sprite: 'velador', alto: 120, nota: -4 },
  { x: X.lampara, z: -70, sprite: 'velador', alto: 120, nota: 5 },
  { x: 5170, z: -60, sprite: 'vela', alto: 60, nota: 3 },
  { x: 5620, z: -60, sprite: 'vela', alto: 60, nota: 0 },
];
/** Lo que Josefina piensa, como subtitulo: pocas veces, para orientar. */
const PIENSA: Record<string, string> = {
  despierta: 'Otra vez. Algo se mueve en lo oscuro.',
  cantar: 'Si tarareo bajito, se va.',
  salir: 'Tengo que salir de esta casa. Llegar al fondo, donde está el agua.',
  luz: 'Si le canto a la luz, se prende.',
  barricada: 'Yo misma trabé esa puerta. Por acá no.',
  recuerdo: 'Esa siesta. Yo no le tenía miedo a nada.',
  pared: 'No me acuerdo qué había del otro lado.',
  piano: 'El piano. Alguien toca la canción de la abuela.',
  pesa: 'Pesa.',
  rebobina: 'Otra vez desde la luz.',
  afuera: 'Afuera es peor.',
  aljibe: 'Ahí está. El agua.',
  ellas: 'Vienen conmigo.',
  callar: 'Esta vez no canto.',
  otra: 'No. Callada.',
};
const TORMENTA = [X.cortina2, X.cortina3];

type Plano = 'A' | 'C';
type IdFig = 'mariela' | 'madre' | 'abuela';
const FIGS: IdFig[] = ['mariela', 'madre', 'abuela'];
const EN_AHORA: Record<IdFig, number> = { mariela: X.marielaP, madre: X.madreP, abuela: X.abuelaP };
const EN_RECUERDO: Record<IdFig, number> = { mariela: X.marielaN, madre: X.madreJ, abuela: X.abuelaR };
const SPRITE_RECUERDO: Record<IdFig, string> = { mariela: 'mariela_nina', madre: 'madre_joven', abuela: 'abuela_joven' };
/** Lo que cada una le da: el objeto que la condena, y el ancla de cada cruce de plano. */
const OBJETO: Record<IdFig, string> = { mariela: 'objeto_espejo', madre: 'objeto_llave', abuela: 'objeto_rosario' };
const DUR_ANCLA: Record<IdFig, number> = { mariela: 6.2, madre: 7.4, abuela: 3.8 };
/** en que momento de cada animacion la camara sale al costado (el giro de plano) */
const CURVA_ANCLA: Record<IdFig, (u: number) => number> = {
  mariela: (u) => easeIO(clamp((u - 0.74) / 0.26)),
  madre: (u) => easeIO(clamp((u - 0.76) / 0.24)),
  abuela: (u) => easeIO(clamp((u - 0.56) / 0.24)),
};
function easeIO(u: number) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

type Fase = 'despertar' | 'llamado' | 'libre' | 'girando' | 'dialogo' | 'ahogo'
  | 'umbral' | 'encuentro' | 'final' | 'callar' | 'desgarro' | 'caida' | 'hundir';

interface Bisagra { id: string; x: () => number; plano: Plano; fig?: IdFig; mira: number; parada: number; guion: () => Guion | null; }
interface Pariente { id: IdFig; offset: number; oscuro: number; }
interface Perseguidor { carta: Carta; activo: boolean; x: number; vx: number; vis: number; slot: number; }
interface Traspaso { fig: IdFig; t: number; primera: boolean; }
interface Mota { x: number; y: number; v: number; r: number; }
/**
 * Una pared de verdad, armada con planos: dos caras, el canto, el dintel y la
 * hoja de la puerta. En tercera persona se ve cortada, como en una casa de
 * munecas: solo el tramo del fondo. En primera persona se completa el tramo de
 * adelante y tapa toda la vista: no se ve mas alla de la pared.
 */
interface Pared { x: number; plano: Plano; frente: Carta[]; bisagra: THREE.Group; abierta: number; abre: () => boolean; forzada?: boolean; muebles?: Carta; }

export class Escenario implements Escena {
  siguiente: NombreEscena | null = null;
  encierro = 1;
  escena = new THREE.Scene();
  camara = new THREE.PerspectiveCamera(FOV_LADO, W / H, 4, 12000);

  private t = 0;
  private fase: Fase = 'despertar';
  private msFase = 0;
  private gx = X.inicio;
  private dir = 1;
  private caminando = false;
  private movido = false;
  private phi = 0;
  private giro: { desde: number; hasta: number; t: number; dur: number; luego: () => void; curva?: (u: number) => number } | null = null;
  private gxAnimado: { desde: number; hasta: number } | null = null;
  private lado: Plano = 'A';
  private visto: Plano = 'A';
  private pesoA = 1;
  private bisagra: Bisagra | null = null;
  private dialogo = new Dialogo();
  private aura = new Aura();
  /** 1 = tranquila; 0 = el pantano la tapa */
  cordura = 1;
  private hecho: Record<IdFig, boolean> = { mariela: false, madre: false, abuela: false };
  private parientes = {} as Record<IdFig, Pariente>;
  private perseguidores: Perseguidor[] = [];
  private msSpawn = 0;
  private refugio = X.inicio;
  private lamparas: Lampara[] = LAMPARAS_BASE.map((l) => ({ ...l, encendida: false, frase: new Frase([l.nota]) }));
  private pianoFrase = new Frase(FRASE);
  private pensado = new Set<string>();
  private pensamientos: { texto: string; t: number }[] = [];
  private cantan: { t: number; f: number; vol: number }[] = [];
  private msCanto = { mariela: 2000, madre: 2000, abuela: 2000 } as Record<IdFig, number>;
  private puertaAbierta = false;
  /** 0..1: cuanto aguanto callada al final */
  private silencio = 0;
  private paredes: Pared[] = [];
  private mueblesBarricada: Carta[] = [];
  private fachadas: { carta: Carta; desde: number; plano: Plano; revelada: number; abre: () => boolean }[] = [];
  private companeras: Carta[] = [];
  private cPorton!: Carta;
  private traspasos: Traspaso[] = [];
  private piano = { resuelto: false };
  private relampago = 0;
  private msRelampago = 3000;
  private conSenora = false;
  private planoFinal: Plano = 'A';
  private rebobinado: { desde: number; hasta: number; t: number; dur: number; etapa: 'entra' | 'vuelta' | 'arrastre' | 'salida' } | null = null;
  /** giro extra de la camara: al rebobinar, mira hacia atras (hacia donde la arrastran) */
  private vuelta = 0;
  /** el cruce de plano con el objeto de una de ellas como ancla */
  private ancla: { fig: IdFig; t: number; dur: number; nuevo: Plano; puerta?: number; desde?: number; pared?: Pared } | null = null;
  private msInvita = 2500;
  private msQuieta = 0;
  private msPaso = 0;
  private fasePaso = 0;
  private pitch = 0;
  private flash = 0;
  private embestida = -1;
  private hayMic = true;
  private tarareo = 0;
  private ladoSonido: Plano | 'patio' = 'A';
  private motas: Mota[] = [];
  private x!: Contexto;

  private cartas: Carta[] = [];
  private haloCanvas = document.createElement('canvas');
  private haloTex!: THREE.CanvasTexture;
  private haloMat!: THREE.MeshBasicMaterial;
  private haloMesh!: THREE.Mesh;
  private cProta!: Carta;
  private cSombraA!: Carta;
  private cSombraC!: Carta;
  private cPiso!: Carta;
  private bordes: Carta[] = [];
  private biombos: Carta[] = [];
  private cFigA = {} as Record<IdFig | 'senora', Carta>;
  private cFigC = {} as Record<IdFig, Carta>;
  private cMismaA!: Carta;
  private cMismaC!: Carta;
  private cTelonA!: Carta;
  private cCielo!: Carta;
  private bisagras: Bisagra[] = [];

  constructor() {
    this.escena.background = new THREE.Color(0x020306);
    this.camara.rotation.order = 'YXZ';
    for (let i = 0; i < 40; i++) this.motas.push({ x: Math.random() * W, y: Math.random() * H, v: 4 + Math.random() * 10, r: 0.6 + Math.random() * 1.6 });
    this.construir();
  }

  // ------------------------------------------------------------------ construccion

  private agregar(c: Carta) { this.cartas.push(c); this.escena.add(c.mesh); return c; }

  /** Un recorte hecho con una hoja del catalogo, parado en el escenario, siempre de frente a la camara. */
  private objeto(id: string, x: number, z: number, plano: Plano, o: Partial<OpcCarta> = {}, escala = SO) {
    const h = hoja(id);
    const w = h.w * escala, alto = h.h * escala;
    const anim = h.cuadros > 1 && h.fps > 0;
    const recuerdo = plano === 'C';
    // todo mira siempre a la camara (billboard): en primera persona nada se ve de canto
    return this.agregar(new Carta({
      w, h: alto, res: 1.3, x, z, plano, billboard: true,
      propia: recuerdo ? 0.95 : 0,
      lavado: recuerdo ? 0.4 : 0,
      animada: anim,
      clave: anim ? () => cuadroEn(id, this.t) : undefined,
      dibujar: (c) => pintar(c, id, anim ? cuadroEn(id, this.t) : 0, 0, 0, w, alto),
      ...o,
    }));
  }

  private construir() {
    // los dos telones
    this.cTelonA = this.agregar(new Carta({ w: TELON.ancho, h: TELON.alto, res: 0.4, x: TELON.cx, y: TELON.base, z: -FZ, plano: 'A', orden: -10, propia: 0.5,
      dibujar: (c) => pintar(c, 'telon_presente', 0, 0, 0, TELON.ancho, TELON.alto) }));
    this.agregar(new Carta({ w: TELON.ancho, h: TELON.alto, res: 0.4, x: TELON.cx, y: TELON.base, z: FZ, rotY: Math.PI, plano: 'C', orden: -10, propia: 1, lavado: 0.12,
      dibujar: (c) => pintar(c, 'telon_recuerdo', 0, 0, 0, TELON.ancho, TELON.alto) }));

    // el tablon: madera oscura de noche, clara en la siesta
    const largo = 7800, cx = 3300;
    const paso = () => Math.round((1 - this.pesoA) * 8) / 8;
    this.cPiso = this.agregar(new Carta({ w: largo, h: PROF, res: 0.4, x: cx, y: 0, z: 0, acostada: true, opaca: true, propia: 0.1, animada: true, clave: paso,
      dibujar: (c) => {
        const r = paso();
        c.fillStyle = mezclaColor('#1a1714', '#b39873', r); c.fillRect(0, 0, largo, PROF);
        c.strokeStyle = r > 0.5 ? 'rgba(90,66,40,0.25)' : 'rgba(214,200,180,0.1)'; c.lineWidth = 2;
        for (let y = 0; y < PROF; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(largo, y); c.stroke(); }
        for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${0.35 - r * 0.2})`; c.fillRect(hash(i) * largo, Math.floor(hash(i + 2) * (PROF / 40)) * 40, 2, 40); }
      } }));
    for (const z of [PROF / 2, -PROF / 2]) {
      this.bordes.push(this.agregar(new Carta({ w: largo, h: 34, res: 0.4, x: cx, y: -34, z, rotY: z > 0 ? 0 : Math.PI, opaca: true, propia: 0.08, animada: true, clave: paso,
        dibujar: (c) => {
          c.fillStyle = mezclaColor('#0d0c0b', '#6e5638', paso()); c.fillRect(0, 0, largo, 34);
          c.fillStyle = 'rgba(214,200,180,0.14)'; c.fillRect(0, 0, largo, 2);
        } })));
    }

    // AHORA: la casa de noche y, al salir, el patio abandonado
    // el fondo del cuarto: trastos apilados (no se puede ir mas atras)
    this.objeto('trastos', -10, -30, 'A', { propia: 0.3 });
    this.objeto('cama', 300, -80, 'A');
    this.objeto('piano', X.piano, -90, 'A');
    // las luces: apagadas hasta que ella les canta
    for (const l of this.lamparas) {
      const h = hoja(l.sprite); const w = h.w * SO, a = h.h * SO;
      l.carta = this.objeto(l.sprite, l.x, l.z, 'A', {
        clave: () => (l.encendida ? cuadroEn(l.sprite, this.t) : -1 - Math.round(l.frase.progresoNota * 5)),
        dibujar: (c) => {
          if (l.encendida) { pintar(c, l.sprite, cuadroEn(l.sprite, this.t), 0, 0, w, a); return; }
          c.filter = `brightness(${0.22 + l.frase.progresoNota * 0.5})`;
          pintar(c, l.sprite, 0, 0, 0, w, a);
          c.filter = 'none';
        },
      });
    }

    this.objeto('altar_presente', X.altar, -250, 'A');
    // la ruda del patio, alta, a los dos lados del camino al aljibe
    for (let i = 0; i < 16; i++) {
      const x = 5480 + i * 70 + hash(i) * 30, z = (i % 2 ? -1 : 1) * (110 + hash(i + 7) * 150);
      this.objeto('planta_presente', x, z, 'A', { billboard: true, vaiven: 0.03 }, 0.5 + hash(i) * 0.25);
    }
    this.objeto('aljibe_presente', X.aljibe, 0, 'A', { billboard: true });
    // el porton del fondo del patio: se abre despues de hablar con la Senora
    this.cPorton = this.objeto('porton', X.tapia, 0, 'A', {
      propia: 0.3,
      clave: () => (this.conSenora ? 1 : 0),
      dibujar: (c) => { const h = hoja('porton'); pintar(c, 'porton', this.conSenora ? 1 : 0, 0, 0, h.w * SO, h.h * SO); },
    });

    // ANTES: la casa de los tios, la vereda, el patio de la Senora
    this.objeto('ropero', -10, 30, 'C');
    this.objeto('ventilador', 520, 90, 'C');
    this.objeto('mesa_mandarinas', 1250, 110, 'C');
    this.objeto('banqueta', 1450, 80, 'C');
    for (const [x, z] of [[2650, 170], [3150, 200], [4400, 210], [4700, 170]]) this.objeto('planta_recuerdo', x, z, 'C');
    this.objeto('sillon', 5050, 90, 'C');
    this.objeto('altar_recuerdo', 5500, 260, 'C');
    for (let i = 0; i < 16; i++) {
      const x = 5480 + i * 70 + hash(i + 3) * 30, z = (i % 2 ? -1 : 1) * (110 + hash(i + 11) * 150);
      this.objeto('planta_recuerdo', x, z, 'C', { billboard: true, vaiven: 0.03 }, 0.5 + hash(i + 1) * 0.25);
    }
    this.objeto('aljibe_recuerdo', X.aljibe, 0, 'C', { billboard: true });

    // al fondo del camino al aljibe: un cielo de papel con una luna (o, en el recuerdo, el sol de la siesta)
    this.cCielo = this.agregar(new Carta({ w: 3200, h: 1800, res: 0.25, x: 8300, y: -300, z: 0, billboard: true, propia: 1, orden: -9,
      clave: () => (this.planoFinal === 'A' ? 0 : 1),
      dibujar: (c) => {
        const rec = this.planoFinal === 'C';
        const g = c.createLinearGradient(0, 0, 0, 1800);
        if (rec) { g.addColorStop(0, '#f3e6c6'); g.addColorStop(1, '#d9bf8e'); }
        else { g.addColorStop(0, '#05070c'); g.addColorStop(0.7, '#162232'); g.addColorStop(1, '#0a0f16'); }
        c.fillStyle = g; c.fillRect(0, 0, 3200, 1800);
        // la luna / el sol, recortados en papel
        c.fillStyle = rec ? '#fffaf0' : '#d8dfe4';
        c.beginPath(); c.arc(1600, 620, 190, 0, Math.PI * 2); c.fill();
        c.strokeStyle = rec ? 'rgba(120,90,50,0.3)' : 'rgba(0,0,0,0.25)'; c.lineWidth = 6; c.stroke();
        if (!rec) { c.fillStyle = 'rgba(40,50,60,0.18)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(1600 + (hash(i) - 0.5) * 260, 620 + (hash(i + 3) - 0.5) * 260, 14 + hash(i + 5) * 30, 0, Math.PI * 2); c.fill(); } }
        // el hilo del que cuelga, como en un teatro
        c.strokeStyle = rec ? 'rgba(90,70,40,0.5)' : 'rgba(200,210,220,0.25)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(1600, 0); c.lineTo(1600, 430); c.stroke();
      } }));
    this.cCielo.visible = 0;

    // biombos: la sombra enorme del miedo de cada una, en el recuerdo
    for (const id of FIGS) {
      this.biombos.push(this.objeto('biombo', EN_RECUERDO[id] + 20, 260, 'C', {
        billboard: false, rotY: Math.PI, orden: -5,
        clave: () => (this.hecho[id] ? -1 : cuadroEn('biombo', this.t)),
        dibujar: (c) => (this.hecho[id] ? pintar(c, 'biombo_vacio', 0, 0, 0, 520, 560) : pintar(c, 'biombo', cuadroEn('biombo', this.t), 0, 0, 520, 560)),
      }, 1));
    }

    // ellas, hoy: tranquilas, pero le tienen miedo. Si se acerca temblando, se vuelven monstruos.
    for (const id of [...FIGS, 'senora'] as const) {
      if (id !== 'senora') this.parientes[id] = { id, offset: 0, oscuro: 0 };
      const osc = () => (id === 'senora' ? 0 : this.parientes[id].oscuro);
      this.cFigA[id] = this.agregar(new Carta({
        w: FW, h: FH, res: 1.5, x: id === 'senora' ? X.senora : EN_AHORA[id], z: -12, billboard: true, plano: 'A', animada: true, vaiven: 0.012, propia: 0.22,
        clave: () => Math.round(osc() * 8) * 100 + cuadroEn(id, this.t) * 10 + (porId.has(`${id}_oscura`) ? cuadroEn(`${id}_oscura`, this.t) : 0),
        dibujar: (c, lado) => {
          const o = osc();
          const base = lado === 0 ? `${id}_frente` : id;
          const oscura = lado === 0 ? `${id}_oscura_frente` : `${id}_oscura`;
          if (o < 0.98) { c.globalAlpha = 1 - o; pintar(c, base, cuadroEn(base, this.t), 0, 0, FW, FH, lado < 0); }
          if (o > 0.02 && porId.has(oscura)) {
            c.globalAlpha = o;
            c.shadowColor = 'rgba(150,178,205,0.7)'; c.shadowBlur = 12;
            pintar(c, oscura, cuadroEn(oscura, this.t), 0, 0, FW, FH, lado < 0);
            c.shadowBlur = 0;
          }
          c.globalAlpha = 1;
        },
      }));
    }

    // ellas, antes: asustadas
    for (const id of FIGS) {
      const spr = SPRITE_RECUERDO[id];
      const calma = () => this.hecho[id];
      this.cFigC[id] = this.agregar(new Carta({
        w: FW, h: FH, res: 1.5, x: EN_RECUERDO[id], z: 12, billboard: true, plano: 'C', animada: true, vaiven: 0.02,
        propia: 0.95, lavado: 0.3,
        clave: () => (calma() ? 0 : cuadroEn(spr, this.t)),
        dibujar: (c, lado) => {
          const cuadro = calma() ? 0 : cuadroEn(spr, this.t);
          if (lado === 0) pintar(c, `${spr}_frente`, cuadro, 0, 0, FW, FH);
          else pintar(c, spr, cuadro, 0, 0, FW, FH, lado < 0);
        },
      }));
    }

    // lo que cierra el paso: paredes de verdad (ver construirParedes); en el presente, con sus
    // puertas tapadas de muebles: se encerro ella misma
    this.mueblesBarricada = CORTINAS.map((x) => this.objeto('barricada', x - 70, 20, 'A', { propia: 0.22 }, 0.55));

    // ella misma, del otro lado del aljibe (solo al final)
    this.cMismaA = this.agregar(new Carta({ w: FW, h: FH, res: 1.5, x: X.misma, z: 0, billboard: true, plano: 'A', animada: true, vaiven: 0.01,
      clave: () => cuadroEn('nina_frente', this.t), dibujar: (c) => pintar(c, 'nina_frente', cuadroEn('nina_frente', this.t), 0, 0, FW, FH) }));
    this.cMismaC = this.agregar(new Carta({ w: FW, h: FH, res: 1.5, x: X.misma, z: 0, billboard: true, plano: 'C', animada: true, vaiven: 0.01, propia: 0.95, lavado: 0.2,
      clave: () => cuadroEn('josefina_frente', this.t), dibujar: (c) => pintar(c, 'josefina_frente', cuadroEn('josefina_frente', this.t), 0, 0, FW, FH) }));
    this.cMismaA.visible = this.cMismaC.visible = 0;

    // lo que la persigue
    for (let i = 0; i < 3; i++) {
      const p: Perseguidor = { carta: null as unknown as Carta, activo: false, x: 0, vx: 0, vis: 0, slot: i };
      p.carta = this.agregar(new Carta({ w: MW, h: MH, res: 1.2, x: 0, z: 40 + i * 12, billboard: true, plano: 'A', animada: true, orden: 6,
        clave: () => cuadroEn(this.tipoPerseguidor(i), this.t) * 2 + (p.vx > 0 ? 1 : 0),
        dibujar: (c) => {
          const id = this.tipoPerseguidor(i);
          // un contorno frio, para que se recorte contra lo oscuro
          c.shadowColor = 'rgba(150,178,205,0.75)'; c.shadowBlur = 14;
          pintar(c, id, cuadroEn(id, this.t), 0, 0, MW, MH, p.vx > 0);
          c.shadowBlur = 0;
        } }));
      p.carta.visible = 0;
      this.perseguidores.push(p);
    }

    // su sombra: en el presente, contra la pared, con las cabezas de las que le dieron su miedo
    const SWD = PW * 2.8, SHD = PH * 1.5;
    this.cSombraA = this.agregar(new Carta({ w: SWD, h: SHD, res: 1, x: this.gx, z: -45, plano: 'A', animada: true, orden: -3,
      dibujar: (c) => this.dibujarSombra(c, SWD, SHD, false) }));
    this.cSombraC = this.agregar(new Carta({ w: SWD, h: SHD, res: 1, x: this.gx, z: 45, rotY: Math.PI, plano: 'C', animada: true, propia: 0.95, orden: -3,
      dibujar: (c) => this.dibujarSombra(c, SWD, SHD, true) }));

    // en el camino final, lo que le dieron (el espejito, la llave, el rosario) flota a su lado
    FIGS.forEach((fig, i) => {
      const tam = 110;
      const carta = this.agregar(new Carta({ w: tam, h: tam, res: 1.4, x: 0, y: 0, z: 0, billboard: true, animada: true, propia: 0.3,
        clave: () => (this.pesoA < 0.5 ? 1 : 0),
        dibujar: (c) => {
          // negro, con un borde de luz (fria en el presente, calida en el recuerdo)
          c.filter = `brightness(0) drop-shadow(0 0 7px ${this.pesoA < 0.5 ? 'rgba(255,236,190,0.95)' : 'rgba(170,196,222,0.95)'})`;
          pintar(c, OBJETO[fig], 0, tam * 0.1, tam * 0.1, tam * 0.8, tam * 0.8);
          c.filter = 'none';
        } }));
      carta.visible = 0;
      this.companeras[i] = carta;
    });

    // la protagonista
    this.cProta = this.agregar(new Carta({ w: PW, h: PH, res: 2, x: this.gx, z: 0, billboard: true, animada: true, orden: 5, vaiven: 0.01,
      dibujar: (c, lado) => { if (lado !== 0) { const s = this.spriteProta(); pintar(c, s.id, s.cuadro, 0, 0, PW, PH, s.espejo); } } }));

    // el halo visible de la voz
    this.haloCanvas.width = this.haloCanvas.height = 256;
    this.haloTex = new THREE.CanvasTexture(this.haloCanvas);
    this.haloMat = new THREE.MeshBasicMaterial({ map: this.haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), this.haloMat);
    this.haloMesh.renderOrder = 10;
    this.escena.add(this.haloMesh);

    this.construirParedes();

    const xA = (id: IdFig) => () => EN_AHORA[id] + this.parientes[id].offset;
    this.bisagras = [
      { id: 'marielaP', x: xA('mariela'), plano: 'A', fig: 'mariela', mira: 168, parada: PARADA_A, guion: () => MARIELA_AHORA },
      { id: 'marielaN', x: () => X.marielaN, plano: 'C', fig: 'mariela', mira: 74, parada: PARADA_C, guion: () => marielaAntes(this.hecho.mariela) },
      { id: 'madreP', x: xA('madre'), plano: 'A', fig: 'madre', mira: 176, parada: PARADA_A, guion: () => MADRE_AHORA },
      { id: 'madreJ', x: () => X.madreJ, plano: 'C', fig: 'madre', mira: 176, parada: PARADA_C, guion: () => madreAntes(this.hecho.madre) },
      { id: 'abuelaP', x: xA('abuela'), plano: 'A', fig: 'abuela', mira: 124, parada: PARADA_A, guion: () => ABUELA_AHORA },
      { id: 'abuelaR', x: () => X.abuelaR, plano: 'C', fig: 'abuela', mira: 118, parada: PARADA_C, guion: () => abuelaAntes(this.hecho.abuela) },
      { id: 'senora', x: () => X.senora, plano: 'A', mira: 158, parada: PARADA_A, guion: () => senora(partida.carga) },
    ];
  }

  private construirParedes() {
    const T = 44, HD = 72, HP = 340, HW = 820, Z1 = 900;
    const armar = (x0: number, plano: Plano, idPuerta: string, abre: () => boolean) => {
      const recuerdo = plano === 'C';
      // el lado que siempre se ve: el del fondo, visto desde la camara de ese plano
      const sgn = recuerdo ? 1 : -1;
      const tex = recuerdo ? 'pared_recuerdo' : 'pared_presente';
      const cara = (w: number, h: number, zocalo: boolean) => (c: CanvasRenderingContext2D) => {
        const hj = hoja(tex);
        const pat = c.createPattern(hj.fuente as CanvasImageSource, 'repeat');
        if (pat) { pat.setTransform(new DOMMatrix().scale(0.5)); c.fillStyle = pat; } else c.fillStyle = recuerdo ? '#f1e6cc' : '#121921';
        c.fillRect(0, 0, w, h);
        c.fillStyle = recuerdo ? 'rgba(120,90,55,0.45)' : '#1b232c';
        c.fillRect(0, 0, w, 16);
        if (zocalo) c.fillRect(0, h - 26, w, 26);
        c.strokeStyle = recuerdo ? 'rgba(90,66,40,0.4)' : 'rgba(160,180,198,0.22)'; c.lineWidth = 3;
        c.strokeRect(1, 1, w - 2, h - 2);
      };
      const canto = (w: number, h: number) => (c: CanvasRenderingContext2D) => {
        c.fillStyle = recuerdo ? '#d9c8a4' : '#0a0e12'; c.fillRect(0, 0, w, h);
        c.fillStyle = recuerdo ? 'rgba(255,250,235,0.6)' : 'rgba(160,180,198,0.3)';
        c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
      };
      const opc = { plano, res: 0.35, propia: recuerdo ? 0.9 : 0.55, lavado: recuerdo ? 0.2 : 0 };
      const frente: Carta[] = [];
      // opacas: escriben profundidad, asi tapan y quedan tapadas como una pared de verdad
      const plancha = (w: number, h: number, x: number, y: number, z: number, rotY: number, dibujar: (c: CanvasRenderingContext2D) => void, soloPrimera = false) => {
        const c = this.agregar(new Carta({ ...opc, w, h, x, y, z, rotY, dibujar, opaca: !soloPrimera }));
        if (soloPrimera) { frente.push(c); c.visible = 0; }
        return c;
      };
      const L = Z1 - HD, zc = sgn * (HD + Z1) / 2;
      // el tramo del fondo: siempre
      plancha(L, HW, x0 - T / 2, 0, zc, -Math.PI / 2, cara(L, HW, true));
      plancha(L, HW, x0 + T / 2, 0, zc, Math.PI / 2, cara(L, HW, true));
      plancha(T, HW, x0, 0, sgn * HD, sgn < 0 ? 0 : Math.PI, canto(T, HW));
      // el dintel, sobre la puerta
      plancha(2 * HD, HW - HP, x0 - T / 2, HP, 0, -Math.PI / 2, cara(2 * HD, HW - HP, false));
      plancha(2 * HD, HW - HP, x0 + T / 2, HP, 0, Math.PI / 2, cara(2 * HD, HW - HP, false));
      // el tramo de adelante: solo en primera persona (en tercera, la casa esta cortada)
      plancha(L, HW, x0 - T / 2, 0, -zc, -Math.PI / 2, cara(L, HW, true), true);
      plancha(L, HW, x0 + T / 2, 0, -zc, Math.PI / 2, cara(L, HW, true), true);
      plancha(T, HW, x0, 0, -sgn * HD, sgn < 0 ? Math.PI : 0, canto(T, HW), true);
      // la hoja de la puerta, colgada de su bisagra
      const bisagra = new THREE.Group();
      bisagra.position.set(x0 - T / 2 - 2, 0, sgn * HD);
      this.escena.add(bisagra);
      const hj = hoja(idPuerta);
      // el picaporte, del lado contrario a la bisagra
      const hoja3d = this.agregar(new Carta({ ...opc, opaca: true, w: 2 * HD, h: HP, x: 0, y: 0, z: -sgn * HD, rotY: -Math.PI / 2, animada: hj.cuadros > 1,
        clave: () => (abre() ? 1 : 0),
        dibujar: (c) => pintar(c, idPuerta, hj.cuadros > 1 && abre() ? 1 : 0, 0, 0, 2 * HD, HP, !recuerdo) }));
      bisagra.add(hoja3d.mesh);
      this.paredes.push({ x: x0, plano, frente, bisagra, abierta: 0, abre });
    };
    for (const x of CORTINAS) armar(x, 'A', 'puerta_presente', () => false);
    armar(X.cortinaPiano, 'A', 'puerta_trabada', () => this.piano.resuelto);
    HUECOS.forEach((x, i) => armar(x, 'C', 'puerta_recuerdo', () => i === HUECOS.length - 1 && this.conSenora && this.planoFinal === 'C'));

    // el frente de cada cuarto que todavia no se abrio: un bastidor de papel pintado que lo tapa en
    // tercera persona. Va pegado a la pared (justo delante del paso), asi no queda una franja por perspectiva.
    // Cuando ella ya esta del otro lado desaparece sin verse; si se abre la puerta, se desvanece.
    const frentes = (plano: Plano, xs: number[], fin: number) => {
      const recuerdo = plano === 'C';
      const orden = [...xs].sort((a, b) => a - b);
      orden.forEach((desde, i) => {
        const hasta = i + 1 < orden.length ? orden[i + 1] : fin;
        const ini = desde + 20, w = hasta - ini + 40, h = 1100;
        const pared = this.paredes.find((p) => p.x === desde && p.plano === plano)!;
        const carta = this.agregar(new Carta({ w, h, res: 0.25, x: ini + w / 2, y: -80, z: recuerdo ? -92 : 92,
          rotY: recuerdo ? Math.PI : 0, plano, propia: recuerdo ? 0.95 : 0.5, lavado: recuerdo ? 0.2 : 0,
          dibujar: (c) => {
            const hj = hoja(recuerdo ? 'pared_recuerdo' : 'pared_presente');
            const pat = c.createPattern(hj.fuente as CanvasImageSource, 'repeat');
            if (pat) { pat.setTransform(new DOMMatrix().scale(0.6)); c.fillStyle = pat; } else c.fillStyle = recuerdo ? '#f1e6cc' : '#121921';
            c.fillRect(0, 0, w, h);
            c.fillStyle = recuerdo ? 'rgba(120,90,55,0.18)' : 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, w, h);
            // el borde del bastidor y una ventana cerrada, para que se lea como la casa por fuera
            c.strokeStyle = recuerdo ? 'rgba(90,66,40,0.6)' : 'rgba(160,180,198,0.35)'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
            const vx = w / 2 - 90, vy = h * 0.3;
            c.fillStyle = recuerdo ? '#8a6a44' : '#0a0e13'; c.fillRect(vx, vy, 180, 220);
            c.strokeStyle = recuerdo ? '#4b3923' : 'rgba(160,180,198,0.3)'; c.lineWidth = 4; c.strokeRect(vx, vy, 180, 220);
            for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(vx, vy + k * 27); c.lineTo(vx + 180, vy + k * 27); c.stroke(); }
          } }));
        this.fachadas.push({ carta, desde, plano, revelada: 0, abre: pared.abre });
      });
    };
    frentes('A', [...CORTINAS, X.cortinaPiano], X.tapia);
    CORTINAS.forEach((x, i) => { const p = this.paredes.find((q) => q.x === x && q.plano === 'A'); if (p) p.muebles = this.mueblesBarricada[i]; });
    frentes('C', HUECOS, 7000);
  }

  private tipoPerseguidor(slot: number) {
    const fig = FIGS[slot];
    return this.hecho[fig] ? `miedo_${fig}` : 'sombra';
  }

  // ------------------------------------------------------------------ la protagonista y su sombra

  private spriteProta() {
    const nina = this.visto === 'C';
    let id: string;
    if (nina) id = this.caminando ? 'nina_camina' : this.aura.fuerza > 0.2 ? 'nina_tararea' : 'nina_quieta';
    else id = this.caminando ? 'josefina_camina' : this.aura.fuerza > 0.2 ? 'josefina_tararea'
      : this.cordura < 0.5 || this.fase === 'despertar' || this.fase === 'llamado' || this.fase === 'ahogo' ? 'josefina_tiembla' : 'josefina_quieta';
    // el plano que se esta viendo manda: al cruzar, ya mira hacia donde va a caminar
    const dirPantalla = this.visto === 'A' ? this.dir : -this.dir;
    return { id, cuadro: cuadroEn(id, this.t * (this.caminando && !nina ? lerp(0.6, 1, this.cordura) : 1)), espejo: dirPantalla < 0 };
  }

  /**
   * Su sombra en la pared. Mas grande y mas negra cuanto menos calma tiene. Y
   * cada recuerdo aceptado le agrega una cabeza: la de quien se lo dio.
   */
  private dibujarSombra(c: CanvasRenderingContext2D, w: number, h: number, recuerdo: boolean) {
    const s = this.spriteProta();
    const miedo = recuerdo ? 0 : 1 - this.cordura;
    // en el presente, la luz de las lamparas y de su voz sobre la pared: ahi se recorta la sombra
    if (!recuerdo) {
      const luz = 0.1 + this.cercaDeLuz() * 0.14 + this.aura.fuerza * 0.16;
      // el radio entra entero en la carta: el degradado llega a cero antes del borde
      const rr = Math.min(w / 2, h * 0.5) * 0.97;
      const g = c.createRadialGradient(w / 2, h * 0.52, 0, w / 2, h * 0.52, rr);
      g.addColorStop(0, `rgba(230,190,130,${luz})`);
      g.addColorStop(0.45, `rgba(230,190,130,${luz * 0.55})`);
      g.addColorStop(1, 'rgba(230,190,130,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    c.save();
    c.globalAlpha = recuerdo ? 0.24 : lerp(0.32, 0.72, miedo);
    c.translate(w / 2, h);
    c.transform(1, 0, -0.16 - miedo * 0.12, 1, 0, 0);
    const k = 1.15 + miedo * 0.25 + Math.sin(this.t * 1.7) * 0.02 * miedo;
    c.scale(k, k * (1.05 + miedo * 0.15));
    // la sombra llega un poco tarde: cuando tiene miedo, no la sigue del todo
    const retraso = miedo * Math.sin(this.t * 0.9) * 8;
    c.filter = 'brightness(0) blur(1.5px)';
    pintar(c, s.id, s.cuadro, -PW / 2 + retraso, -PH, PW, PH, s.espejo);
    // lo que le dieron, colgado de su sombra. Su sombra no parpadea; lo ajeno, si.
    const cp = cabeza(s.id);
    const tope = -PH + cp.y * SP, hombro = tope + cp.h * SP * 1.3;
    const mira = s.espejo ? -1 : 1;
    const lugar: Record<IdFig, [number, number, number, number]> = {
      mariela: [30 * mira, -PH * 0.44, 0.35 * mira, 36],
      madre: [-24 * mira, -PH * 0.5, -0.5 * mira, 30],
      abuela: [0, hombro + 10, 0, 40],
    };
    FIGS.forEach((fig, i) => {
      if (!this.hecho[fig]) return;
      const [dx, dy, rot, tam] = lugar[fig];
      const prendido = Math.sin(this.t * 7 + i * 2.3) + rc(this.t * 3, i * 5) * 1.2 > -0.35 ? 1 : 0.1;
      c.save();
      c.globalAlpha *= prendido;
      c.translate(dx + retraso + Math.sin(this.t * 1.3 + i * 2) * 1.5, dy + Math.cos(this.t * 1.1 + i) * 1.5);
      c.rotate(rot + Math.sin(this.t * 0.8 + i) * 0.08 * (1 + miedo));
      pintar(c, OBJETO[fig], 0, -tam / 2, -tam / 2, tam, tam);
      c.restore();
    });
    c.filter = 'none';
    c.restore();
  }

  // ------------------------------------------------------------------ ciclo

  alEntrar(x: Contexto) {
    this.x = x;
    this.siguiente = null;
    this.t = 0;
    this.cambiar('despertar');
    this.gx = X.inicio;
    this.dir = 1;
    this.phi = 0;
    this.pitch = 0;
    this.lado = this.visto = 'A';
    this.pesoA = 1;
    this.giro = null;
    this.gxAnimado = null;
    this.bisagra = null;
    this.cordura = 0.55;
    this.flash = 0;
    this.embestida = -1;
    this.movido = false;
    this.conSenora = false;
    this.refugio = X.inicio;
    for (const l of this.lamparas) { l.encendida = false; l.frase = new Frase([l.nota]); }
    this.pianoFrase = new Frase(FRASE);
    this.pensado.clear();
    this.pensamientos = [];
    this.cantan = [];
    this.puertaAbierta = false;
    this.traspasos = [];
    this.relampago = 0;
    this.piano = { resuelto: false };
    for (const p of this.paredes) { p.abierta = 0; p.bisagra.rotation.y = 0; }
    for (const f of this.fachadas) f.revelada = 0;
    this.cMismaA.visible = this.cMismaC.visible = 0;
    this.cMismaA.mesh.position.set(X.misma, 0, 0);
    this.cMismaC.mesh.position.set(X.misma, 0, 0);
    this.cFigA.senora.visible = 1;
    for (const p of this.perseguidores) { p.activo = false; p.vis = 0; }
    for (const id of FIGS) { this.parientes[id].offset = 0; this.parientes[id].oscuro = 0; this.cFigC[id].visible = 1; }
    GLOBAL.uAlba.value = 0;
    GLOBAL.uFocoI.value = 0;
    partida.carga = 0;
    partida.reconocidos = [];
    partida.final = null;
    this.hecho = { mariela: false, madre: false, abuela: false };
    this.ladoSonido = 'A';
    x.voz.empezarCalibracionPiso();
    x.son.ambiente('ahora', 0.7, 5);
    x.son.viento(0.02);
    x.son.humedad(0.7);
  }

  /** El respaldo de ENTER para gritar solo vale cuando se pide el grito. */
  get quiereGrito() { return this.dialogo.gritando; }

  private get enFinal() { return this.fase === 'final' || this.fase === 'callar' || this.fase === 'desgarro' || this.fase === 'caida' || this.fase === 'hundir'; }
  private get enPrimeraPersona() { return this.fase === 'ahogo' || this.fase === 'dialogo' || this.fase === 'umbral' || this.fase === 'encuentro' || this.enFinal; }

  actualizar(dtMs: number, x: Contexto) {
    const dt = dtMs / 1000;
    this.t += dt;
    Carta.tiempo = this.t;
    this.msFase += dtMs;
    const v = x.voz;
    this.hayMic = v.disponible;
    this.flash = Math.max(0, this.flash - dt * 0.8);
    const fuerza = v.estado === 'tarareo' ? v.fuerza : 0;
    this.tarareo = hacia(this.tarareo, fuerza > 0.05 ? 1 : 0, 5, dt);

    // --- apertura: calibrar el silencio; despues, el primer miedo y la primera cancion ---
    if (this.fase === 'despertar' && this.msFase > 1800) {
      v.terminarCalibracionPiso();
      this.cambiar('llamado');
      this.aparecer(0, -1, 520);
      this.pensar('despierta');
      this.pensar('cantar');
    }
    if (this.fase === 'llamado') {
      v.registrarBase();
      this.cordura = Math.max(0.3, this.cordura - dt * 0.03);
      if (v.msTarareo > 1300 || (v.respaldoTarareo && v.msTarareo > 600)) {
        this.cambiar('libre');
        this.encender(this.lamparas[0]);
        // la primera cancion deshace la primera sombra
        for (const p of this.perseguidores) { p.activo = false; }
        this.cordura = Math.max(this.cordura, 0.85);
        x.son.cancion(v.frecRelativa(0), 0.05);
        this.pensar('salir');
      }
    }

    // --- caminar ---
    const libre = this.fase === 'libre';
    const der = x.tec.abajo('ArrowRight') || x.tec.abajo('KeyD');
    const izq = x.tec.abajo('ArrowLeft') || x.tec.abajo('KeyA');
    const movPantalla = libre ? (der ? 1 : 0) - (izq ? 1 : 0) : 0;
    const mov = this.lado === 'A' ? movPantalla : -movPantalla;
    this.caminando = mov !== 0;
    if (mov) { this.dir = mov; this.movido = true; }
    const vel = this.lado === 'A' ? 118 * lerp(0.45, 1, this.cordura) * (this.tarareo > 0.5 ? 0.6 : 1) : 150;
    if (libre) this.gx = this.limitar(this.gx + mov * vel * dt);
    if (this.caminando) {
      this.fasePaso += dt * (vel / 16);
      this.msPaso -= dtMs;
      if (this.msPaso <= 0) { this.msPaso = this.lado === 'A' ? 430 / lerp(0.6, 1, this.cordura) : 300; x.son.paso(0.04, this.lado === 'A' ? 900 : 2200); }
      this.msQuieta = 0;
    } else this.msQuieta += dtMs;

    // --- enfrentar ---
    const b = this.bisagraCerca();
    if (libre && b && (x.tec.pulsado('ArrowUp') || x.tec.pulsado('KeyW'))) this.enfrentar(b);

    // --- la voz ---
    this.aura.actualizar(dtMs, fuerza, 70, 300);

    // --- el presente: calma, pantano, perseguidores, ellas que retroceden ---
    if (this.lado === 'A' && (libre || this.fase === 'llamado')) this.actualizarPresente(dt, fuerza);
    else if (!this.enPrimeraPersona && this.fase !== 'despertar') this.cordura = Math.min(1, this.cordura + dt * 0.2);
    this.actualizarPerseguidores(dt);
    for (const id of FIGS) {
      const p = this.parientes[id];
      const cerca = this.lado === 'A' && Math.abs(this.gx - (EN_AHORA[id] + p.offset)) < 440;
      const teme = cerca && this.cordura < 0.65 && (libre || this.fase === 'llamado');
      p.offset = hacia(p.offset, teme ? 170 : 0, teme ? 1.6 : 0.8, dt);
      p.oscuro = hacia(p.oscuro, teme || (this.lado === 'A' && this.cordura < 0.35 && libre) ? 1 : 0, teme ? 2.5 : 1.2, dt);
      this.cFigA[id].mesh.position.x = EN_AHORA[id] + p.offset;
    }

    // --- el piano: la cancion, nota por nota ---
    if (this.lado === 'A' && libre) this.actualizarPiano(dtMs, v);
    for (const p of this.pensamientos) p.t += dt;
    if (this.pensamientos.length && this.pensamientos[0].t > 2.2 + this.pensamientos[0].texto.length * 0.06) this.pensamientos.shift();

    // --- el recuerdo: ellas tararean su frase cada tanto (para conocerla antes de hablarles) ---
    if (this.visto === 'C' && libre) {
      for (const id of FIGS) {
        if (this.hecho[id] || Math.abs(this.gx - EN_RECUERDO[id]) > 650) continue;
        this.msCanto[id] -= dtMs;
        if (this.msCanto[id] <= 0) {
          this.msCanto[id] = 8000;
          const vol = clamp(1 - Math.abs(this.gx - EN_RECUERDO[id]) / 650) * 0.08;
          MELODIAS[id].forEach((n, k) => this.cantan.push({ t: k * 0.62, f: v.frecRelativa(n), vol }));
        }
      }
    }
    for (const c of this.cantan) { c.t -= dt; if (c.t <= 0) x.son.canto(c.f, c.vol); }
    this.cantan = this.cantan.filter((c) => c.t > 0);
    if (this.visto === 'C' && libre) this.pensar('recuerdo');
    for (const tr of this.traspasos) tr.t += dt;
    if (this.ancla) {
      this.ancla.t += dt;
      const u = this.ancla.t / this.ancla.dur;
      const cambia = { mariela: 0.6, madre: 0.73, abuela: 0.56 }[this.ancla.fig];
      if (u >= cambia) this.visto = this.ancla.nuevo;
      // la llave: va hasta la cerradura, espia, se asusta, vuelve a pararse frente a la puerta,
      // y la puerta se abre. La tercera persona sale de ahi mismo.
      const an = this.ancla;
      if (an.fig === 'madre' && an.desde !== undefined && an.puerta !== undefined) {
        const frente = Math.max(an.desde, an.puerta - 250);
        this.gx = lerp(an.desde, frente, suave(0.3, 0.58, u));
        if (an.pared) {
          an.pared.forzada = u > 0.6;
          if (an.pared.muebles) an.pared.muebles.visible = 1 - suave(0, 0.12, u);
        }
      }
    }
    // al principio, antes de la primera cancion: alguien tararea bajito, como invitando
    if (this.fase === 'llamado' && v.estado !== 'tarareo') {
      this.msInvita -= dtMs;
      if (this.msInvita <= 0) { this.msInvita = 4500; x.son.canto(v.frecRelativa(0), 0.06, 1.1); }
    }
    this.traspasos = this.traspasos.filter((tr) => tr.t < 2.6);

    // --- el giro de camara ---
    if (this.giro) {
      const g = this.giro;
      g.t += dt;
      const u = clamp(g.t / g.dur);
      const e = g.curva ? g.curva(u) : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      this.phi = lerp(g.desde, g.hasta, e);
      if (u >= 1) { this.giro = null; g.luego(); }
    }

    // --- el dialogo ---
    this.dialogo.actualizar(dtMs, x.tec, v, x.son);

    // la que ya dio su miedo dice lo suyo y se desvanece: el recuerdo sigue sin ella
    for (const id of FIGS) {
      const hablandoConElla = this.dialogo.activo && this.bisagra?.fig === id && this.bisagra.plano === 'C';
      this.cFigC[id].visible = hacia(this.cFigC[id].visible, this.hecho[id] && !hablandoConElla ? 0 : 1, 1.4, dt);
    }

    this.pesoA = hacia(this.pesoA, this.visto === 'A' ? 1 : 0, 2.6, dt);

    // la cortina del piano se levanta cuando suena la cancion completa
    const sube = this.piano.resuelto ? 1 : 0;
    void sube; // la puerta trabada no se va: se abre (cambia de cuadro) y queda

    // --- el camino al aljibe, y lo que viene despues ---
    this.actualizarFinal(dt, dtMs, x);

    // --- sonido ---
    const lugar = this.fase === 'umbral' || this.fase === 'encuentro' || this.enFinal ? 'patio' : this.visto;
    if (lugar !== this.ladoSonido && this.fase !== 'desgarro') {
      this.ladoSonido = lugar;
      if (lugar === 'A') { x.son.ambiente('ahora', 0.7, 3); x.son.humedad(0.7); }
      else if (lugar === 'C') { x.son.ambiente('antes', 0.45, 3); x.son.humedad(0.25); }
      else { x.son.ambiente('patio', 0.6, 4); x.son.humedad(0.9); }
    }
    const presente = this.lado === 'A' && !this.enPrimeraPersona;
    x.son.capa('pantano', presente ? this.pantano() : this.fase === 'caida' ? clamp(this.msFase / 3000) : 0);
    x.son.capa('tormenta', this.visto === 'A' && !this.enPrimeraPersona ? this.tormenta() : this.fase === 'dialogo' && this.bisagra?.id === 'abuelaP' ? 0.5 : 0);
    let cercano = 0;
    for (const p of this.perseguidores) if (p.activo) cercano = Math.max(cercano, p.vis * clamp(1 - Math.abs(p.x - this.gx) / 700));
    x.son.capa('perseguidor', cercano);

    this.ubicarCamara(dt);
    this.actualizarLuces();
  }

  private pantano() { return clamp((0.78 - this.cordura) / 0.78); }
  private tormenta() { return this.gx > TORMENTA[0] - 200 && this.gx < TORMENTA[1] + 200 ? 1 : 0; }

  private actualizarPresente(dt: number, fuerza: number) {
    const luz = this.cercaDeLuz();
    // encender una luz cantandole su nota: cada luz tararea la suya
    for (const l of this.lamparas) {
      if (l.encendida || l.sprite === 'tele') continue;
      const d = Math.abs(this.gx - l.x);
      if (d < 380 && l !== this.lamparas[0] && this.fase === 'libre') this.pensar('luz');
      const r = l.frase.actualizar(dt * 1000, this.x.voz, (n, guia) => this.x.son.canto(this.x.voz.frecRelativa(n), guia ? 0.04 : 0.07, 0.8), d < 420);
      if (r === 'completa') this.encender(l);
    }
    if (this.gx > X.puerta - 320 && !this.puertaAbierta) { this.puertaAbierta = true; this.x.son.paso(0.2, 300); }
    if (this.gx > X.puerta) this.pensar('afuera');
    const afuera = this.gx > X.puerta - 20 ? 1.8 : 1;
    const baja = (0.028 * (1 - luz) + 0.008) * afuera;
    const sube = fuerza * 0.32 + luz * 0.07;
    this.cordura = clamp(this.cordura + (sube - baja) * dt);

    // la tormenta: los relampagos muestran lo que hay en lo oscuro
    this.relampago = Math.max(0, this.relampago - dt * 2.2);
    if (this.tormenta()) {
      this.msRelampago -= dt * 1000;
      if (this.msRelampago <= 0) { this.relampago = 1; this.msRelampago = 3500 + Math.random() * 5000; this.x.son.trueno(); }
    }

    // aparecen cuando se pierde la calma, lejos de las lamparas
    this.msSpawn -= dt * 1000;
    if (this.fase === 'libre' && this.cordura < 0.58 && luz < 0.3 && this.msSpawn <= 0) {
      const libres = this.perseguidores.filter((p) => !p.activo);
      const cuantos = this.perseguidores.length - libres.length;
      if (libres.length && cuantos < 1 + Math.floor((1 - this.cordura) * 3)) {
        this.aparecer(libres[0].slot, Math.random() < 0.65 ? -this.dir : this.dir, 720);
        this.msSpawn = 2200 + this.cordura * 3000;
      }
    }
  }

  private aparecer(slot: number, lado: number, dist: number) {
    const p = this.perseguidores[slot];
    p.activo = true;
    p.x = this.gx + lado * dist;
    p.vx = -lado * 20;
    p.vis = 0.01;
  }

  private actualizarPerseguidores(dt: number) {
    const luz = this.cercaDeLuz();
    const enPresente = this.lado === 'A' && (this.fase === 'libre' || this.fase === 'llamado');
    for (const p of this.perseguidores) {
      if (!p.activo) { p.carta.visible = hacia(p.carta.visible, 0, 4, dt); continue; }
      const dx = this.gx - p.x;
      const lejos = Math.abs(dx);
      const vel = this.fase === 'llamado' ? 26 : 34 + (1 - this.cordura) * 60;
      let objetivo = Math.sign(dx) * vel;
      // la voz los empuja y los deshace
      const empuja = this.aura.fuerza > 0.2 && lejos < this.aura.r * 1.3 + 60;
      if (empuja) objetivo = -Math.sign(dx) * 150 * this.aura.fuerza;
      if (this.fase === 'llamado' && lejos < 170) objetivo = 0;
      if (!enPresente) objetivo = -Math.sign(dx) * 80;
      if (this.fase === 'ahogo') {
        // lo que la agarro, enfrente y enorme, recortado contra una luz fria
        p.carta.visible = p.vis * this.pesoA;
        p.carta.mesh.position.set(p.x, 0, 0);
        p.carta.mesh.scale.setScalar(1.5);
        continue;
      }
      p.carta.mesh.scale.setScalar(1);
      p.carta.mesh.position.z = 40 + p.slot * 12;
      p.vx = hacia(p.vx, objetivo, 3, dt);
      p.x += p.vx * dt;
      const sePierde = empuja || luz > 0.35 || !enPresente || (this.cordura > 0.8 && this.fase !== 'llamado');
      p.vis = clamp(p.vis + (sePierde ? -dt * (empuja ? 0.9 : 0.5) : dt * 0.6));
      if (p.vis <= 0 && sePierde) { p.activo = false; continue; }
      // en la tormenta solo se los ve con el relampago
      const verse = this.tormenta() ? 0.12 + this.relampago : 1;
      p.carta.visible = p.vis * verse * this.pesoA;
      p.carta.mesh.position.x = p.x;
      // la alcanzan
      if (enPresente && this.fase === 'libre' && lejos < 50 && p.vis > 0.5) this.ahogar(p);
    }
  }

  /**
   * La alcanzan: la camara entra en sus ojos (ve lo que la agarra), el barro
   * sube, y todo se rebobina, en primera persona, hasta la ultima luz.
   */
  private ahogar(quien: Perseguidor) {
    this.x.son.ahogo();
    this.cambiar('ahogo');
    // lo que la agarro queda enfrente, mirandola, cuando la camara entra en sus ojos
    for (const p of this.perseguidores) if (p !== quien) p.activo = false;
    quien.x = this.gx + 150; quien.vx = 0; quien.vis = 1;
    this.rebobinado = { desde: this.gx, hasta: this.refugio, t: 0, dur: clamp(Math.abs(this.gx - this.refugio) / 450, 1.8, 3.8), etapa: 'entra' };
    this.dir = 1;
    this.vuelta = 0;
    // 1. la camara entra en sus ojos, de frente a lo que la agarro
    this.giro = {
      desde: this.phi, hasta: Math.PI / 2, t: 0, dur: 1.0,
      luego: () => { this.rebobinado!.etapa = 'vuelta'; this.rebobinado!.t = 0; },
    };
  }

  private actualizarPiano(dtMs: number, v: Contexto['voz']) {
    if (this.piano.resuelto) return;
    const d = Math.abs(this.gx - X.piano);
    if (d < 500) this.pensar('piano');
    const r = this.pianoFrase.actualizar(dtMs, v, (n, guia) => this.x.son.piano(v.frecRelativa(n), guia ? 0.08 : 0.16), d < 420);
    if (r === 'nota') this.x.son.piano(v.frecRelativa(FRASE[this.pianoFrase.k - 1]), 0.2);
    if (r === 'error') for (const n of [0, 1, 6]) this.x.son.piano(v.frecRelativa(-11 + n), 0.12);
    if (r === 'completa') {
      this.piano.resuelto = true;
      this.encender(this.lamparas.find((l) => l.sprite === 'tele')!);
      this.x.son.cancion(v.frecRelativa(0), 0.08);
      this.x.son.campana(v.frecRelativa(0), 0.15);
    }
  }

  /** Cantarle a una del recuerdo: se calma, y su sombra se le escurre a la nena. */
  private traspasar(id: IdFig, primera: boolean) {
    if (this.hecho[id]) return;
    this.hecho[id] = true;
    partida.carga += 1;
    partida.reconocidos.push(id);
    this.traspasos.push({ fig: id, t: 0, primera });
    this.x.son.tinta(2.4);
  }

  private actualizarFinal(dt: number, dtMs: number, x: Contexto) {
    // la alcanzaron: se da vuelta, la arrastran hasta la ultima luz, y la camara vuelve al costado
    const rb = this.rebobinado;
    if (this.fase === 'ahogo' && rb) {
      rb.t += dt;
      if (rb.etapa === 'vuelta') {
        // 2. un latigazo: mira hacia atras, hacia donde la van a arrastrar
        this.vuelta = Math.PI * suave(0, 0.5, rb.t);
        if (rb.t >= 0.5) { rb.etapa = 'arrastre'; rb.t = 0; this.x.son.rebobinar(rb.dur); }
      } else if (rb.etapa === 'arrastre') {
        // 3. la arrastran: todo pasa al reves, y la luz se acerca de frente
        const u = clamp(rb.t / rb.dur);
        this.gx = lerp(rb.desde, rb.hasta, u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        this.cordura = lerp(this.cordura, 0.75, dt * 1.5);
        for (const p of this.perseguidores) {
          if (!p.activo) continue;
          p.vis = Math.max(0, p.vis - dt * 0.9);
          if (p.vis <= 0) p.activo = false;
        }
        if (u >= 1) {
          // 4. sale al costado con un solo giro: la vuelta se deshace mientras gira
          rb.etapa = 'salida'; rb.t = 0;
          this.giro = {
            desde: this.phi, hasta: 0, t: 0, dur: 1.3,
            luego: () => {
              this.rebobinado = null;
              this.vuelta = 0;
              for (const p of this.perseguidores) p.activo = false;
              this.cordura = 0.75;
              this.cambiar('libre');
              this.pensar('rebobina');
            },
          };
        }
      } else if (rb.etapa === 'salida' && this.giro) {
        const u = clamp(this.giro.t / this.giro.dur);
        this.vuelta = Math.PI * (1 - (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2));
      }
    }

    // el camino al aljibe: en primera persona, lento
    const aparece = this.fase === 'encuentro' || this.enFinal ? 1 : 0;
    const cm = this.planoFinal === 'A' ? this.cMismaA : this.cMismaC;
    cm.visible = hacia(cm.visible, aparece, 0.8, dt);
    (this.planoFinal === 'A' ? this.cMismaC : this.cMismaA).visible = 0;
    this.cFigA.senora.visible = hacia(this.cFigA.senora.visible, this.fase === 'umbral' || this.fase === 'encuentro' || this.enFinal ? 0 : 1, 1.5, dt);
    if (this.fase === 'umbral') {
      const avanza = x.tec.abajo('ArrowRight') || x.tec.abajo('ArrowUp') || x.tec.abajo('KeyD') || x.tec.abajo('KeyW');
      this.caminando = avanza;
      if (avanza) {
        this.gx += 46 * dt;
        this.fasePaso += dt * 2.6;
        this.msPaso -= dtMs;
        if (this.msPaso <= 0) { this.msPaso = 800; x.son.paso(0.07, this.planoFinal === 'A' ? 500 : 1400); }
      }
      if (this.msFase > 1500) this.pensar('aljibe');
      if (this.msFase > 6000 && partida.carga > 0) this.pensar('ellas');
      if (this.gx >= X.aljibe - 330) { this.gx = X.aljibe - 330; this.cambiar('encuentro'); }
    }
    // lo que le dieron flota a su lado, un poco adelante, en los bordes de la vista
    const conElla = this.fase === 'umbral' || this.fase === 'encuentro' || this.fase === 'final' || this.fase === 'callar';
    FIGS.forEach((fig, i) => {
      const cc = this.companeras[i];
      const callando = this.fase === 'callar' || this.fase === 'desgarro';
      cc.visible = hacia(cc.visible, conElla && this.hecho[fig] ? 1 : 0, 1.2, dt);
      const lado = i === 1 ? 1 : i === 0 ? -1 : 0.25;
      const junto = this.fase === 'umbral' ? 0 : 1;
      // mientras calla, vienen hacia ella... y la atraviesan
      const cerca = callando ? this.silencio : 0;
      cc.mesh.position.set(this.gx + lerp(230 + i * 40 + junto * 40, 20, cerca), lerp(i === 2 ? 170 : 115, 140, cerca) + Math.sin(this.t * 1.1 + i * 2) * 10,
        lado * lerp(80 + i * 14, 15, cerca) + Math.sin(this.t * 0.8 + i) * 4);
    });
    if (this.fase === 'encuentro') {
      if (this.msFase < 20) x.son.cancion(x.voz.frecRelativa(this.planoFinal === 'A' ? 12 : 0), 0.05, 0.9);
      if (this.msFase > 3200) {
        this.cambiar('final');
        this.dialogo.abrir(misma(this.planoFinal, partida.carga), (s) => this.salirDelFinal(s), {
          alSaltar: () => { this.embestida = 0; this.x.son.gota(true); },
        });
      }
    }
    if (this.embestida >= 0) { this.embestida += dt; if (this.embestida > 1.3) this.embestida = -1; }

    // callarse: el silencio sostenido llena; tararear lo vacia (la cancion la vuelve a tomar)
    if (this.fase === 'callar') {
      const v = x.voz;
      const suena = v.estado === 'tarareo' || v.estado === 'voz' || v.estado === 'grito';
      if (suena) { this.silencio = Math.max(0, this.silencio - dt * 0.5); if (this.silencio < 0.9) this.pensar('otra'); }
      else this.silencio = Math.min(1, this.silencio + dt / 9);
      if (this.silencio >= 1) {
        this.x.son.estallido();
        setTimeout(() => this.x.son.desgarro(), 300);
        this.flash = 0.6;
        this.cambiar('desgarro');
      }
    }

    // los finales: una animacion en el mundo, y despues la escena final
    if (this.fase === 'desgarro' && this.msFase > 3000) this.irAlFinal('audere');
    if (this.fase === 'caida' && this.msFase > 6500) this.irAlFinal('nopudo');
    if (this.fase === 'hundir' && this.msFase > 2000) this.irAlFinal('antes');
  }

  private irAlFinal(tipo: 'audere' | 'nopudo' | 'antes') {
    if (this.siguiente) return;
    partida.final = { tipo, plano: this.planoFinal };
    this.siguiente = 'final';
  }

  private cambiar(f: Fase) { this.fase = f; this.msFase = 0; }

  private cercaDeLuz() {
    let m = 0;
    for (const l of this.lamparas) if (l.encendida) m = Math.max(m, clamp(1 - Math.abs(this.gx - l.x) / 280));
    return m;
  }

  /** Una luz que se prende: desde ahora es refugio, y es adonde se vuelve. */
  private encender(l: Lampara) {
    if (l.encendida) return;
    l.encendida = true;
    this.refugio = l.x;
    this.x.son.campana(this.x.voz.frecRelativa(12), 0.12);
    this.x.son.gota();
  }

  private limitar(x: number) {
    let nx = clamp(x, 60, X.tapia);
    const muros = this.lado === 'A' ? [...CORTINAS, ...(this.piano.resuelto ? [] : [X.cortinaPiano]), X.tapia] : HUECOS;
    for (const m of muros) {
      if (this.gx <= m) nx = Math.min(nx, m - 45);
      else nx = Math.max(nx, m + 45);
      if (Math.abs(nx - m) < 50 && m !== X.tapia) this.pensar(this.lado === 'A' ? (m === X.cortinaPiano ? '' : 'barricada') : 'pared');
    }
    return Math.max(nx, 120);
  }

  /** Lo que se puede enfrentar. En el presente, solo si esta tranquila: si no, ellas no la dejan acercarse. */
  private bisagraCerca(): Bisagra | null {
    let mejor: Bisagra | null = null, dm = 1e9;
    for (const b of this.bisagras) {
      if (b.plano !== this.lado) continue;
      const d = b.x() - this.gx;
      if (d < -300 || d > 400) continue;
      if (b.plano === 'A' && b.fig && this.cordura < 0.65) continue;
      if (b.plano === 'C' && b.fig && this.hecho[b.fig]) continue;
      const p = Math.abs(d - 140);
      if (p < dm) { dm = p; mejor = b; }
    }
    return mejor;
  }

  /** De A o de C, a B: la camara entra en sus ojos. */
  private enfrentar(b: Bisagra) {
    this.bisagra = b;
    this.cambiar('girando');
    this.x.son.viento(0.12);
    this.gxAnimado = { desde: this.gx, hasta: b.x() - b.parada };
    this.dir = 1;
    this.giro = {
      desde: this.phi, hasta: Math.PI / 2, t: 0, dur: 1.8,
      luego: () => {
        this.x.son.viento(0.03);
        this.cambiar('dialogo');
        this.dialogo.abrir(b.guion()!, (s, tr) => this.salirDeFrente(s, tr), {
          alIgualar: () => { if (b.fig && b.plano === 'C') this.traspasar(b.fig, true); },
        });
      },
    };
  }

  /** De B a donde corresponda. */
  private salirDeFrente(s: Salida, traspaso: boolean) {
    const b = this.bisagra!;
    if (b.id === 'senora') { this.empezarUmbral(s === 'cruzar' ? 'C' : 'A'); return; }
    if (traspaso && b.fig) this.traspasar(b.fig, true);
    const nuevo: Plano = s === 'cruzar' ? (this.lado === 'A' ? 'C' : 'A') : this.lado;
    this.visto = nuevo;
    this.cambiar('girando');
    this.x.son.viento(0.12);
    // cruzar de plano con una de ellas: su objeto queda fijo en el centro mientras el tiempo cambia alrededor
    const conAncla = s === 'cruzar' && !!b.fig;
    if (conAncla) { this.empezarAncla(b.fig!, nuevo); this.visto = this.lado; }
    this.giro = {
      desde: this.phi, hasta: nuevo === 'A' ? 0 : Math.PI, t: 0, dur: conAncla ? DUR_ANCLA[b.fig!] : 1.8,
      curva: conAncla ? CURVA_ANCLA[b.fig!] : undefined,
      luego: () => {
        if (this.ancla?.pared) { this.ancla.pared.forzada = false; if (this.ancla.pared.muebles) this.ancla.pared.muebles.visible = 1; }
        this.ancla = null;
        this.lado = nuevo;
        this.bisagra = null;
        this.x.son.viento(0.03);
        if (nuevo === 'A') {
          this.refugio = Math.max(this.refugio, this.gx);
          this.cordura = Math.max(this.cordura, 0.7);
          if (traspaso || (b.fig && this.hecho[b.fig])) this.pensar('pesa');
        }
        this.cambiar('libre');
      },
    };
  }

  private empezarAncla(fig: IdFig, nuevo: Plano) {
    const dur = DUR_ANCLA[fig];
    this.ancla = { fig, t: 0, dur, nuevo };
    // la puerta a espiar, en la llave: la siguiente pared del plano de donde sale
    const pared = this.paredes.filter((p) => p.plano === this.lado && p.x > this.gx).sort((p, q) => p.x - q.x)[0];
    this.ancla.puerta = pared ? pared.x : this.gx + 400;
    this.ancla.desde = this.gx;
    this.ancla.pared = pared;
    const son = this.x.son, v = this.x.voz;
    const en = (u: number, fn: () => void) => setTimeout(fn, u * dur * 1000);
    if (fig === 'mariela') {
      en(0.22, () => son.campana(v.frecRelativa(12), 0.06));
      en(0.44, () => { for (const n of [-11, -10, -4]) son.piano(v.frecRelativa(n), 0.16); });
      en(0.5, () => son.campana(v.frecRelativa(13), 0.05));
      en(0.6, () => son.paso(0.08, 1800));
      en(0.62, () => son.tinta(1.4));
    }
    if (fig === 'madre') {
      en(0.04, () => son.paso(0.06, 700)); en(0.12, () => son.paso(0.06, 700));
      en(0.25, () => son.gota(true));
      en(0.42, () => { for (const n of [-13, -7, -6]) son.piano(v.frecRelativa(n), 0.22); });
      en(0.55, () => son.paso(0.1, 900));
      en(0.6, () => son.paso(0.25, 260)); en(0.65, () => son.paso(0.35, 180));
      en(0.72, () => son.tinta(1.6));
    }
    if (fig === 'abuela') {
      for (let i = 0; i < 8; i++) en(0.05 + i * 0.05, () => son.paso(0.04, 2800 + (i % 2) * 600));
      en(0.46, () => { son.trueno(); for (const n of [-13, -12, -6]) son.piano(v.frecRelativa(n), 0.3); });
      en(0.56, () => son.tinta(1.4));
    }
  }

  /** Despues de la Senora: el camino al aljibe, en primera persona, en el plano elegido. */
  private empezarUmbral(p: Plano) {
    this.conSenora = true;
    this.planoFinal = p;
    this.visto = p;
    this.lado = p;
    this.bisagra = null;
    this.cambiar('umbral');
    for (const q of this.perseguidores) q.activo = false;
  }

  private salirDelFinal(s: Salida) {
    if (s === 'final_audere') {
      // atreverse: no cantar. Lo oscuro se acerca; si aguanta callada, pasa a traves de ella
      this.silencio = 0;
      this.cambiar('callar');
      this.pensar('callar');
      this.x.son.ambiente('silencio', 0, 4);
    } else if (s === 'final_nopudo') {
      this.x.son.ahogo();
      this.cambiar('caida');
    } else {
      this.x.son.cancion(this.x.voz.frecRelativa(0), 0.09, 0.8);
      this.x.son.gota();
      this.cambiar('hundir');
    }
  }

  // ------------------------------------------------------------------ camara

  private ubicarCamara(dt: number) {
    if (this.gxAnimado && this.giro) {
      const u = clamp(this.giro.t / this.giro.dur);
      this.gx = lerp(this.gxAnimado.desde, this.gxAnimado.hasta, suave(0, 1, u));
    } else this.gxAnimado = null;

    const cam = this.camara;
    const ojo = this.lado === 'A' ? 158 : 108;
    const ax = this.gx + ADELANTE;
    const A = { x: ax, y: ALTO_CAM, z: D, fov: FOV_LADO };
    const lento = this.fase === 'umbral' || this.fase === 'encuentro' || this.enFinal;
    const bob = lento ? Math.sin(this.fasePaso * Math.PI) * 4 : Math.sin(this.t * 1.3) * 1.2;
    const B = { x: this.gx + 4, y: ojo + bob, z: 0, fov: lento ? lerp(62, 50, clamp((this.gx - 5600) / 700)) : 66 };
    const Cc = { x: ax, y: ALTO_CAM, z: -D, fov: FOV_LADO };
    const p = this.phi;
    const q = p <= Math.PI / 2 ? mezclar(A, B, p / (Math.PI / 2)) : mezclar(B, Cc, (p - Math.PI / 2) / (Math.PI / 2));
    let cx = q.x, cy = q.y;
    let mira = 0;
    if (this.bisagra && this.fase === 'dialogo') mira = Math.atan2(this.bisagra.mira - ojo, this.bisagra.parada) - 0.12;
    if (lento) mira = Math.atan2(150 - ojo, X.misma - this.gx) - 0.08;
    // saltar: se tira hacia el agua... y el cuerpo no va
    if (this.embestida >= 0) {
      const u = this.embestida / 1.3;
      cx += Math.sin(Math.PI * Math.min(1, u * 1.6)) * 80;
      cy += Math.sin(this.t * 60) * 3 * (1 - u);
    }
    // no pudo: se cae sentada, y mira para arriba
    let pitchExtra = 0;
    if (this.fase === 'caida') {
      const u = suave(0, 1400, this.msFase);
      cy = lerp(cy, 32, u) + Math.sin(this.t * 40) * 3 * (1 - u);
      pitchExtra = u * 0.42;
      const m = this.planoFinal === 'A' ? this.cMismaA : this.cMismaC;
      const u2 = suave(1500, 4500, this.msFase);
      m.mesh.position.set(X.misma - u2 * 110, u2 * 40, 0);
    }
    // antes: se asoma al agua y se hunde en ella
    if (this.fase === 'hundir') {
      // se inclina hacia el agua; antes de verla desde arriba, todo se vuelve luz de siesta
      const u = suave(0, 2000, this.msFase);
      cx = lerp(cx, X.aljibe - 150, u);
      pitchExtra = -u * 0.45;
    }
    cam.position.set(cx, cy, q.z);
    const arriba = Math.sin(Math.min(p, Math.PI - p)) * mira;
    this.pitch = hacia(this.pitch, pitchExtra, this.fase === 'caida' || this.fase === 'hundir' ? 6 : 3, dt);
    const rb = this.rebobinado;
    const arrastre = !!rb && rb.etapa === 'arrastre';
    // mientras la arrastran, la camara tiembla y se inclina un poco, como si tiraran de ella
    const tiron = arrastre ? Math.sin(this.t * 23) * 0.012 + 0.03 : 0;
    cam.rotation.set(this.pitch + (this.fase === 'ahogo' ? -tiron * 2 : arriba), -p + this.vuelta, (this.fase === 'caida' ? Math.sin(this.t * 0.7) * 0.05 : arrastre ? Math.sin(this.t * 3) * 0.03 : 0));
    cam.fov = q.fov;
    // el cruce con ancla
    if (this.ancla && this.giro) {
      const an = this.ancla, u = clamp(an.t / an.dur);
      if (an.fig === 'mariela') {
        // mira al piso: ahi esta el espejo. Cuando ve lo que hay en el reflejo, se inquieta.
        const baja = suave(0.02, 0.2, u) * (1 - suave(0.64, 0.8, u));
        cam.rotation.x += -0.95 * baja;
        const inquieta = suave(0.42, 0.47, u) * (1 - suave(0.6, 0.72, u));
        cam.rotation.z += (Math.sin(this.t * 29) * 0.035 + Math.sin(this.t * 6.3) * 0.05) * inquieta;
        cam.rotation.y += Math.sin(this.t * 4.1) * 0.06 * inquieta;
        cam.position.y += Math.sin(this.t * 41) * 4 * inquieta;
      }
      if (an.fig === 'madre') {
        // se agacha a la altura de la cerradura; al ver el ojo se sobresalta y vuelve a pararse frente a la puerta
        const agacha = suave(0.02, 0.2, u) * (1 - suave(0.47, 0.6, u));
        const px = (an.puerta ?? this.gx + 400) - 60;
        cam.position.x = lerp(cam.position.x, px, agacha);
        cam.position.y = lerp(cam.position.y, 128, agacha);
        cam.position.z = lerp(cam.position.z, 40, agacha);
        cam.rotation.x = lerp(cam.rotation.x, 0, agacha);
        const susto = suave(0.43, 0.46, u) * (1 - suave(0.52, 0.62, u));
        cam.rotation.z += (Math.sin(this.t * 31) * 0.04 + Math.sin(this.t * 5.7) * 0.03) * susto;
        cam.rotation.y += Math.sin(this.t * 4.3) * 0.05 * susto;
        cam.position.x -= susto * 25;
      }
      if (an.fig === 'abuela') {
        // sigue el rosario que baja... y mira para arriba: lo que lo sostiene
        const sube = suave(0.05, 0.48, u) * (1 - suave(0.55, 0.62, u));
        cam.rotation.x += 0.42 * sube;
        const pesadilla = suave(0.5, 0.56, u) * (1 - suave(0.72, 0.8, u));
        cam.rotation.z += Math.sin(this.t * 37) * 0.06 * pesadilla;
        cam.position.y += Math.sin(this.t * 51) * 6 * pesadilla;
      }
    }
    cam.updateProjectionMatrix();
  }

  private actualizarLuces() {
    const cam = this.camara;
    GLOBAL.uCam.value.copy(cam.position);
    const enB = Math.abs(this.phi - Math.PI / 2) < 0.3;
    if (enB) GLOBAL.uHalo.value.set(cam.position.x + 30, cam.position.y, cam.position.z);
    else GLOBAL.uHalo.value.set(this.gx + this.dir * 8, this.lado === 'A' ? 130 : 90, 0);
    GLOBAL.uHaloR.value = this.aura.r * 1.8 + 1;
    GLOBAL.uHaloI.value = this.aura.fuerza;
    GLOBAL.uHaloTinta.value = 1 - this.pesoA;
    const oscuro = this.fase === 'despertar' || this.fase === 'llamado' ? 0.12 : this.fase === 'ahogo' ? 0.04 : 0.19;
    const rebobina = this.fase === 'ahogo' ? (this.rebobinado?.etapa === 'arrastre' ? 0.45 : 0.2) : 0;
    const camino = this.fase === 'umbral' || this.fase === 'encuentro' || this.fase === 'final' ? 0.1 : 0;
    GLOBAL.uAmb.value = oscuro * lerp(0.6, 1, this.cordura) + this.relampago * 0.8 + rebobina + camino;

    // en primera persona, solo lo que tiene enfrente
    const cercaB = 1 - clamp(Math.abs(this.phi - Math.PI / 2) / 0.6);
    const lento = this.fase === 'umbral' || this.fase === 'encuentro' || this.enFinal;
    if (lento) {
      GLOBAL.uFoco.value.set(X.aljibe + 60, 0, 0);
      GLOBAL.uFocoI.value = this.fase === 'umbral' ? 0.15 : this.fase === 'callar' ? lerp(0.8, 1, this.silencio) : lerp(0.15, 0.8, clamp(this.msFase / 3000 + (this.enFinal ? 1 : 0)));
    } else if (this.ancla) {
      GLOBAL.uFocoI.value = 0;
    } else if (this.bisagra && (this.fase === 'dialogo' || this.fase === 'girando')) {
      GLOBAL.uFoco.value.set(this.bisagra.x(), 0, 0);
      GLOBAL.uFocoI.value = cercaB;
    } else GLOBAL.uFocoI.value = 0;

    const pos = GLOBAL.uLuzPos.value, I = GLOBAL.uLuzI.value, R = GLOBAL.uLuzR.value;
    const luces: [number, number, number, number, number][] = this.lamparas.map((l) =>
      [l.x, l.alto, l.z + 30, l.encendida ? (l.sprite === 'vela' ? 0.75 : 0.9) : l.frase.progresoNota * 0.4, l.sprite === 'vela' ? 400 : 480]);
    luces.push([7000, 900, -300, lento ? 0.9 : 0.3, 1800]);
    // al ser alcanzada: una luz fria detras de lo que la agarro
    const agarra = this.fase === 'ahogo' && this.rebobinado && (this.rebobinado.etapa === 'entra' || this.rebobinado.etapa === 'vuelta')
      ? this.perseguidores.find((p) => p.activo) : undefined;
    luces.push(agarra ? [agarra.x + 90, 180, 0, 1.4, 300] : [0, -9999, 0, 0, 1]);
    luces.forEach(([lx, ly, lz, li, lr], i) => {
      const parp = 0.88 + Math.sin(this.t * 11 + i) * 0.05 + rc(this.t * 6, i) * 0.07;
      pos[i].set(lx, ly, lz);
      I[i] = li * parp * (this.fase === 'caida' && i !== 8 ? 0 : 1);
      R[i] = lr;
    });

    // la protagonista se esfuma cuando la camara entra en sus ojos
    const dN = cam.position.distanceTo(new THREE.Vector3(this.gx, this.lado === 'A' ? 150 : 100, 0));
    this.cProta.visible = suave(110, 320, dN);
    this.cProta.mesh.position.x = this.gx;
    this.cSombraA.visible = this.cProta.visible;
    this.cSombraC.visible = this.cProta.visible;
    this.cSombraA.mesh.position.x = this.gx + 30;
    this.cSombraC.mesh.position.x = this.gx - 30;

    const rec = 1 - this.pesoA;
    this.cProta.mat.uniforms.uPropia.value = lerp(0.3, 0.95, rec);
    this.cProta.mat.uniforms.uLavado.value = rec * 0.12;
    this.cPiso.mat.uniforms.uPropia.value = lerp(0.1, 0.9, rec);
    for (const b of this.bordes) b.mat.uniforms.uPropia.value = lerp(0.08, 0.5, rec);

    this.cCielo.visible = hacia(this.cCielo.visible, lento ? 1 : 0, 1, 1 / 60);
    // las paredes: el tramo de adelante aparece en primera persona; las puertas que se abren giran
    for (const p of this.paredes) {
      for (const c of p.frente) c.visible = cercaB;
      p.abierta = hacia(p.abierta, p.abre() || p.forzada ? 1 : 0, p.forzada ? 1.1 : 1.6, 1 / 60);
      p.bisagra.rotation.y = (p.plano === 'A' ? 1 : -1) * p.abierta * 1.75;
    }
    // los frentes de los cuartos cerrados: tapan en tercera persona
    for (const f of this.fachadas) {
      if (f.revelada < 1 && this.visto === f.plano && this.gx > f.desde + 30) f.revelada = 1;
      else if (f.abre() || (f.revelada > 0 && f.revelada < 1)) f.revelada = Math.min(1, f.revelada + 1 / 45);
      f.carta.visible = (1 - f.revelada) * (1 - cercaB);
    }
    // en primera persona los biombos se apagan: queda solo quien habla
    for (const b of this.biombos) b.visible = 1 - cercaB;

    const rotCam = -this.phi + this.vuelta;
    const visA = this.pesoA, visC = 1 - this.pesoA;
    for (const c of this.cartas) c.actualizar(this.phi, rotCam, cam.position, visA, visC);
    this.dibujarHalo(rotCam);
  }

  private dibujarHalo(rotCam: number) {
    const f = this.aura.fuerza;
    const recuerdo = this.pesoA < 0.5;
    const enB = Math.abs(this.phi - Math.PI / 2) < 0.5;
    this.haloMesh.visible = (f > 0.02 || this.aura.ondas.length > 0) && !enB;
    if (!this.haloMesh.visible) return;
    const c = this.haloCanvas.getContext('2d')!;
    c.clearRect(0, 0, 256, 256);
    const col = recuerdo ? '150,98,48' : RGB.calida;
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, `rgba(${col},${(recuerdo ? 0.3 : 0.5) * f})`);
    g.addColorStop(0.35, `rgba(${col},${(recuerdo ? 0.12 : 0.16) * f})`);
    g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    const R = Math.max(1, this.aura.r * 1.3);
    for (const o of this.aura.ondas) {
      c.strokeStyle = `rgba(${col},${Math.min(1, o.a * 1.6)})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(128, 128, Math.min(126, (o.r / R) * 128), 0, Math.PI * 2); c.stroke();
    }
    this.haloTex.needsUpdate = true;
    this.haloMat.blending = recuerdo ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.haloMesh.position.set(this.gx + this.dir * 6, this.lado === 'A' ? 120 : 85, recuerdo ? 8 : -8);
    this.haloMesh.rotation.set(0, rotCam, 0);
    const k = (R * 2) / 600;
    this.haloMesh.scale.set(k, k, 1);
  }

  // ------------------------------------------------------------------ dibujo 2D

  tres() { return { escena: this.escena, camara: this.camara }; }

  dibujar(_mundo: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    const t = this.t;
    const libre = this.fase === 'libre';
    const recuerdo = this.lado === 'C';
    this.dibujarMotas(capa);

    if (libre && !recuerdo && !this.piano.resuelto && Math.abs(this.gx - X.piano) < 800) this.dibujarPiano(capa);
    // las luces apagadas: una onda fria encima (se les puede cantar)
    if (libre && !recuerdo) {
      for (const l of this.lamparas) {
        if (l.encendida || l.sprite === 'tele') continue;
        const d = Math.abs(this.gx - l.x);
        if (d > 700) continue;
        const p = this.pantalla(l.x, l.alto + 70, l.z);
        if (d < 420) l.frase.dibujar(capa, p.x, p.y, 40, t, { recuerdo: false, tuya: this.tarareo });
        else glifoOnda(capa, p.x, p.y, 0.75 * clamp(1 - d / 700), t, false);
      }
    }

    // --- el cartel de enfrentar ---
    const b = this.bisagraCerca();
    if (libre && b) {
      const p = this.pantalla(b.x(), b.plano === 'A' ? 300 : 260, 0);
      glifoArriba(capa, p.x, p.y, 0.55 + 0.35 * Math.sin(t * 3), t, recuerdo);
    }
    // --- tararear: cuando se esta perdiendo, o cuando ellas no la dejan acercarse ---
    if (this.fase === 'llamado' || (libre && this.pideTarareo())) {
      const p = this.pantalla(this.gx, recuerdo ? 180 : 250, 0);
      const a = this.fase === 'llamado' ? clamp(this.msFase / 900) * (1 - this.aura.fuerza) : clamp((this.msQuieta - 1200) / 800 + (this.cordura < 0.4 ? 1 : 0)) * (1 - this.aura.fuerza);
      glifoTarareo(capa, p.x, p.y, a, t);
    }
    if (libre && !this.movido) {
      const p = this.pantalla(this.gx + 110, 80, 0);
      glifoFlecha(capa, p.x, p.y, clamp(this.msFase / 800), t);
    }
    if (this.fase === 'umbral' && this.msFase < 9000 && !this.caminando) {
      capa.save(); capa.translate(W / 2, H - 150); capa.rotate(-Math.PI / 2);
      glifoFlecha(capa, 0, 0, clamp(this.msFase / 1500) * 0.7, t);
      capa.restore();
    }

    // --- rebobinando: dos triangulos hacia atras ---
    if (this.rebobinado && this.rebobinado.etapa === 'arrastre') {
      capa.save();
      capa.globalAlpha = 0.55 + 0.3 * Math.sin(t * 12);
      capa.fillStyle = C.hueso;
      for (const dx of [0, 22]) { capa.beginPath(); capa.moveTo(70 + dx, 60); capa.lineTo(92 + dx, 46); capa.lineTo(92 + dx, 74); capa.closePath(); capa.fill(); }
      capa.restore();
    }

    // --- lo que se escurre de ellas a la nena ---
    this.dibujarTraspasos(capa);
    this.dibujarAncla(capa);

    // --- callarse: un anillo que se llena mientras no canta ---
    if (this.fase === 'callar') {
      const cx = W / 2, cy = H - 110;
      capa.save();
      capa.strokeStyle = `rgba(${RGB.hueso},0.25)`; capa.lineWidth = 2;
      capa.beginPath(); capa.arc(cx, cy, 26, 0, Math.PI * 2); capa.stroke();
      capa.strokeStyle = `rgba(${RGB.hueso},0.9)`; capa.lineWidth = 3;
      capa.beginPath(); capa.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.silencio); capa.stroke();
      capa.strokeStyle = `rgba(${RGB.hueso},0.8)`; capa.lineWidth = 2.2; capa.lineCap = 'round';
      capa.beginPath(); capa.moveTo(cx - 9, cy); capa.lineTo(cx + 9, cy); capa.stroke();
      capa.restore();
    }

    // --- lo que piensa Josefina ---
    this.dibujarPensamiento(capa);

    this.dialogo.dibujar(capa, this.hayMic, this.tarareo);
  }

  /** La melodia del piano, flotando encima: sus notas como puntos. */
  private dibujarPiano(c: CanvasRenderingContext2D) {
    const p = this.pantalla(X.piano, 300, -60);
    const d = Math.abs(this.gx - X.piano);
    const a = clamp(1 - (d - 300) / 500);
    if (d < 420) this.pianoFrase.dibujar(c, p.x, p.y, 120, this.t, { recuerdo: false, tuya: this.tarareo, alpha: a });
    else glifoOnda(c, p.x, p.y, 0.7 * a, this.t, false);
  }

  /** El objeto, como silueta con un borde de luz (calida en el recuerdo, fria en el presente). */
  private objetoAncla(c: CanvasRenderingContext2D, fig: IdFig, tam: number) {
    const recuerdo = this.pesoA < 0.5;
    c.save();
    c.filter = `brightness(0) drop-shadow(0 0 10px ${recuerdo ? 'rgba(255,236,190,0.95)' : 'rgba(170,196,222,0.95)'})`;
    pintar(c, OBJETO[fig], 0, -tam / 2, -tam / 2, tam, tam);
    c.restore();
  }

  /** Lo que da una de ellas: el objeto sale de ella y viene hasta el centro, donde queda como ancla. */
  private dibujarTraspasos(c: CanvasRenderingContext2D) {
    if (this.ancla) return;
    for (const tr of this.traspasos) {
      const u = clamp(tr.t / 1.6);
      const e = suave(0, 1, u);
      const x = W / 2, y = lerp(H * 0.34, H * 0.44, e) - Math.sin(Math.PI * e) * 30;
      c.save();
      c.globalAlpha = clamp(u * 3) * (this.ancla ? 1 : 1 - suave(0.8, 1, tr.t / 2.6));
      c.translate(x, y);
      c.rotate(Math.sin(this.t * 2) * 0.1);
      this.objetoAncla(c, tr.fig, lerp(90, 200, e));
      c.restore();
    }
  }

  /** El cruce de plano, con el objeto de ella como ancla. */
  private dibujarAncla(c: CanvasRenderingContext2D) {
    const an = this.ancla;
    if (!an) return;
    const u = clamp(an.t / an.dur);
    if (an.fig === 'mariela') this.anclaEspejo(c, u);
    else if (an.fig === 'madre') this.anclaLlave(c, u);
    else this.anclaRosario(c, u);
  }

  /** El espejo en el piso: la camara baja y en el reflejo, en vez de ella, hay algo. Se inquieta; el espejo sale de cuadro. */
  private anclaEspejo(c: CanvasRenderingContext2D, u: number) {
    const entra = suave(0.06, 0.24, u), sale = suave(0.56, 0.72, u);
    if (entra <= 0 || sale >= 1) return;
    const cx = W / 2 + sale * 780, cy = lerp(H + 180, H * 0.52, entra) + sale * 180;
    const rx = 170, ry = 120;
    c.save();
    c.translate(cx, cy);
    c.rotate(-0.12 + sale * 0.7);
    // el marco y el mango
    c.fillStyle = '#1c150e';
    c.fillRect(rx * 0.75, -16, rx * 0.9, 32);
    c.beginPath(); c.ellipse(0, 0, rx + 18, ry + 14, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.clip();
    const g = c.createLinearGradient(-rx, -ry, rx, ry);
    g.addColorStop(0, '#a9b6bf'); g.addColorStop(1, '#4e5a63');
    c.fillStyle = g; c.fillRect(-rx, -ry, rx * 2, ry * 2);
    // en el reflejo no esta ella: esta lo de Mariela (lo de abajo de la cama), que se arrastra hacia el vidrio
    const cerca = suave(0.16, 0.5, u);
    const bt = lerp(ry * 2.0, ry * 3.6, cerca);
    const ox = lerp(-rx * 0.9, 0, suave(0.16, 0.42, u)) + Math.sin(this.t * 0.9) * 8;
    const oy = (1 - cerca) * 30 + Math.sin(this.t * 1.4) * 4 * (1 + cerca);
    c.save();
    c.filter = 'contrast(1.4) drop-shadow(0 0 5px rgba(225,235,245,0.85))';
    pintar(c, 'miedo_mariela', cuadroEn('miedo_mariela', this.t), ox - bt * 0.5, oy - bt * 0.62, bt, bt);
    c.restore();
    c.globalAlpha = 0.3;
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(-rx * 0.7, -ry * 0.9); c.lineTo(-rx * 0.35, -ry * 0.9); c.lineTo(-rx * 0.9, ry * 0.5); c.lineTo(-rx * 1.1, ry * 0.2); c.fill();
    c.restore();
    c.restore();
  }

  /** La llave: espia por la cerradura; algo cruza, un ojo mira. Vuelve a pararse, la llave gira y la puerta (la de verdad) se abre. */
  private anclaLlave(c: CanvasRenderingContext2D, u: number) {
    const cx = W / 2, cy = H * 0.46;
    // la cerradura: todo negro menos el ojo
    const ojo = suave(0.1, 0.22, u) * (1 - suave(0.47, 0.56, u));
    // del otro lado de la cerradura (se dibuja antes del negro: solo se ve por el ojo)
    if (ojo > 0.01) {
      // una figura larga y chorreante cruza la habitacion
      const pasa = clamp((u - 0.22) / 0.16);
      if (pasa > 0 && pasa < 1) {
        const tam = 420;
        c.save();
        c.filter = 'brightness(0)';
        c.globalAlpha = Math.sin(Math.PI * pasa);
        pintar(c, 'miedo_madre', cuadroEn('miedo_madre', this.t), lerp(cx - 420, cx + 200, pasa), cy - tam * 0.62, tam, tam, false);
        c.restore();
      }
      // y despues, un ojo del otro lado mira de vuelta
      const mira = suave(0.4, 0.43, u) * (1 - suave(0.5, 0.54, u));
      if (mira > 0.01) {
        c.save();
        c.globalAlpha = mira;
        c.fillStyle = '#1a120a'; c.fillRect(cx - 120, cy - 180, 240, 360);
        c.fillStyle = '#efe6d2';
        c.beginPath(); c.ellipse(cx, cy - 88, 62, 34, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#2a1c10';
        c.beginPath(); c.arc(cx + Math.sin(this.t * 3) * 6, cy - 88, 22, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#000';
        c.beginPath(); c.arc(cx + Math.sin(this.t * 3) * 6, cy - 88, 10, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    if (ojo > 0.01) {
      c.save();
      c.globalAlpha = ojo;
      c.fillStyle = '#000';
      c.beginPath();
      c.rect(0, 0, W, H);
      const k = 2.2;
      // el ojo de la cerradura, como un solo contorno: el circulo de arriba y el trapecio de abajo
      const cyc = cy - 40 * k, r = 34 * k, dy = Math.sqrt(34 * 34 - 18 * 18) * k;
      c.moveTo(cx - 34 * k, cy + 70 * k);
      c.lineTo(cx - 18 * k, cyc + dy);
      c.arc(cx, cyc, r, Math.atan2(dy, -18 * k), Math.atan2(dy, 18 * k), false);
      c.lineTo(cx + 34 * k, cy + 70 * k);
      c.closePath();
      c.fill('evenodd');
      c.restore();
    }
    // la llave: ya parada frente a la puerta, entra en la cerradura y gira
    const llave = suave(0.52, 0.57, u) * (1 - suave(0.66, 0.71, u));
    if (llave > 0.01) {
      c.save();
      c.globalAlpha = llave;
      c.translate(cx + 90, lerp(H + 120, cy + 60, suave(0.52, 0.57, u)));
      c.rotate(-Math.PI / 2 + suave(0.57, 0.63, u) * Math.PI);
      this.objetoAncla(c, 'madre', 150);
      c.restore();
    }
  }

  /** El rosario baja colgado; la camara sube por el hilo... y lo sostiene una de las cosas. Salta al otro plano. */
  private anclaRosario(c: CanvasRenderingContext2D, u: number) {
    const cx = W / 2 + Math.sin(this.t * 2.2) * 30 * (1 - suave(0.5, 0.56, u));
    const baja = suave(0.02, 0.4, u);
    const sale = suave(0.8, 0.95, u);
    const ry = lerp(-160, H * 0.5, baja) + sale * (H * 0.7);
    // lo que lo sostiene: aparece arriba, enorme, con ojos
    const bicho = suave(0.44, 0.52, u) * (1 - suave(0.76, 0.86, u));
    if (bicho > 0.01) {
      const id = 'miedo_abuela';
      const tam = 560;
      c.save();
      c.globalAlpha = bicho;
      c.filter = 'brightness(0) drop-shadow(0 0 16px rgba(170,196,222,0.9))';
      pintar(c, id, cuadroEn(id, this.t), cx - tam / 2, lerp(-tam, -tam * 0.35, bicho), tam, tam, true);
      c.filter = 'none';
      c.fillStyle = '#f2ecdf';
      for (const dx of [-38, 38]) { c.beginPath(); c.arc(cx + dx, lerp(-tam * 0.4, tam * 0.2, bicho), 9, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    // el hilo y el rosario
    const a = suave(0.02, 0.1, u) * (1 - sale);
    if (a > 0.01) {
      c.save();
      c.globalAlpha = a;
      c.strokeStyle = this.pesoA < 0.5 ? 'rgba(60,40,20,0.8)' : 'rgba(200,214,228,0.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx, -10); c.lineTo(cx, ry - 80); c.stroke();
      c.translate(cx, ry);
      c.rotate(Math.sin(this.t * (u > 0.5 && u < 0.8 ? 14 : 2.2)) * (u > 0.5 && u < 0.8 ? 0.5 : 0.15));
      this.objetoAncla(c, 'abuela', 200);
      c.restore();
    }
  }

  /** Un pensamiento de Josefina, como subtitulo en cursiva, que se escribe y se va. */
  private pensar(clave: string) {
    if (this.pensado.has(clave) || !PIENSA[clave]) return;
    this.pensado.add(clave);
    this.pensamientos.push({ texto: PIENSA[clave], t: 0 });
  }

  private dibujarPensamiento(c: CanvasRenderingContext2D) {
    const p = this.pensamientos[0];
    if (!p || this.dialogo.activo) return;
    const dur = 2.2 + p.texto.length * 0.06;
    const a = clamp(p.t / 0.4) * (1 - clamp((p.t - dur + 0.6) / 0.6));
    const letras = Math.floor(p.t * 34);
    const recuerdo = this.pesoA < 0.5;
    c.save();
    c.globalAlpha = a;
    c.font = `italic 23px Georgia, serif`;
    c.textAlign = 'center';
    c.shadowColor = recuerdo ? 'rgba(255,248,230,0.9)' : 'rgba(0,0,0,0.9)'; c.shadowBlur = 12;
    c.fillStyle = recuerdo ? '#2d2012' : C.hueso;
    c.fillText(p.texto.slice(0, letras), W / 2, H - 64);
    c.restore();
  }

  /** Polvo de la siesta en el recuerdo; ceniza en el presente cuando se pierde la calma. */
  private dibujarMotas(c: CanvasRenderingContext2D) {
    if (this.fase === 'dialogo' || this.enFinal) return;
    const rec = 1 - this.pesoA;
    const a = rec > 0.5 ? 0.35 * rec : (1 - this.cordura) * 0.5 * this.pesoA;
    if (a < 0.02) return;
    c.save();
    for (const m of this.motas) {
      m.y += (rec > 0.5 ? -m.v * 0.3 : m.v) * 0.016;
      m.x += Math.sin(this.t * 0.5 + m.r * 7) * 0.2;
      if (m.y > H) m.y = 0; if (m.y < 0) m.y = H;
      c.globalAlpha = a * (0.4 + 0.6 * Math.sin(this.t + m.r * 11) ** 2);
      c.fillStyle = rec > 0.5 ? '#fff4d6' : '#0a0c0f';
      c.beginPath(); c.arc(m.x, m.y, m.r * (rec > 0.5 ? 1 : 1.8), 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  private pideTarareo() {
    if (this.lado !== 'A') return false;
    if (this.cordura < 0.45) return true;
    for (const id of FIGS) if (Math.abs(this.gx - EN_AHORA[id]) < 460 && this.cordura < 0.65) return true;
    return false;
  }

  private pantalla(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(this.camara);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
  }

  post(): Partial<EstadoPost> {
    const girando = this.giro ? Math.sin(clamp(this.giro.t / this.giro.dur) * Math.PI) : 0;
    const presente = this.lado === 'A' && !this.enPrimeraPersona;
    let fundido = 0;
    if (this.fase === 'despertar') fundido = 1 - clamp(this.msFase / 1800) * 0.6;
    else if (this.fase === 'llamado') fundido = 0.4 * (1 - clamp(this.msFase / 1500));
    else if (this.fase === 'ahogo') fundido = 0;
    else if (this.fase === 'hundir') fundido = 0;
    else if (this.fase === 'caida') fundido = suave(5200, 6500, this.msFase);
    let pantano = presente ? this.pantano() : 0;
    if (this.fase === 'ahogo') {
      const rb = this.rebobinado;
      pantano = !rb ? 0 : rb.etapa === 'entra' || rb.etapa === 'vuelta' ? suave(0, 900, this.msFase) * 0.42 : rb.etapa === 'arrastre' ? lerp(0.42, 0.05, clamp(rb.t / rb.dur)) : 0;
    }
    if (this.fase === 'caida') pantano = suave(1200, 5500, this.msFase) * 1.5;
    if (this.fase === 'umbral' && this.planoFinal === 'A') pantano = 0.12;
    if (this.fase === 'callar') pantano = Math.sin(Math.PI * this.silencio) * 0.9;
    return {
      miedo: presente ? 0.1 + (1 - this.cordura) * 0.75 : this.fase === 'caida' ? 0.6 : this.lado === 'C' ? 0.05 : 0.15,
      polar: 0,
      giro: 0,
      flash: this.fase === 'hundir' ? Math.max(this.flash, suave(600, 2000, this.msFase)) : Math.max(this.flash, this.flashAncla()),
      temblor: girando * 0.15 + (this.dialogo.gritando ? 0.8 : 0) + (this.embestida >= 0 ? 0.5 : 0) + (this.rebobinado?.etapa === 'vuelta' ? 1.2 : this.fase === 'ahogo' ? 0.3 : 0),
      fundido,
      recuerdo: 1 - this.pesoA,
      pantano,
      desgarro: this.fase === 'desgarro' ? suave(300, 2800, this.msFase) : 0,
      rebobinar: this.rebobinado && this.rebobinado.etapa === 'arrastre' ? 1 - suave(0.85, 1, this.rebobinado.t / this.rebobinado.dur) : 0,
    };
  }

  /** Los destellos de las animaciones de cruce: el susto del rosario (con estroboscopio). */
  private flashAncla() {
    const an = this.ancla;
    if (!an || an.fig !== 'abuela') return 0;
    const u = an.t / an.dur;
    const susto = suave(0.46, 0.48, u) * (1 - suave(0.48, 0.56, u)) * 0.7;
    const estrobo = u > 0.56 && u < 0.74 ? (Math.sin(this.t * 40) > 0.6 ? 0.45 : 0) : 0;
    return Math.max(susto, estrobo);
  }

  sonido() {
    const presente = this.lado === 'A' && !this.enPrimeraPersona;
    let cercano = 0;
    for (const p of this.perseguidores) if (p.activo) cercano = Math.max(cercano, p.vis * clamp(1 - Math.abs(p.x - this.gx) / 600));
    return {
      miedo: presente ? (1 - this.cordura) * 0.8 : this.fase === 'caida' ? 0.6 : 0.1,
      halo: this.aura.fuerza * 0.9,
      susurros: presente ? clamp(cercano + (0.5 - this.cordura)) : this.fase === 'callar' ? Math.sin(Math.PI * this.silencio) : this.fase === 'encuentro' ? 0.15 : 0,
      latido: this.fase === 'callar' ? 0.5 + this.silencio * 0.5 : this.lado === 'C' ? 0.12 : this.fase === 'umbral' || this.fase === 'encuentro' ? 0.7 : 0.35 + (1 - this.cordura) * 0.65,
    };
  }
}

function mezclar(a: { x: number; y: number; z: number; fov: number }, b: typeof a, u: number) {
  const e = u * u * (3 - 2 * u);
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: lerp(a.z, b.z, e), fov: lerp(a.fov, b.fov, e) };
}

function mezclaColor(a: string, b: string, u: number) {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`;
}

/** Flecha hacia arriba: enfrentar. */
function glifoArriba(c: CanvasRenderingContext2D, x: number, y: number, a: number, t: number, recuerdo: boolean) {
  const d = Math.sin(t * 3) * 4;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = recuerdo ? '#3b2a18' : C.hueso;
  c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y + 14 - d); c.lineTo(x, y - 14 - d); c.moveTo(x - 8, y - 6 - d); c.lineTo(x, y - 14 - d); c.lineTo(x + 8, y - 6 - d); c.stroke();
  c.beginPath(); c.arc(x, y - d, 22, 0, Math.PI * 2); c.globalAlpha = a * 0.35; c.stroke();
  c.restore();
}
