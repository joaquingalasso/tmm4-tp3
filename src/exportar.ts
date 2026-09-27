import '@fontsource/gloock';
import { CATALOGO, type Grupo, type Recurso } from './sprites/catalogo';
import { SONIDOS, type RecursoSonido } from './sonidos/catalogo';
import { Sonido } from './sonido';
import { todosLosGuiones } from './guiones';

/**
 * EXPORTAR — genera los placeholders en public/assets y el compendio que se le
 * manda al equipo. Se abre en http://127.0.0.1:5180/exportar.html con el
 * servidor de desarrollo corriendo.
 */

const log = document.getElementById('log')!;
const escribir = (s: string) => { log.textContent += `\n${s}`; };

async function guardar(ruta: string, cuerpo: string) {
  const r = await fetch(`/__guardar?ruta=${encodeURIComponent(ruta)}`, { method: 'POST', body: cuerpo });
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
}

function renderizar(r: Recurso): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = r.w * r.cuadros;
  cv.height = r.h;
  const c = cv.getContext('2d')!;
  for (let i = 0; i < r.cuadros; i++) {
    c.save(); c.translate(i * r.w, 0);
    c.beginPath(); c.rect(0, 0, r.w, r.h); c.clip();
    r.dibujar(c, i, r.cuadros);
    c.restore();
  }
  return cv;
}

// ---------------------------------------------------------------- sonidos: plantillas WAV

function receta(id: string, s: Sonido) {
  const f0 = 220;
  switch (id) {
    case 'amb_ahora': s.ambiente('ahora', 0.7, 0.05); break;
    case 'amb_antes': s.ambiente('antes', 0.45, 0.05); break;
    case 'amb_ruta': s.ambiente('ruta', 0.5, 0.05); s.viento(0.08); break;
    case 'amb_cuarto': s.ambiente('cuarto', 0.4, 0.05); break;
    case 'amb_patio': s.ambiente('patio', 0.6, 0.05); s.viento(0.03); break;
    case 'tormenta': s.capa('tormenta', 1); s.trueno(); break;
    case 'pantano': s.capa('pantano', 1); break;
    case 'perseguidor': s.capa('perseguidor', 1); break;
    case 'halo': s.capa('halo', 1); break;
    case 'cancion': s.cancion(f0, 0.14); break;
    case 'piano': s.piano(261.63, 0.2); break;
    case 'latido': s.golpe(0.05, 50, 0.5); s.golpe(0.22, 44, 0.35); break;
    case 'paso_ahora': s.paso(0.05, 900); break;
    case 'paso_antes': s.paso(0.05, 2200); break;
    case 'trueno': s.trueno(); break;
    case 'gota': s.gota(); break;
    case 'tinta': s.tinta(2.4); break;
    case 'campana': s.campana(261.63, 0.25); break;
    case 'ahogo': s.ahogo(); break;
    case 'estallido': s.estallido(); break;
    case 'rebobinar': s.rebobinar(2.6); break;
    case 'desgarro': s.desgarro(); break;
  }
}

async function plantillaSonido(r: RecursoSonido): Promise<string> {
  const sr = 44100;
  const extra = r.bucle ? 2 : 0;
  const off = new OfflineAudioContext(2, Math.ceil(sr * (r.plantilla + extra)), sr);
  const s = new Sonido(off);
  s.iniciar();
  receta(r.id, s);
  const b = await off.startRendering();
  const n = Math.ceil(sr * r.plantilla), F = sr * extra;
  const canales = [0, 1].map((ch) => {
    const d = b.getChannelData(ch);
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = d[i];
    // en los bucles, la cola se funde con el principio: vuelve a empezar sin corte
    for (let i = 0; i < F && i < n; i++) { const a = i / F; o[i] = d[i] * a + d[n + i] * (1 - a); }
    return o;
  });
  return await aDataURL(wav(canales, sr));
}

