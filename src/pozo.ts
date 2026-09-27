import { hash } from './config';

/**
 * EL ALJIBE VISTO DESDE ARRIBA — la boca redonda, con su borde de cal y
 * ladrillo, y alrededor las baldosas del patio. El agua va adentro, recortada
 * en circulo: nunca se ve el cuadrado de la imagen.
 */

type Ctx = CanvasRenderingContext2D;

export function bocaDelAljibe(c: Ctx, cx: number, cy: number, r: number, agua: (c: Ctx) => void, o: { recuerdo: boolean; t: number }) {
  const W = c.canvas.width, H = c.canvas.height;
  // las baldosas del patio, alrededor
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = o.recuerdo ? '#c9b087' : '#15181c';
  c.fillRect(0, 0, W, H);
  c.restore();
  c.save();
  c.strokeStyle = o.recuerdo ? 'rgba(90,66,40,0.3)' : 'rgba(160,180,198,0.08)';
  c.lineWidth = 2;
  const lado = r * 0.55;
  for (let x = cx - r * 4; x < cx + r * 4; x += lado) { c.beginPath(); c.moveTo(x, cy - r * 3); c.lineTo(x, cy + r * 3); c.stroke(); }
  for (let y = cy - r * 3; y < cy + r * 3; y += lado) { c.beginPath(); c.moveTo(cx - r * 4, y); c.lineTo(cx + r * 4, y); c.stroke(); }
  // yuyos que asoman entre las baldosas
  c.fillStyle = o.recuerdo ? 'rgba(90,100,60,0.45)' : 'rgba(20,30,24,0.8)';
  for (let i = 0; i < 40; i++) {
    const a = hash(i) * Math.PI * 2, d = r * (1.35 + hash(i + 7) * 1.6);
    c.beginPath(); c.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 6 + hash(i + 3) * 14, 3, a, 0, Math.PI * 2); c.fill();
  }
  // el brocal: un anillo grueso de cal (en el presente, descascarado con ladrillo a la vista)
  const g = c.createRadialGradient(cx, cy, r, cx, cy, r * 1.32);
  g.addColorStop(0, o.recuerdo ? '#e9dcc0' : '#6e6a64');
  g.addColorStop(0.5, o.recuerdo ? '#f7f0e0' : '#8c877f');
  g.addColorStop(1, o.recuerdo ? '#d8c7a3' : '#4a4642');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, r * 1.32, 0, Math.PI * 2); c.arc(cx, cy, r, 0, Math.PI * 2, true); c.fill('evenodd');
  if (!o.recuerdo) {
    c.fillStyle = 'rgba(163,88,60,0.75)';
    for (let i = 0; i < 18; i++) {
      const a = hash(i * 3.3) * Math.PI * 2;
      c.save(); c.translate(cx + Math.cos(a) * r * 1.16, cy + Math.sin(a) * r * 1.16); c.rotate(a + Math.PI / 2);
      c.fillRect(-12, -5, 24, 10); c.restore();
    }
  }
  c.strokeStyle = o.recuerdo ? 'rgba(90,66,40,0.5)' : 'rgba(0,0,0,0.6)'; c.lineWidth = 3;
  c.beginPath(); c.arc(cx, cy, r * 1.32, 0, Math.PI * 2); c.stroke();
  // el agua, adentro, recortada en circulo; con la sombra del borde encima
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#020304'; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  agua(c);
  const sombra = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  sombra.addColorStop(0, 'rgba(0,0,0,0)'); sombra.addColorStop(1, 'rgba(0,0,0,0.7)');
  c.fillStyle = sombra; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.restore();
  c.restore();
}

/** Dibuja una imagen fila por fila, cada fila corrida: el temblor del agua. */
export function ondular(c: Ctx, src: CanvasImageSource & { width: number; height: number }, dx: number, dy: number, dw: number, dh: number, t: number, amp: number, frec: number) {
  if (amp < 0.2) { c.drawImage(src, dx, dy, dw, dh); return; }
  const filas = 120;
  const sh = src.height / filas, h = dh / filas;
  for (let i = 0; i < filas; i++) {
    const off = Math.sin(i * frec * 6 + t * 3) * amp + Math.sin(i * frec * 17 - t * 5) * amp * 0.3;
    c.drawImage(src, 0, i * sh, src.width, sh + 0.5, dx + off, dy + i * h, dw, h + 0.6);
  }
}
