import { retrato, type Gesto, type IdRetrato } from '../retratos';
import {
  aljibe, altar, banqueta, cama, cuartoAltar, marcoPuerta, mesaMandarinas, patioSiesta, piano, planta,
  puertaCalle, reflejo, renault, ruta, sillon, telonPresente, telonRecuerdo, tele, velador, ventilador,
} from './escenografia';
import { biombo, frente, perfil, vela, type Anim, type Aspecto } from './pintura';
import { barricada, espejo, llave, paredPresente, paredRecuerdo, porton, puertaCasa, puertaTrabada, ropero, rosario, sombraCuerpo, trastos } from './limites';
import { miedoAgua, miedoCama, miedoTormenta, oscurecer, pantano, sombraSinCara } from './miedos';

/**
 * CATALOGO — todas las imagenes del juego.
 *
 * Es la lista que usan tres cosas a la vez:
 *   - el juego, para saber que PNG cargar y como cortarlo en cuadros;
 *   - exportar.html, para generar los placeholders en public/assets;
 *   - el compendio (public/assets/compendio.html), que es lo que se le manda
 *     al equipo: cada imagen con su tamano, sus cuadros y una nota.
 *
 * Una hoja de sprites es una tira HORIZONTAL de cuadros iguales, de izquierda a
 * derecha. Para reemplazar una imagen alcanza con respetar el tamano del PNG.
 */

export type Grupo = 'personajes' | 'frentes' | 'oscuras' | 'miedos' | 'sombras' | 'retratos' | 'telones' | 'objetos' | 'limites' | 'efectos' | 'prologo';

export interface Recurso {
  id: string;
  archivo: string;
  /** tamano de UN cuadro, en px */
  w: number;
  h: number;
  cuadros: number;
  fps: number;
  grupo: Grupo;
  nota: string;
  dibujar: (c: CanvasRenderingContext2D, cuadro: number, total: number) => void;
}

const R: Recurso[] = [];
function r(id: string, archivo: string, w: number, h: number, cuadros: number, fps: number, grupo: Grupo, nota: string,
           dibujar: Recurso['dibujar']) {
  R.push({ id, archivo, w, h, cuadros, fps, grupo, nota, dibujar });
}

// ---------------------------------------------------------------- aspectos de los personajes

export const ASPECTO: Record<string, Aspecto> = {
  josefina: { epoca: 'presente', alto: 290, cuerpo: 'joven', pose: 'pie', pelo: { color: '#0c0e12', forma: 'largo' }, ropa: '#5e3238', ropa2: '#3b2a2e', largoRopa: 0.4 },
  nina: { epoca: 'recuerdo', alto: 205, cuerpo: 'nina', pose: 'pie', pelo: { color: '#e0c27a', forma: 'rubia' }, ropa: '#f0dc9a', largoRopa: 0.18 },
  mariela: { epoca: 'presente', alto: 400, cuerpo: 'mujer', pose: 'pie', pelo: { color: '#d9b56a', forma: 'melena' }, ropa: '#2c3542', largoRopa: 0.22, prop: 'cigarrillo' },
  mariela_nina: { epoca: 'recuerdo', alto: 250, cuerpo: 'nina', pose: 'sentada', pelo: { color: '#d9b56a', forma: 'rubia' }, ropa: '#c98f6a', largoRopa: 0.2, prop: 'muneca', miedo: true },
  madre: { epoca: 'presente', alto: 420, cuerpo: 'mujer', pose: 'pie', pelo: { color: '#0a0b0e', forma: 'rodete' }, ropa: '#3a4656', largoRopa: 0.34 },
  madre_joven: { epoca: 'recuerdo', alto: 420, cuerpo: 'mujer', pose: 'pie', pelo: { color: '#5a3e22', forma: 'rodete' }, ropa: '#b98a5a', ropa2: '#a8784a', largoRopa: 0.34, prop: 'manos_boca', miedo: true },
  abuela: { epoca: 'presente', alto: 380, cuerpo: 'vieja', pose: 'sentada', pelo: { color: '#232c36', forma: 'panuelo' }, ropa: '#2a2f38', largoRopa: 0.3, prop: 'mandarina' },
  abuela_joven: { epoca: 'recuerdo', alto: 380, cuerpo: 'vieja', pose: 'arrodillada', pelo: { color: '#8a6a44', forma: 'panuelo' }, ropa: '#7a5a3a', largoRopa: 0.3, prop: 'rosario', miedo: true },
  senora: { epoca: 'presente', alto: 380, cuerpo: 'vieja', pose: 'pie', pelo: { color: '#d8d2c6', forma: 'canoso' }, ropa: '#3a2f2a', largoRopa: 0.42, prop: 'rosario' },
};

