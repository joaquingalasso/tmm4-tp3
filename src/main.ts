import '@fontsource/gloock';
import { H, RES, W, clamp } from './config';
import { Motor, type EstadoPost } from './tres/motor';
import { Sonido } from './sonido';
import { Teclado } from './teclado';
import { Ventana } from './ventana';
import { Voz } from './voz';
import type { Contexto, Escena, NombreEscena } from './escenas/escena';
import { partida } from './escenas/escena';
import { Escenario } from './escenas/escenario';
import { Prologo } from './escenas/prologo';
import { Final } from './escenas/final';
import { idVoz } from './dialogo';
import { todosLosGuiones } from './guiones';
import { SONIDOS } from './sonidos/catalogo';
import { cargarSonidos, cuantosSonidos } from './sonidos/archivos';
import { cargarHojas, cuantasReales } from './sprites/hojas';
import { Titulo } from './escenas/titulo';

/**
 * AUDERE — TP Final TDMM4, Grupo 11.
 * Inspirado en «El aljibe», de Mariana Enriquez.
 */

function lienzo() {
  const c = document.createElement('canvas');
  c.width = W * RES; c.height = H * RES;
  const ctx = c.getContext('2d')!;
  ctx.scale(RES, RES);
  return { c, ctx };
}
const mundo = lienzo();
const capa = lienzo();
const pantalla = document.getElementById('pantalla') as HTMLCanvasElement;
const motor = new Motor(pantalla, mundo.c, capa.c);

const audio = new AudioContext();
const x: Contexto = { tec: new Teclado(), voz: new Voz(audio), son: new Sonido(audio), ventana: new Ventana() };

let escenario!: Escenario;
let escenas!: Record<NombreEscena, Escena>;
let actual: NombreEscena = 'titulo';
let proxima: NombreEscena | null = null;
let fundido = 1;
let t = 0;
/** Cuando se prueba desde la consola con simular(), el teclado no pisa la simulacion. */
let simulado = false;

/** Primero las imagenes (las del equipo o, si faltan, los placeholders); despues el teatro. */
async function arrancar() {
  // imagenes y sonidos: los del equipo o, si faltan, los provisorios / sintetizados
  const voces = todosLosGuiones().flatMap((g) => Object.keys(g.nodos).map((n) => ({ id: idVoz(g.id, n), ruta: `sonidos/voces/${g.id}_${n}` })));
  await Promise.all([cargarHojas(), cargarSonidos(audio, [...SONIDOS.map(({ id, ruta }) => ({ id, ruta })), ...voces])]);
  escenario = new Escenario();
  escenas = { titulo: new Titulo(), prologo: new Prologo(), escenario, final: new Final() };
  escenas.titulo.alEntrar(x);
  // Para el grupo: ?escena=prologo o ?escena=escenario arrancan directo ahi.
  const pedida = new URLSearchParams(location.search).get('escena');
  if (pedida === 'escenario' || pedida === 'prologo' || pedida === 'final') {
    x.son.iniciar();
    actual = pedida;
    escenas[pedida].alEntrar(x);
  }
  await document.fonts.load('40px Gloock').catch(() => undefined);
  requestAnimationFrame(cuadro);
}

function ir(n: NombreEscena) { actual = n; escenas[n].alEntrar(x); }

function actualizar(dtMs: number) {
  t += dtMs / 1000;
  const e = escenas[actual];
  if (!simulado) {
    x.voz.respaldoTarareo = x.tec.abajo('Space');
    x.voz.respaldoGrito = x.tec.abajo('Enter') && actual === 'escenario' && escenario.quiereGrito;
  }
  if (x.tec.abajo('BracketRight')) x.voz.respaldoNota = Math.min(7, x.voz.respaldoNota + dtMs / 250);
  if (x.tec.abajo('BracketLeft')) x.voz.respaldoNota = Math.max(-7, x.voz.respaldoNota - dtMs / 250);
  x.voz.actualizar(dtMs);

  if (proxima) {
    fundido = Math.min(1, fundido + dtMs / 900);
    if (fundido >= 1) { ir(proxima); proxima = null; }
  } else {
    fundido = Math.max(0, fundido - dtMs / 1100);
    e.actualizar(dtMs, x);
    if (e.siguiente) {
      // los finales ya terminan en blanco o en negro por su cuenta: corte directo, sin fundido
      if (e.siguiente === 'final') { ir('final'); fundido = 0; }
      else proxima = e.siguiente;
      e.siguiente = null;
    }
  }
  x.son.actualizar({ ...escenas[actual].sonido(), banco: x.voz.banco });
  x.tec.finFrame();
}