function wav(canales: Float32Array[], sr: number): Blob {
  const n = canales[0].length, nc = canales.length;
  const buf = new ArrayBuffer(44 + n * nc * 2);
  const v = new DataView(buf);
  const txt = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + n * nc * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true);
  txt(36, 'data'); v.setUint32(40, n * nc * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let ch = 0; ch < nc; ch++) { v.setInt16(o, Math.max(-1, Math.min(1, canales[ch][i])) * 32767, true); o += 2; }
  return new Blob([buf], { type: 'audio/wav' });
}

function aDataURL(b: Blob): Promise<string> {
  return new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result as string); f.readAsDataURL(b); });
}

const TITULOS: Record<Grupo, [string, string]> = {
  personajes: ['Personajes de perfil', 'Se ven en el presente (de frente al escenario) y en el recuerdo (desde atrás). Los pies van en el centro del borde de abajo. La protagonista mira a la derecha; las figuras, a la izquierda.'],
  frentes: ['Personajes de frente', 'Así se los ve en primera persona, cuando la protagonista los enfrenta y se abre el diálogo. Mirando a cámara.'],
  oscuras: ['Versiones oscuras', 'Ellas, en el presente, vistas por Josefina cuando pierde la calma: se vuelven monstruos al acercarse. Mismo encuadre que su versión normal: el juego funde una en la otra.'],
  miedos: ['Lo que la persigue', 'Cuando no tararea, todo se empantana y la persiguen sus miedos. Al principio son sombras sin cara; cada recuerdo aceptado le pone la cara de quien se lo dio.'],
  sombras: ['Sombras y objetos', 'Lo que cada una le da a Josefina (un espejito, una llave, un rosario), y las sombras largas de ellas (prólogo y camino final). El juego los pinta de negro.'],
  limites: ['Paredes y límites', 'Las paredes son de verdad: el juego arma paredes con volumen usando estas texturas (tileables) y estas puertas. Además: la barricada de muebles, los trastos del principio, el portón del final.'],
  retratos: ['Retratos', 'La caricatura que aparece en la caja de diálogo. Uno por gesto.'],
  telones: ['Telones', 'Los dos fondos del teatro. El del recuerdo se ve desde atrás del escenario, por eso está espejado.'],
  objetos: ['Objetos', 'Muebles y cosas que se paran sobre el escenario. Base apoyada en el borde de abajo.'],
  efectos: ['Efectos', 'Cosas animadas: la tinta del miedo, los huecos del recuerdo, los biombos con sombras.'],
  prologo: ['Prólogo', 'La animación del principio: el viaje a Corrientes, el patio, el aljibe, el cuarto del altar.'],
};

