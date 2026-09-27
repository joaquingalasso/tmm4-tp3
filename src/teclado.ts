/** Teclado: flechas para caminar. El resto de la interaccion es la voz. */
export class Teclado {
  private abajos = new Set<string>();
  private pulsados = new Set<string>();
  alguna = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.pulsados.add(e.code); if (e.code !== 'F1') this.alguna = true; }
      this.abajos.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.abajos.delete(e.code));
    window.addEventListener('blur', () => this.abajos.clear());
  }

  abajo(code: string) { return this.abajos.has(code); }
  pulsado(code: string) { return this.pulsados.has(code); }
  finFrame() { this.pulsados.clear(); this.alguna = false; }

  /** Para pruebas desde la consola. */
  forzar(code: string, abajo: boolean) {
    if (abajo) { if (!this.abajos.has(code)) { this.pulsados.add(code); this.alguna = true; } this.abajos.add(code); }
    else this.abajos.delete(code);
  }
}
