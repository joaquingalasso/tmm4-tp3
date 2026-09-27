import type { Guion } from './dialogo';

/**
 * GUIONES — todo el texto del juego vive aca: en los encuentros de frente.
 *
 * AHORA: ellas estan bien y le tienen miedo a ELLA; la miran como a algo que
 * contagia. Ella cree que lo que tiene es suyo, que es su culpa.
 * ANTES: ellas tienen miedo, y la nena no. La cancion de cuna las calma... y
 * cada vez que la nena se la canta, se lleva lo que les pesaba.
 *
 * Tararear se puede siempre. Si un nodo tiene `tararear`, igualar esa nota
 * lleva a otro nodo (o a un final). Cada guion tiene `id` (para su archivo de
 * voz: sonidos/voces/<id>_<nodo>.mp3) y `voz` (su altura, en semitonos sobre
 * la nota del jugador, para el murmullo cuando no hay voz grabada).
 */

export const NOTAS = { mariela: 0, madre: 3, abuela: -4 };
/** La cancion de cuna, en el piano: las tres notas de ellas. */
export const FRASE = [NOTAS.mariela, NOTAS.madre, NOTAS.abuela];
/** Lo que pide cantar cada una en el recuerdo: frases que van creciendo. */
export const MELODIAS = {
  mariela: [0, 3],
  madre: [3, -4, 0],
  abuela: [-4, 0, 3, 5],
  /** la cancion entera, al final, con ella misma */
  cancion: [0, 3, -4, 0, 5],
};

// ---------------------------------------------------------------- Mariela: el espejito

export const MARIELA_AHORA: Guion = {
  id: 'mariela_ahora', lado: 'A', voz: 2, inicio: 'm1',
  nodos: {
    m1: { quien: 'Mariela', retrato: 'mariela', gesto: 'lejos', texto: '¿Todavía tenés mi espejito? Nunca me lo devolviste.', opciones: [
      { texto: '¿Qué espejito?', ir: 'm2' },
      { texto: '(darse vuelta)', salida: 'volver' },
    ] },
    m2: { quien: 'Mariela', retrato: 'mariela', gesto: 'triste', texto: 'El de aquella siesta. Yo no me podía mirar sin que algo me mirara desde atrás. Vos te lo quedaste.', opciones: [
      { texto: '(acordarse)', salida: 'cruzar' },
      { texto: 'No me acuerdo.', ir: 'm3' },
    ] },
    m3: { quien: 'Mariela', retrato: 'mariela', gesto: 'lejos', texto: 'Mejor. Igual a vos te queda lindo.', opciones: [
      { texto: '(acordarse)', salida: 'cruzar' },
      { texto: '(darse vuelta)', salida: 'volver' },
    ] },
  },
};

export function marielaAntes(calma: boolean): Guion {
  return {
    id: 'mariela_antes', lado: 'C', voz: 7, inicio: calma ? 'n3' : 'n1',
    nodos: {
      n1: { quien: 'Mariela', retrato: 'mariela_nina', gesto: 'miedo', texto: 'No te mires en el espejo de noche. Hay alguien atrás que se peina con tu pelo.', tararear: { notas: MELODIAS.mariela, ir: 'n3' }, opciones: [
        { texto: 'Mostrame.', ir: 'n2' },
        { texto: '(soltarle la mano)', salida: 'cruzar' },
      ] },
      n2: { quien: 'Mariela', retrato: 'mariela_nina', gesto: 'miedo', texto: 'Cantame lo de la abuela y te lo presto.', tararear: { notas: MELODIAS.mariela, ir: 'n3' }, opciones: [
        { texto: '(soltarle la mano)', salida: 'cruzar' },
      ] },
      n3: { quien: 'Mariela', retrato: 'mariela_nina', gesto: 'calma', texto: 'Tomá, quedátelo. Que te mire a vos.', opciones: [], auto: { salida: 'cruzar', traspaso: true } },
    },
  };
}

// ---------------------------------------------------------------- la madre: la llave

