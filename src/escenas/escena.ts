import type * as THREE from 'three';
import type { EstadoPost } from '../tres/motor';
import type { Sonido } from '../sonido';
import type { Teclado } from '../teclado';
import type { Ventana } from '../ventana';
import type { Voz } from '../voz';
import { hacia, lerp } from '../config';

export interface Contexto { tec: Teclado; voz: Voz; son: Sonido; ventana: Ventana; }

export type NombreEscena = 'titulo' | 'prologo' | 'escenario' | 'final';

export interface Escena {
  alEntrar(x: Contexto): void;
  actualizar(dtMs: number, x: Contexto): void;
  dibujar(mundo: CanvasRenderingContext2D, capa: CanvasRenderingContext2D): void;
  post(): Partial<EstadoPost>;
  /** Cuando no es null, main hace el fundido y cambia de escena. */
  siguiente: NombreEscena | null;
  /** Encierro total 0..1 (1 = libre); main lo reparte entre ventana y marco. */
  encierro: number;
  /** Datos para el sonido. */
  sonido(): { miedo: number; halo: number; susurros: number; latido: number };
  /** Si la escena es 3D, devuelve que renderizar; si no, se usa el lienzo 2D. */
  tres?(): { escena: THREE.Scene; camara: THREE.Camera } | null;
}

export type TipoFinal = 'audere' | 'nopudo' | 'antes';

/** Lo que pasa de una escena a la otra. `carga` = cuantos recuerdos acepto (cuantos miedos tienen cara). */
export const partida: { carga: number; reconocidos: string[]; final: { tipo: TipoFinal; plano: 'A' | 'C' } | null } = {
  carga: 0, reconocidos: [], final: null,
};

/** El aura del tarareo: radio suavizado y ondas que se expanden mientras sonas. */
export class Aura {
  r = 0;
  fuerza = 0;
  ondas: { r: number; a: number }[] = [];
  private msOnda = 0;

  actualizar(dtMs: number, fuerza: number, rMin: number, rMax: number) {
    const dt = dtMs / 1000;
    this.fuerza = hacia(this.fuerza, fuerza, fuerza > this.fuerza ? 8 : 3, dt);
    this.r = hacia(this.r, fuerza > 0.02 ? lerp(rMin, rMax, fuerza) : 0, fuerza > 0.02 ? 3 : 1.6, dt);
    this.msOnda -= dtMs;
    if (fuerza > 0.1 && this.msOnda <= 0) {
      this.ondas.push({ r: 18, a: 0.5 * fuerza });
      this.msOnda = 420 - fuerza * 200;
    }
    for (const o of this.ondas) { o.r += dt * (90 + this.r * 0.5); o.a -= dt * 0.35; }
    this.ondas = this.ondas.filter((o) => o.a > 0 && o.r < Math.max(60, this.r * 1.3));
  }
}
