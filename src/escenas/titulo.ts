import { C, H, TIPO, W, clamp } from '../config';
import { glifoAuriculares, ladrillos, titulo } from '../arte';
import type { EstadoPost } from '../tres/motor';
import type { Contexto, Escena, NombreEscena } from './escena';

/**
 * TITULO — el aljibe visto desde adentro, girando despacio. Es la misma imagen
 * con la que termina el juego.
 */
export class Titulo implements Escena {
  siguiente: NombreEscena | null = null;
  encierro = 1;
  private t = 0;
  private fase: 'espera' | 'pidiendo' | 'sinMic' = 'espera';
  private msFase = 0;

  alEntrar(x: Contexto) {
    this.siguiente = null;
    this.fase = 'espera';
    x.ventana.restaurar();
  }

  actualizar(dtMs: number, x: Contexto) {
    this.t += dtMs / 1000;
    this.msFase += dtMs;
    if (this.fase === 'espera' && x.tec.alguna && this.t > 0.8) {
      void (x.son.ctx as AudioContext).resume();
      x.son.iniciar();
      x.son.ambiente('ahora', 0.5);
      if (x.voz.disponible) { this.siguiente = 'prologo'; return; }
      this.fase = 'pidiendo';
      this.msFase = 0;
      x.voz.iniciar().then((ok) => {
        if (ok) this.siguiente = 'prologo';
        else { this.fase = 'sinMic'; this.msFase = 0; }
      });
    }
    if (this.fase === 'sinMic' && this.msFase > 3500) this.siguiente = 'prologo';
  }

  dibujar(mundo: CanvasRenderingContext2D, capa: CanvasRenderingContext2D) {
    ladrillos(mundo, this.t * 10, this.t, 0.4);
    const a = clamp(this.t / 2);
    titulo(capa, W / 2, H / 2 + 44, 150, a);

    // un solo aviso, antes de todo: el juego escucha
    const aviso = (texto: string, alpha: number) => {
      capa.save();
      capa.globalAlpha = alpha;
      capa.fillStyle = C.hueso;
      capa.font = `italic 19px Georgia, serif`;
      capa.textAlign = 'center';
      capa.fillText(texto, W / 2, H - 72);
      capa.restore();
    };
    if (this.fase === 'espera') {
      glifoAuriculares(capa, W / 2, H - 130, 0.35 + 0.25 * Math.sin(this.t * 2));
      aviso('Este juego escucha tu voz: va a pedir usar el micrófono. Mejor con auriculares.', 0.7 * clamp((this.t - 1) / 1.5));
    } else if (this.fase === 'pidiendo') {
      // un microfono que late mientras el navegador pide permiso
      capa.save();
      capa.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 5);
      capa.strokeStyle = C.hueso; capa.lineWidth = 2;
      capa.strokeRect(W / 2 - 6, H - 144, 12, 20);
      capa.beginPath(); capa.arc(W / 2, H - 128, 12, 0, Math.PI); capa.moveTo(W / 2, H - 116); capa.lineTo(W / 2, H - 108); capa.stroke();
      capa.restore();
      aviso('Permití el micrófono para jugar.', 0.7);
    } else {
      // sin microfono: el microfono tachado
      capa.save();
      capa.globalAlpha = 0.8;
      capa.strokeStyle = C.hueso; capa.lineWidth = 2;
      capa.strokeRect(W / 2 - 6, H - 144, 12, 20);
      capa.beginPath(); capa.moveTo(W / 2 - 16, H - 108); capa.lineTo(W / 2 + 16, H - 148); capa.stroke();
      capa.restore();
      aviso('No encontramos un micrófono. El juego necesita tu voz.', 0.75);
    }
    capa.save();
    capa.globalAlpha = 0.28 * a;
    capa.fillStyle = C.hueso;
    capa.font = `13px ${TIPO}`;
    capa.textAlign = 'center';
    capa.fillText('a partir de «El aljibe», de Mariana Enriquez  ·  Grupo 11  ·  TDMM4', W / 2, H - 30);
    capa.restore();
  }

  post(): Partial<EstadoPost> {
    return { polar: 1, giro: this.t * 0.012, miedo: 0.12 };
  }

  sonido() { return { miedo: 0, halo: 0, susurros: 0, latido: 0 }; }
}