export const MADRE_AHORA: Guion = {
  id: 'madre_ahora', lado: 'A', voz: 3, inicio: 'p1',
  nodos: {
    p1: { quien: 'Mamá', retrato: 'madre', gesto: 'lejos', texto: '¿Cerraste con llave? Vos siempre cerrás con llave, Jose. Dos vueltas.', opciones: [
      { texto: 'Vos me diste la llave.', ir: 'p2' },
      { texto: '(darse vuelta)', salida: 'volver' },
    ] },
    p2: { quien: 'Mamá', retrato: 'madre', gesto: 'lejos', texto: 'Yo no te di nada. Nadie te puso nada. Sos así.', opciones: [
      { texto: '(acordarse)', salida: 'cruzar' },
      { texto: '(darse vuelta)', salida: 'volver' },
    ] },
  },
};

export function madreAntes(calma: boolean): Guion {
  return {
    id: 'madre_antes', lado: 'C', voz: 3, inicio: calma ? 'j3' : 'j1',
    nodos: {
      j1: { quien: 'Mamá', retrato: 'madre_joven', gesto: 'miedo', texto: 'No salgas. Una mujer sola afuera no sabe lo que le puede pasar. Hay que cerrar todo.', tararear: { notas: MELODIAS.madre, ir: 'j3' }, opciones: [
        { texto: 'Yo no tengo miedo.', ir: 'j2' },
        { texto: '(soltarla)', salida: 'cruzar' },
      ] },
      j2: { quien: 'Mamá', retrato: 'madre_joven', gesto: 'miedo', texto: 'Por eso. Alguien tiene que tener la llave. Cantame, así me duermo.', tararear: { notas: MELODIAS.madre, ir: 'j3' }, opciones: [
        { texto: '(soltarla)', salida: 'cruzar' },
      ] },
      j3: { quien: 'Mamá', retrato: 'madre_joven', gesto: 'calma', texto: 'Tomá la llave. Nunca salgas sin cerrar. Nunca.', opciones: [], auto: { salida: 'cruzar', traspaso: true } },
    },
  };
}

// ---------------------------------------------------------------- la abuela: el rosario

export const ABUELA_AHORA: Guion = {
  id: 'abuela_ahora', lado: 'A', voz: -4, inicio: 'q1',
  nodos: {
    q1: { quien: 'La abuela', retrato: 'abuela', gesto: 'calma', texto: 'Ya no rezo, nena. Perdí el rosario hace años. Duermo como una piedra.', opciones: [
      { texto: '¿Dónde lo perdiste?', ir: 'q2' },
      { texto: '(darse vuelta)', salida: 'volver' },
    ] },
    q2: { quien: 'La abuela', retrato: 'abuela', gesto: 'lejos', texto: 'No lo perdí. Se lo di a alguien. No me acuerdo a quién.', opciones: [
      { texto: '(acordarse)', salida: 'cruzar' },
      { texto: '(darse vuelta)', salida: 'volver' },
    ] },
  },
};

export function abuelaAntes(calma: boolean): Guion {
  return {
    id: 'abuela_antes', lado: 'C', voz: -4, inicio: calma ? 'r3' : 'r1',
    nodos: {
      r1: { quien: 'La abuela', retrato: 'abuela_joven', gesto: 'miedo', texto: 'Rezá conmigo. Si no rezamos se cae el cielo, y si se cae es culpa de una.', tararear: { notas: MELODIAS.abuela, ir: 'r3' }, opciones: [
        { texto: '¿De cuál?', ir: 'r2' },
        { texto: '(soltarla)', salida: 'cruzar' },
      ] },
      r2: { quien: 'La abuela', retrato: 'abuela_joven', gesto: 'miedo', texto: 'De la que no rezó. Cantalo conmigo.', tararear: { notas: MELODIAS.abuela, ir: 'r3' }, opciones: [
        { texto: '(soltarla)', salida: 'cruzar' },
      ] },
      r3: { quien: 'La abuela', retrato: 'abuela_joven', gesto: 'calma', texto: 'Tomá, rezalo vos por todas. Cuenta por cuenta.', opciones: [], auto: { salida: 'cruzar', traspaso: true } },
    },
  };
}

