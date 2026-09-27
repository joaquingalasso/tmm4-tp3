/**
 * ARCHIVOS DE SONIDO — busca cada sonido en assets/ (mp3, wav u ogg).
 * Lo que no esta, no esta: el juego sintetiza.
 */

const buffers = new Map<string, AudioBuffer>();
const EXT = ['mp3', 'wav', 'ogg'];

async function probar(ctx: BaseAudioContext, ruta: string): Promise<AudioBuffer | null> {
  for (const ext of EXT) {
    try {
      const r = await fetch(`assets/${ruta}.${ext}`);
      if (!r.ok) continue;
      if ((r.headers.get('content-type') ?? '').includes('text/html')) continue;
      return await ctx.decodeAudioData(await r.arrayBuffer());
    } catch { /* no esta o no se pudo leer */ }
  }
  return null;
}

export async function cargarSonidos(ctx: BaseAudioContext, lista: { id: string; ruta: string }[]) {
  await Promise.all(lista.map(async ({ id, ruta }) => {
    const b = await probar(ctx, ruta);
    if (b) buffers.set(id, b);
  }));
}

export function sonidoArchivo(id: string): AudioBuffer | null { return buffers.get(id) ?? null; }

export function cuantosSonidos() { return buffers.size; }