function compendio(): string {
  const grupos = Object.keys(TITULOS) as Grupo[];
  let css = '';
  let cuerpo = '';
  for (const g of grupos) {
    const items = CATALOGO.filter((r) => r.grupo === g);
    if (!items.length) continue;
    cuerpo += `<section><h2>${TITULOS[g][0]}</h2><p class="intro">${TITULOS[g][1]}</p><div class="grilla">`;
    for (const r of items) {
      const escala = Math.min(1, 240 / r.w, 240 / r.h);
      const w = Math.round(r.w * escala), h = Math.round(r.h * escala);
      const total = r.w * r.cuadros;
      const clase = `a_${r.id}`;
      if (r.cuadros > 1 && r.fps > 0) {
        css += `.${clase}{animation:${clase} ${(r.cuadros / r.fps).toFixed(2)}s steps(${r.cuadros}) infinite}@keyframes ${clase}{to{background-position:-${Math.round(total * escala)}px 0}}\n`;
      }
      cuerpo += `
      <article>
        <div class="marco"><div class="spr ${clase}" style="width:${w}px;height:${h}px;background-image:url('${r.archivo}');background-size:${Math.round(total * escala)}px ${h}px"></div></div>
        <h3>${r.id}</h3>
        <p class="archivo">${r.archivo}</p>
        <table>
          <tr><td>cuadro</td><td>${r.w} × ${r.h} px</td></tr>
          <tr><td>cuadros</td><td>${r.cuadros}${r.cuadros > 1 ? ` · ${r.fps} por segundo` : ''}</td></tr>
          <tr><td>PNG entero</td><td>${total} × ${r.h} px</td></tr>
        </table>
        <p class="nota">${r.nota}</p>
        <a href="${r.archivo}" download>descargar la plantilla</a>
      </article>`;
    }
    cuerpo += '</div></section>';
  }
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Audere · compendio de imágenes</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Gloock&display=swap" rel="stylesheet">
<style>
:root{--f:#0b0e12;--p:#e8e3d8;--g:#8e9aa6;--c:#efcf95}
*{box-sizing:border-box}body{margin:0;background:var(--f);color:var(--p);font:15px/1.55 Georgia,serif}
header{padding:56px 24px 28px;max-width:1200px;margin:auto}
h1{font-family:Gloock,Georgia,serif;font-weight:400;font-size:64px;margin:0;letter-spacing:.02em}
h2{font-family:Gloock,Georgia,serif;font-weight:400;font-size:30px;margin:48px 0 6px}
.lede{color:var(--g);max-width:760px}
.reglas{border:1px solid #2a3440;padding:18px 22px;max-width:900px;margin-top:22px}
.reglas li{margin:6px 0}
section{max-width:1200px;margin:auto;padding:0 24px}
.intro{color:var(--g);margin-top:0}
.grilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px}
article{background:#121820;border:1px solid #232d38;padding:14px}
.marco{height:250px;display:flex;align-items:center;justify-content:center;background:
 repeating-conic-gradient(#1a212a 0 25%,#141a22 0 50%) 0 0/20px 20px;margin-bottom:10px}
.spr{background-repeat:no-repeat;image-rendering:auto}
h3{font-family:Gloock,Georgia,serif;font-weight:400;font-size:19px;margin:4px 0 0}
.archivo{font:12px ui-monospace,Consolas,monospace;color:var(--c);margin:2px 0 8px;word-break:break-all}
table{font-size:13px;color:var(--g);border-collapse:collapse}td{padding:1px 10px 1px 0}
.nota{font-size:13.5px}
a{color:var(--c)}
.tabla{width:100%;border-collapse:collapse;font-size:14px;margin:10px 0 30px}.tabla td,.tabla th{border-top:1px solid #232d38;padding:8px 10px;vertical-align:top;text-align:left;color:var(--p)}.tabla th{color:var(--g);font-weight:400}.tabla code{color:var(--c);font-size:12px}audio{height:30px;width:220px}
footer{max-width:1200px;margin:60px auto;padding:0 24px;color:var(--g);font-size:13px}
${css}
</style></head><body>
<header>
<h1>AUDERE</h1>
<p class="lede">Compendio de imágenes del juego. Cada imagen de esta página es una <b>plantilla provisoria</b>: tiene el tamaño, la cantidad de cuadros y el encuadre correctos. Hay que dibujar encima y devolver el PNG con <b>el mismo nombre y el mismo tamaño</b>.</p>
<div class="reglas"><b>Reglas para que el reemplazo sea directo</b><ul>
<li><b>Mismo tamaño de PNG.</b> Si una hoja tiene 8 cuadros de 260 × 340, el PNG mide 2080 × 340.</li>
<li><b>Cuadros en una tira horizontal</b>, de izquierda a derecha, todos del mismo ancho y sin espacio entre ellos.</li>
<li><b>Fondo transparente</b> en personajes, objetos y efectos. Los telones y el prólogo van opacos.</li>
<li><b>Los pies (o la base) tocan el borde de abajo</b>, centrados. No mover al personaje dentro del cuadro entre un cuadro y otro, salvo que la animación lo pida.</li>
<li><b>Dirección:</b> la protagonista mira a la derecha; las figuras de perfil, a la izquierda. Los "frentes" miran a cámara.</li>
<li><b>Dos épocas:</b> el <i>presente</i> es de noche, frío, azulado; el <i>recuerdo</i> es una siesta en Corrientes, como una foto vieja, sepia y pasada de luz.</li>
<li>La protagonista se entrega <b>limpia</b>: las manchas de tinta las agrega el juego.</li>
</ul></div>
</header>
${cuerpo}
${seccionSonidos()}
<footer>Generado por <code>exportar.html</code>. ${CATALOGO.length} imágenes. Grupo 11 · TDMM4.</footer>
</body></html>`;
}

function seccionSonidos(): string {
  const filas = SONIDOS.map((r) => `<tr><td><code>${r.ruta}.mp3</code></td><td>${r.bucle ? 'en bucle' : 'una vez'}</td><td>${r.nota}</td><td><audio controls preload="none" src="sonidos/_plantillas/${r.id}.wav"></audio></td></tr>`).join('');
  const vistas = new Set<string>();
  const voces = todosLosGuiones().flatMap((g) => Object.entries(g.nodos).map(([id, n]) => {
    const archivo = `sonidos/voces/${g.id}_${id}.mp3`;
    if (vistas.has(archivo)) return '';
    vistas.add(archivo);
    const quien = n.quien || (g.id === 'misma_nina' ? 'Ella misma, nena' : 'Ella misma, grande');
    return `<tr><td>${quien}</td><td><code>${archivo}</code></td><td>${n.texto}</td></tr>`;
  })).join('');
  return `<section><h2>Sonidos</h2>
<p class="intro">Igual que las imágenes: si existe <code>assets/sonidos/&lt;nombre&gt;.mp3</code> (o <code>.wav</code> / <code>.ogg</code>), el juego lo usa; si no, suena el sintetizado. En <code>sonidos/_plantillas/</code> están los sintetizados exportados como WAV para editarlos: se editan y se guardan en <code>sonidos/</code> (sin <code>_plantillas</code>) con el mismo nombre. Los que dicen <i>en bucle</i> tienen que empalmar el final con el principio.</p>
<table class="tabla"><tr><th>archivo</th><th></th><th>qué es</th><th>plantilla</th></tr>${filas}</table>
<h2>Voces</h2>
<p class="intro">Un archivo por párrafo. Solo hablan ellas: la protagonista no tiene voz. El subtítulo se escribe al ritmo de la grabación (avanza cuando suena la voz y se detiene en los silencios), así que conviene dejar las pausas naturales. Si una voz no está, suena un murmullo en la altura de cada personaje.</p>
<table class="tabla"><tr><th>quién</th><th>archivo</th><th>texto</th></tr>${voces}</table></section>`;
}

function leeme(): string {
  const filas = CATALOGO.map((r) => `| \`${r.archivo}\` | ${r.w}×${r.h} | ${r.cuadros} | ${r.w * r.cuadros}×${r.h} |`).join('\n');
  return `# Audere · imágenes

Abrir **compendio.html** para ver todo, con las animaciones andando.

Para reemplazar una imagen: dibujar sobre la plantilla, respetar el tamaño del PNG y guardarla con el mismo nombre en esta carpeta. El juego la toma sola.

Sonidos: \`sonidos/<nombre>.mp3\` (o .wav/.ogg). Las plantillas editables están en \`sonidos/_plantillas/\`. Voces: \`sonidos/voces/<guion>_<nodo>.mp3\` (la lista con el texto está en el compendio).

| archivo | cuadro (px) | cuadros | PNG entero (px) |
|---|---|---|---|
${filas}
`;
}

async function main() {
  await document.fonts.load('40px Gloock');
  escribir(`${CATALOGO.length} imágenes`);
  for (const r of CATALOGO) {
    const cv = renderizar(r);
    await guardar(r.archivo, cv.toDataURL('image/png'));
    escribir(`✓ ${r.archivo}  (${cv.width}×${cv.height})`);
  }
  for (const r of SONIDOS) {
    await guardar(`sonidos/_plantillas/${r.id}.wav`, await plantillaSonido(r));
    escribir(`♪ sonidos/_plantillas/${r.id}.wav`);
  }
  const manifiesto = CATALOGO.map(({ id, archivo, w, h, cuadros, fps, grupo, nota }) => ({ id, archivo, w, h, cuadros, fps, grupo, nota }));
  await guardar('manifiesto.json', JSON.stringify(manifiesto, null, 2));
  await guardar('compendio.html', compendio());
  await guardar('LEEME.md', leeme());
  escribir('\n✓ manifiesto.json, compendio.html, LEEME.md\nLISTO');
  (window as unknown as { exportado: boolean }).exportado = true;
}

main().catch((e) => escribir(`ERROR: ${e}`));