// ---------------------------------------------------------------- la Senora

/**
 * Salidas de la Senora: 'volver' = ir al fondo en el presente;
 * 'cruzar' = ir al fondo en el recuerdo.
 */
export function senora(reconocidos: number): Guion {
  if (reconocidos === 0) {
    return {
      id: 'senora', lado: 'A', voz: -7, inicio: 's0', nodos: {
        s0: { quien: 'La Señora', retrato: 'senora', gesto: 'lejos', texto: 'Venís con las manos vacías. Pero cargás algo.', opciones: [
          { texto: 'Es mío.', ir: 's0b' },
        ] },
        s0b: { quien: 'La Señora', retrato: 'senora', gesto: 'pena', texto: 'Eso te dijeron. Andá al fondo.', opciones: [
          { texto: '(ir al fondo)', salida: 'volver' },
          { texto: 'Quiero volver a esa siesta.', salida: 'cruzar' },
        ] },
      },
    };
  }
  return {
    id: 'senora', lado: 'A', voz: -7, inicio: 's1', nodos: {
      s1: { quien: 'La Señora', retrato: 'senora', gesto: 'pena', texto: 'Yo no curaba. Pasaba las cosas de mano.', opciones: [
        { texto: '¿A mí?', ir: 's2' },
      ] },
      s2: { quien: 'La Señora', retrato: 'senora', gesto: 'pena', texto: 'Vos dormías. Tenías las manos vacías.', opciones: [
        { texto: '(ir al fondo)', salida: 'volver' },
        { texto: 'Quiero volver a esa siesta.', salida: 'cruzar' },
      ] },
    },
  };
}

// ---------------------------------------------------------------- ella misma, del otro lado del aljibe

/**
 * Al final, del otro lado del aljibe aparece ella misma: la nena (si llega
 * desde el presente) o la mujer (si llega desde el recuerdo). Le dice lo que
 * pasa con cada salida antes de que elija: quedarse cantando, devolverlo
 * animandose a callar (lo contrario de todo lo que el juego le enseno), o
 * tirarse al agua.
 */
export function misma(desde: 'A' | 'C', reconocidos: number): Guion {
  const b = reconocidos === 0 ? 0 : reconocidos < 3 ? 1 : 2;
  const nina = desde === 'A';
  const quien = '';
  const retrato = nina ? 'nina' as const : 'josefina' as const;
  const abre = nina
    ? ['Tenés las manos llenas y no sabés de quién es nada.', 'Algo de lo que cargás ya sabés de quién es.', 'Ya sabés de quién es cada cosa.'][b]
    : ['Mirá todo lo que vas a cargar.', 'Algo de esto no va a ser tuyo.', 'Nada de esto va a ser tuyo.'][b];
  return {
    id: nina ? 'misma_nina' : 'misma_adulta', lado: nina ? 'A' : 'C', voz: nina ? 9 : 0, inicio: `f1_${b}`, nodos: {
      [`f1_${b}`]: { quien, retrato, gesto: b === 0 ? 'lejos' : 'calma', texto: abre, opciones: [{ texto: '(acercarse)', ir: 'f2' }] },
      f2: {
        quien, retrato, gesto: 'calma', texto: 'Si cantás conmigo, te quedás acá. Si te callás, se lo llevan.',
        tararear: { notas: MELODIAS.cancion, salida: 'final_antes', etiqueta: '(cantar con ella)' },
        opciones: [
          { texto: '(quedarme callada)', salida: 'final_audere' },
          { texto: '(tirarse al agua)', especial: 'saltar' },
        ],
      },
    },
  };
}

/** Todos los guiones posibles (para el compendio: la lista de voces a grabar). */
export function todosLosGuiones(): Guion[] {
  return [
    MARIELA_AHORA, marielaAntes(false), MADRE_AHORA, madreAntes(false), ABUELA_AHORA, abuelaAntes(false),
    senora(0), senora(1), misma('A', 0), misma('A', 1), misma('A', 3), misma('C', 0), misma('C', 1), misma('C', 3),
  ];
}