// ---------------------------------------------------------------- la protagonista

const PROTA_W = 260, PROTA_H = 340;
const animsJosefina: [Anim, number, number, string][] = [
  ['quieta', 4, 4, 'respira quieta'],
  ['camina', 8, 10, 'ciclo de caminata completo'],
  ['tararea', 4, 6, 'tararea con la boca cerrada, la cabeza apenas levantada'],
  ['tiembla', 4, 12, 'tiembla, se abraza'],
  ['cae', 6, 8, 'se cae sentada (el final "no pudo"); el ultimo cuadro queda quieto'],
];
for (const [anim, n, fps, desc] of animsJosefina) {
  r(`josefina_${anim}`, `personajes/josefina_${anim}.png`, PROTA_W, PROTA_H, n, fps, 'personajes',
    `Josefina, en el presente. De perfil mirando a la DERECHA, los pies en el centro de abajo. ${desc}. Las manchas de tinta las agrega el juego encima: dibujarla limpia.`,
    (c, i, t) => perfil(c, PROTA_W, PROTA_H, ASPECTO.josefina, anim, i, t));
}
for (const [anim, n, fps, desc] of [['quieta', 4, 4, 'respira quieta'], ['camina', 8, 10, 'caminata'], ['tararea', 4, 6, 'tararea'], ['duerme', 1, 1, 'dormida, sentada (para el sillon del prologo)']] as [Anim, number, number, string][]) {
  r(`nina_${anim}`, `personajes/nina_${anim}.png`, PROTA_W, PROTA_H, n, fps, 'personajes',
    `Josefina a los seis anos, en el recuerdo: rubia, vestido claro. De perfil mirando a la DERECHA. ${desc}.`,
    (c, i, t) => perfil(c, PROTA_W, PROTA_H, ASPECTO.nina, anim, i, t));
}

// ---------------------------------------------------------------- las figuras

const FIG_W = 420, FIG_H = 480;
const FIGURAS: [string, string][] = [
  ['mariela', 'Mariela hoy: linda, suelta, fumando en la puerta antes de salir.'],
  ['mariela_nina', 'Mariela a los ocho, en el recuerdo: sentada, abraza un muneco de ojos que brillan. Tiene miedo.'],
  ['madre', 'La madre hoy: calma, planea vacaciones. Anteojos oscuros.'],
  ['madre_joven', 'La madre en el recuerdo: las manos en la boca, asustada.'],
  ['abuela', 'La abuela hoy: sentada, pela una mandarina.'],
  ['abuela_joven', 'La abuela en el recuerdo: de rodillas, reza con el rosario para que pare la tormenta.'],
  ['senora', 'La Senora, veinte anos despues: vieja, el pelo gris revuelto, rosarios.'],
];
for (const [id, nota] of FIGURAS) {
  const a = ASPECTO[id];
  r(`${id}`, `personajes/${id}.png`, FIG_W, FIG_H, 4, a.miedo ? 10 : 3, 'personajes',
    `${nota} De perfil mirando a la IZQUIERDA (hacia donde viene la protagonista). Loop de 4 cuadros.`,
    (c, i, t) => { c.save(); c.translate(FIG_W, 0); c.scale(-1, 1); perfil(c, FIG_W, FIG_H, a, a.miedo ? 'tiembla' : 'quieta', i, t); c.restore(); });
  r(`${id}_frente`, `frentes/${id}_frente.png`, FIG_W, FIG_H, 4, a.miedo ? 10 : 3, 'frentes',
    `${nota} DE FRENTE, mirando a la camara: es como se la ve en primera persona, cuando se habla con ella.`,
    (c, i, t) => frente(c, FIG_W, FIG_H, a, i, t));
}

