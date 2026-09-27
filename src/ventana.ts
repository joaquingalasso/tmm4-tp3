/**
 * LA VENTANA. En el ejecutable el juego arranca a pantalla completa
 * (F11 alterna). En el navegador, F11 del navegador.
 */
declare global {
  interface Window {
    audereVentana?: { completa(si: boolean): void };
  }
}

export class Ventana {
  readonly escritorio = typeof window !== 'undefined' && !!window.audereVentana;

  completa(si: boolean) { window.audereVentana?.completa(si); }

  /** Ya no se achica: queda como esta. */
  restaurar() { /* nada */ }
}
