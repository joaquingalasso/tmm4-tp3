/**
 * CATALOGO DE SONIDOS — todo lo que suena y se puede reemplazar con un archivo.
 *
 * Igual que las imagenes: si existe `public/assets/sonidos/<id>.mp3` (o .wav u
 * .ogg), el juego lo usa; si no, suena el sintetizado. En
 * `sonidos/_plantillas/` quedan los sintetizados exportados como WAV, para
 * editarlos y devolverlos con el nombre sin la carpeta de plantillas.
 *
 * Las voces de los personajes son `sonidos/voces/<guion>_<nodo>.mp3`: una por
 * cada parrafo de dialogo (la lista completa, con el texto, esta en el
 * compendio). La protagonista no habla.
 */

export interface RecursoSonido {
  id: string;
  /** ruta sin extension, dentro de assets/ */
  ruta: string;
  bucle: boolean;
  nota: string;
  /** segundos de la plantilla exportada */
  plantilla: number;
}

const S: RecursoSonido[] = [];
function s(id: string, bucle: boolean, plantilla: number, nota: string) {
  S.push({ id, ruta: `sonidos/${id}`, bucle, nota, plantilla });
}

s('amb_ahora', true, 16, 'El aire del presente: la casa de noche. Grave, frío, casi inaudible. En bucle.');
s('amb_antes', true, 16, 'La siesta del recuerdo: chicharras, calor, un ventilador lejos. En bucle.');
s('amb_ruta', true, 16, 'Prólogo: la ruta de noche dentro del auto. Motor, viento. En bucle.');
s('amb_cuarto', true, 16, 'Prólogo: el cuarto del altar en penumbra de siesta. En bucle.');
s('amb_patio', true, 16, 'El final: el patio de noche, pastos, algo de viento. En bucle.');
s('tormenta', true, 16, 'Lluvia pesada con truenos lejanos (el living de la abuela). En bucle.');
s('pantano', true, 12, 'El pantano: burbujeo espeso, barro. Sube cuando no tarareás. En bucle.');
s('perseguidor', true, 12, 'Lo que la persigue: arrastre, algo que respira. Sube con la cercanía. En bucle.');
s('halo', true, 10, 'Mientras tarareás, el aire se calienta: un acorde tenue. En bucle, sin la voz (la voz es la del jugador).');
s('cancion', false, 9, 'La canción de cuna de la familia, tarareada, sin letra. Sus notas son las de ellas tres: la de Mariela, la de la madre, la de la abuela.');
s('piano', false, 4, 'Una nota de piano viejo, Do central (261 Hz). El juego la afina para cada tecla.');
s('latido', false, 1, 'Un latido (lub-dub).');
s('paso_ahora', false, 1, 'Un paso en el piso de madera de noche.');
s('paso_antes', false, 1, 'Un paso descalzo en baldosa caliente.');
s('trueno', false, 4, 'Un trueno.');
s('gota', false, 1, 'Una gota que cae en el agua del aljibe.');
s('tinta', false, 4, 'La sombra de una de ellas que se escurre hasta la nena: un gorgoteo que baja.');
s('campana', false, 4, 'Una nota igualada: algo se calma.');
s('ahogo', false, 4, 'Cuando la alcanzan: hundirse en el barro, todo se apaga.');
s('rebobinar', false, 3, 'Cuando la alcanzan, todo se rebobina hasta la última luz: una cinta que corre hacia atrás. El juego la acelera o la frena según la distancia.');
s('estallido', false, 6, 'El grito final: todo se chupa hacia adentro y estalla.');
s('desgarro', false, 3, 'Papel que se rasga de arriba abajo.');

export const SONIDOS: RecursoSonido[] = S;