// ella misma, de frente: la que aparece del otro lado del aljibe al final
r('josefina_frente', 'frentes/josefina_frente.png', FIG_W, FIG_H, 4, 3, 'frentes',
  'Josefina grande, DE FRENTE, mirando a cámara: es la que aparece del otro lado del aljibe si se llega desde el recuerdo. Mismo tamaño de cuadro que las figuras.',
  (c, i, t) => frente(c, FIG_W, FIG_H, { ...ASPECTO.josefina, alto: 398 }, i, t));
r('nina_frente', 'frentes/nina_frente.png', FIG_W, FIG_H, 4, 3, 'frentes',
  'Josefina nena, DE FRENTE, mirando a cámara: la que aparece del otro lado del aljibe si se llega desde el presente.',
  (c, i, t) => frente(c, FIG_W, FIG_H, { ...ASPECTO.nina, alto: 280 }, i, t));

// ---------------------------------------------------------------- versiones oscuras

for (const [id, nota] of [
  ['mariela', 'Mariela'], ['madre', 'La madre'], ['abuela', 'La abuela'],
] as const) {
  const a = ASPECTO[id];
  r(`${id}_oscura`, `oscuras/${id}_oscura.png`, FIG_W, FIG_H, 4, 6, 'oscuras',
    `${nota} hoy, vista por Josefina cuando pierde la calma: la misma pose y el mismo encuadre que ${id}.png, pero monstruosa (negra, estirada, ojos de más, dedos larguísimos). Mirando a la IZQUIERDA. El juego funde una en la otra.`,
    (c, i, t) => oscurecer(c, FIG_W, FIG_H, i, t, (k) => { k.save(); k.translate(FIG_W, 0); k.scale(-1, 1); perfil(k, FIG_W, FIG_H, a, 'quieta', i, t); k.restore(); }));
  r(`${id}_oscura_frente`, `oscuras/${id}_oscura_frente.png`, FIG_W, FIG_H, 4, 6, 'oscuras',
    `${nota} monstruosa, DE FRENTE (primera persona, cuando se habla con ella sin estar tranquila).`,
    (c, i, t) => oscurecer(c, FIG_W, FIG_H, i, t, (k) => frente(k, FIG_W, FIG_H, a, i, t)));
}

// ---------------------------------------------------------------- lo que la persigue

const MIEDO_W = 360, MIEDO_H = 360;
for (const [id, nota, fn] of [
  ['sombra', 'Una sombra sin cara, humo negro con brazos largos. Es lo que la persigue al principio: ella cree que es suyo.', sombraSinCara],
  ['miedo_mariela', 'Lo de abajo de la cama: una mano enorme que camina con los dedos. Aparece cuando se acepta el miedo de Mariela.', miedoCama],
  ['miedo_madre', 'Una mujer larga y empapada que chorrea agua negra, siempre a punto de caerse. El miedo de la madre.', miedoAgua],
  ['miedo_abuela', 'La tormenta encorvada, con una calavera chiquita con lucecitas en el pecho. El miedo de la abuela.', miedoTormenta],
] as const) {
  r(id, `miedos/${id}.png`, MIEDO_W, MIEDO_H, 6, 8, 'miedos',
    `${nota} Avanza hacia la IZQUIERDA (el juego la espeja cuando viene del otro lado). Loop de 6 cuadros, base en el borde de abajo, fondo transparente.`,
    (c, i, t) => fn(c, MIEDO_W, MIEDO_H, i, t));
}

// ---------------------------------------------------------------- retratos