function dibujar() {
  const e = escenas[actual];
  mundo.ctx.clearRect(0, 0, W, H);
  capa.ctx.clearRect(0, 0, W, H);
  e.dibujar(mundo.ctx, capa.ctx);
  const p: Partial<EstadoPost> = e.post();
  const marco = 1;
  motor.dibujar(e.tres ? e.tres() : null, {
    t,
    miedo: p.miedo ?? 0,
    polar: p.polar ?? 0,
    giro: p.giro ?? 0,
    marco,
    centroMarco: p.centroMarco ?? [0.5, 0.52],
    flash: p.flash ?? 0,
    fundido: clamp(Math.max(fundido, p.fundido ?? 0)),
    temblor: p.temblor ?? 0,
    recuerdo: p.recuerdo ?? 0,
    pantano: p.pantano ?? 0,
    desgarro: p.desgarro ?? 0,
    rebobinar: p.rebobinar ?? 0,
  });
}

let ultimo = performance.now();
function cuadro(ahora: number) {
  const dt = Math.min(50, ahora - ultimo);
  ultimo = ahora;
  if (!hook.pausado) { actualizar(dt); dibujar(); }
  requestAnimationFrame(cuadro);
}
void arrancar();

// ----------------------------------------------------------------- debug (F1)

const panel = document.getElementById('debug') as HTMLPreElement;
window.addEventListener('keydown', (ev) => { if (ev.code === 'F1') { ev.preventDefault(); panel.hidden = !panel.hidden; } });
setInterval(() => {
  if (panel.hidden || !escenario) return;
  const v = x.voz;
  const b = (val: number, max: number) => '█'.repeat(Math.round(clamp(val / max) * 28)).padEnd(28, '·');
  panel.textContent = [
    `escena     ${actual}   carga ${partida.carga}   imágenes del equipo ${cuantasReales().reales}/${cuantasReales().total}   sonidos del equipo ${cuantosSonidos()}`,
    `micrófono  ${v.disponible ? 'ok' : v.error || 'sin permiso'}   ventana ${x.ventana.escritorio ? 'escritorio' : 'navegador'}`,
    `nivel      ${b(v.nivel, v.umbral * 5)} ${v.nivel.toFixed(4)}  (umbral ${v.umbral.toFixed(4)})`,
    `claridad   ${b(v.claridad, 1)} ${v.claridad.toFixed(2)}`,
    `altura     ${v.f.toFixed(0)} Hz   nota ${v.nota.toFixed(1)}   base ${v.base.toFixed(1)}${v.baseMedida ? ' ✓' : ''}`,
    `estado     ${v.estado.padEnd(9)} ${Math.round(v.msTarareo)} ms   fuerza ${v.fuerza.toFixed(2)}   grito ${v.grito.toFixed(2)}`,
    `calma      ${b(escenario.cordura, 1)} ${escenario.cordura.toFixed(2)}`,
    '',
    'sin micrófono: ESPACIO tararea, [ ] cambian la nota, ENTER grita (al final)',
  ].join('\n');
}, 100);

// ----------------------------------------------------------------- pruebas

const hook = {
  /** para capturar un cuadro quieto desde la consola */
  pausado: false,
  get escena() { return actual; },
  get e() { return escenas[actual]; },
  x, partida, escenas,
  simular(estado: 'silencio' | 'tarareo' | 'grito', nota = 0) { simulado = estado !== 'silencio'; x.voz.simular(estado, nota); },
  ir: (n: NombreEscena) => { proxima = null; fundido = 0; ir(n); },
  paso(n = 60) { for (let i = 0; i < n; i++) actualizar(16.67); dibujar(); },
  // para probar el recorrido sin jugar
  pulsar(k: string) { x.tec.forzar(k, true); hook.paso(1); x.tec.forzar(k, false); hook.paso(1); },
  caminar(hasta: number, max = 4000) {
    const e = escenas.escenario as unknown as { gx: number; lado: string; fase: string; cordura: number };
    const der = hasta > e.gx;
    const k = (e.lado === 'A') === der ? 'ArrowRight' : 'ArrowLeft';
    x.tec.forzar(k, true);
    let n = 0;
    while ((der ? e.gx < hasta : e.gx > hasta) && n < max && e.fase === 'libre') { hook.paso(5); n++; }
    x.tec.forzar(k, false); hook.paso(2);
    return [Math.round(e.gx), e.fase, +e.cordura.toFixed(2)];
  },
  elegir(...ops: number[]) {
    for (const o of ops) { hook.paso(240); for (let i = 0; i < o; i++) hook.pulsar('ArrowDown'); hook.pulsar('Enter'); }
    hook.paso(200);
    const e = escenas.escenario as unknown as { gx: number; lado: string; fase: string };
    return [e.fase, e.lado, Math.round(e.gx), partida.carga];
  },
};
(window as unknown as Record<string, unknown>).audere = hook;