export const RETRATOS: [IdRetrato, Gesto, boolean][] = [
  ['mariela', 'calma', false], ['mariela', 'triste', false], ['mariela', 'lejos', false],
  ['mariela_nina', 'miedo', true], ['mariela_nina', 'calma', true],
  ['madre', 'calma', false], ['madre', 'lejos', false],
  ['madre_joven', 'miedo', true], ['madre_joven', 'calma', true],
  ['abuela', 'calma', false], ['abuela', 'lejos', false],
  ['abuela_joven', 'miedo', true], ['abuela_joven', 'calma', true],
  ['senora', 'pena', false], ['senora', 'lejos', false],
  ['aljibe', 'lejos', false], ['reflejo', 'calma', true],
  ['nina', 'calma', true], ['nina', 'lejos', true], ['josefina', 'calma', false], ['josefina', 'lejos', false],
];
for (const [id, gesto, recuerdo] of RETRATOS) {
  r(`retrato_${id}_${gesto}`, `retratos/${id}_${gesto}.png`, 368, 368, 1, 0, 'retratos',
    `Retrato para la caja de dialogo: ${id}, gesto "${gesto}". Caricatura, ojos grandes, trazo grueso. ${recuerdo ? 'Paleta sepia (recuerdo).' : 'Paleta fria (presente).'}`,
    (c) => retrato(c, id, gesto, 0, 0, 368, 0.5, recuerdo));
}

// ---------------------------------------------------------------- telones

export const TELON = { ancho: 9500, alto: 2700, base: -900, cx: 3200 };
const TW = 3800, TH = 1080;
const escalaT = TW / TELON.ancho;
r('telon_presente', 'telones/presente.png', TW, TH, 1, 0, 'telones',
  'Telon del PRESENTE, el que se ve de frente. La casa de noche y, a la derecha (desde x=5300 del mundo), el patio de la Senora hoy, descuidado. Cada px equivale a 2.5 unidades del mundo; el piso del escenario queda a 1/3 desde abajo.',
  (c) => {
    const X0 = TELON.cx - TELON.ancho / 2;
    telonPresente(c, { X: (x) => (x - X0) * escalaT, Y: (y) => TH - (y - TELON.base) * escalaT, w: TW, h: TH });
  });
r('telon_recuerdo', 'telones/recuerdo.png', TW, TH, 1, 0, 'telones',
  'Telon del RECUERDO, el que se ve desde atras del escenario (por eso el mundo esta espejado: el comienzo del juego queda a la DERECHA de la imagen). Una siesta en Corrientes, como foto vieja pasada de luz.',
  (c) => {
    const X1 = TELON.cx + TELON.ancho / 2;
    telonRecuerdo(c, { X: (x) => (X1 - x) * escalaT, Y: (y) => TH - (y - TELON.base) * escalaT, w: TW, h: TH });
  });

// ---------------------------------------------------------------- objetos

r('cama', 'objetos/cama.png', 360, 200, 1, 0, 'objetos', 'La cama de Josefina (presente).', (c) => cama(c, 360, 200));
r('velador', 'objetos/velador.png', 88, 220, 2, 4, 'objetos', 'El velador encendido (presente). 2 cuadros de titileo.', (c, i) => velador(c, 88, 220, i));
r('tele', 'objetos/tele.png', 300, 280, 2, 12, 'objetos', 'El televisor prendido con estatica (presente).', (c, i) => tele(c, 300, 280, i));
r('piano', 'objetos/piano.png', 520, 440, 1, 0, 'objetos', 'El piano de la madre, que de noche toca el diablo (presente).', (c) => piano(c, 520, 440));

// ---------------------------------------------------------------- limites: lo que frena es algo material

r('pared_presente', 'limites/pared_presente.png', 512, 512, 1, 0, 'limites', 'El empapelado de la casa (presente). TILEABLE en las dos direcciones: se repite sobre las paredes de verdad, las que cortan el paso y tapan la vista.', (c) => paredPresente(c, 512, 512));
r('pared_recuerdo', 'limites/pared_recuerdo.png', 512, 512, 1, 0, 'limites', 'La pared de cal de la casa de los tíos (recuerdo). TILEABLE en las dos direcciones.', (c) => paredRecuerdo(c, 512, 512));
r('puerta_presente', 'limites/puerta_presente.png', 240, 660, 1, 0, 'limites', 'La hoja de una puerta de la casa, cerrada, de frente (presente). Va encastrada en la pared.', (c) => puertaCasa(c, 240, 660, 'presente'));
r('puerta_recuerdo', 'limites/puerta_recuerdo.png', 240, 660, 1, 0, 'limites', 'La hoja de una puerta de la casa de los tíos, con postigo, cerrada (recuerdo).', (c) => puertaCasa(c, 240, 660, 'recuerdo'));
r('puerta_trabada', 'limites/puerta_trabada.png', 240, 660, 2, 0, 'limites', 'La puerta después del piano: trabada con una silla (cuadro 1) y suelta (cuadro 2). Cuando suena la canción, la hoja gira y se abre.', (c, i) => puertaTrabada(c, 240, 660, i));
r('barricada', 'limites/barricada.png', 400, 440, 1, 0, 'limites', 'Muebles apilados contra una puerta cerrada (colchón, sillas, cajas): se encerró ella misma. Va parado delante de la pared.', (c) => barricada(c, 400, 440));
r('trastos', 'limites/trastos.png', 400, 700, 1, 0, 'limites', 'El fondo del cuarto, al principio del presente: un ropero y cajas apiladas. No se puede ir más atrás.', (c) => trastos(c, 400, 700));
r('ropero', 'limites/ropero.png', 400, 700, 1, 0, 'limites', 'El fondo de la casa de los tíos, al principio del recuerdo: un ropero con espejo y una valija arriba.', (c) => ropero(c, 400, 700));
r('porton', 'limites/porton.png', 500, 560, 2, 0, 'limites', 'El portón del fondo del patio de la Señora: cerrado (cuadro 1) hasta que ella habla con la Señora; después, abierto (cuadro 2) hacia el aljibe.', (c, i) => porton(c, 500, 560, i));

// ---------------------------------------------------------------- sombras: lo que le dieron, como sombra

// lo que cada una le da: el objeto que la condena
for (const [id, nota, fn] of [
  ['espejo', 'El espejito de mano de Mariela: mirarse, ser mirada, quedar linda.', espejo],
  ['llave', 'La llave de la casa, de la madre: cerrar todo, no salir sola.', llave],
  ['rosario', 'El rosario de la abuela: rezar, la culpa, que si el cielo se cae es por una.', rosario],
] as const) {
  r(`objeto_${id}`, `sombras/objeto_${id}.png`, 200, 200, 1, 0, 'sombras',
    `${nota} Es lo que le dan a Josefina: aparece colgado de su sombra (parpadeando) y en el prólogo pasa de la sombra de cada una a la de la nena. El juego lo pinta de negro: tiene que reconocerse solo por la silueta.`,
    (c) => fn(c, 200, 200));
}
for (const [id, pose, pelo, nota] of [
  ['mariela', 'pie', 'melena', 'Mariela'], ['madre', 'manos_boca', 'rodete', 'La madre, con las manos en la boca'],
  ['abuela', 'rezo', 'panuelo', 'La abuela, rezando'], ['senora', 'brazos_arriba', 'canoso', 'La Señora, con los brazos arriba'],
] as const) {
  r(`sombra_${id}`, `sombras/sombra_${id}.png`, 240, 600, 4, 5, 'sombras',
    `${nota}, como sombra larga proyectada en una pared por una luz baja. Se usa en el prólogo (las sombras que se escurren hacia la nena dormida) y en el camino final (las sombras aceptadas caminan junto a Josefina). El juego la pinta de negro. Loop de 4 cuadros (un temblor leve).`,
    (c, i, t) => sombraCuerpo(c, 240, 600, i, t, pose, pelo));
}
r('aljibe_presente', 'objetos/aljibe_presente.png', 520, 640, 1, 0, 'objetos', 'El aljibe hoy: la cal descascarada, el ladrillo rojo a la vista, casi oculto entre pastos.', (c) => aljibe(c, 520, 640, 'presente'));
r('aljibe_recuerdo', 'objetos/aljibe_recuerdo.png', 520, 640, 1, 0, 'objetos', 'El aljibe en el recuerdo: pintado de blanco.', (c) => aljibe(c, 520, 640, 'recuerdo'));
r('altar_presente', 'objetos/altar_presente.png', 480, 800, 2, 2, 'objetos', 'El altar hoy: un San La Muerte enorme, del tamano de un crucifijo de iglesia, con lucecitas de guirnalda navidena en las cuencas (2 cuadros: prendidas/apagadas).', (c, i) => altar(c, 480, 800, i, 'presente'));
r('altar_recuerdo', 'objetos/altar_recuerdo.png', 480, 800, 2, 2, 'objetos', 'El altar en el recuerdo: ofrendas, escarpines, estampitas, rosarios, un San La Muerte chico.', (c, i) => altar(c, 480, 800, i, 'recuerdo'));
r('planta_presente', 'objetos/planta_presente.png', 360, 480, 1, 0, 'objetos', 'Ruda crecida hasta alturas insolitas y rosas muertas (presente).', (c) => planta(c, 360, 480, 'presente', 3));
r('planta_recuerdo', 'objetos/planta_recuerdo.png', 360, 480, 1, 0, 'objetos', 'Plantas del patio, azucenas, ruda (recuerdo).', (c) => planta(c, 360, 480, 'recuerdo', 5));
r('ventilador', 'objetos/ventilador.png', 180, 500, 3, 10, 'objetos', 'Ventilador de pie en la casa de los tios (recuerdo). 3 cuadros girando.', (c, i) => ventilador(c, 180, 500, i));
r('mesa_mandarinas', 'objetos/mesa_mandarinas.png', 360, 220, 1, 0, 'objetos', 'Mesa con mandarinas y cascaras (recuerdo).', (c) => mesaMandarinas(c, 360, 220));
r('banqueta', 'objetos/banqueta.png', 140, 120, 1, 0, 'objetos', 'Banqueta (recuerdo).', (c) => banqueta(c, 140, 120));
r('sillon', 'objetos/sillon.png', 400, 280, 1, 0, 'objetos', 'El sillon de la Senora, donde la nina se durmio (recuerdo).', (c) => sillon(c, 400, 280));

// ---------------------------------------------------------------- efectos

r('biombo', 'efectos/biombo.png', 520, 560, 4, 6, 'efectos', 'Biombo de papel con la sombra enorme de quien tiene miedo, proyectada por la luz de la siesta (recuerdo). Loop de 4 cuadros.', (c, i, t) => biombo(c, 520, 560, i, t, true));
r('biombo_vacio', 'efectos/biombo_vacio.png', 520, 560, 1, 0, 'efectos', 'El mismo biombo, sin sombra: despues de que la nina se llevo el miedo.', (c) => biombo(c, 520, 560, 0, 1, false));
r('pantano', 'efectos/pantano.png', 512, 200, 4, 6, 'efectos', 'El pantano: barro negro que sube desde el piso cuando Josefina no tararea. TILEABLE en horizontal. Loop de 4 cuadros.', (c, i, t) => pantano(c, 512, 200, i, t));
r('vela', 'efectos/vela.png', 48, 100, 2, 8, 'efectos', 'Vela encendida, 2 cuadros.', (c, i) => vela(c, 48, 100, i));

// ---------------------------------------------------------------- prologo

r('pro_ruta', 'prologo/ruta.png', 1920, 540, 1, 0, 'prologo', 'La ruta de noche, viajando a Corrientes. TILEABLE en horizontal (el borde derecho continua en el izquierdo).', (c) => ruta(c, 1920, 540));
r('pro_renault', 'prologo/renault12.png', 600, 260, 2, 8, 'prologo', 'El Renault 12 con la familia: el padre maneja, la madre adelante, atras la abuela, la nena apretada en el medio y la hermana. Mirando a la DERECHA. 2 cuadros de traqueteo.', (c, i) => renault(c, 600, 260, i));
r('pro_patio', 'prologo/patio_siesta.png', 1920, 1080, 1, 0, 'prologo', 'El patio de la Senora a la hora de la siesta, visto de frente.', (c) => patioSiesta(c, 1920, 1080));
r('pro_reflejo', 'prologo/reflejo.png', 720, 720, 4, 4, 'prologo', 'Visto desde arriba, adentro del aljibe: su cara en el agua negra, como una luna con el pelo rubio. SOLO el círculo del agua: afuera del círculo, transparente (el borde del aljibe lo dibuja el juego). 4 cuadros de ondas.', (c, i, t) => reflejo(c, 720, 720, i, t));
r('pro_cuarto', 'prologo/cuarto_altar.png', 1920, 1080, 1, 0, 'prologo', 'El cuarto del altar, en penumbra de siesta.', (c) => cuartoAltar(c, 1920, 1080));

export const CATALOGO: Recurso[] = R;
export const porId = new Map(R.map((x) => [x.id, x]));
