import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';

/**
 * Solo en desarrollo: deja que exportar.html guarde los placeholders en
 * public/assets. Asi los recursos del juego salen del mismo codigo que los
 * dibuja, y el equipo recibe archivos concretos para reemplazar.
 */
function guardarRecursos(): Plugin {
  const raiz = resolve(__dirname, 'public', 'assets');
  return {
    name: 'guardar-recursos',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__guardar', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const url = new URL(req.url ?? '', 'http://x');
        const ruta = normalize(url.searchParams.get('ruta') ?? '');
        const destino = join(raiz, ruta);
        if (!ruta || !destino.startsWith(raiz)) { res.statusCode = 400; res.end('ruta invalida'); return; }
        const partes: Buffer[] = [];
        req.on('data', (d: Buffer) => partes.push(d));
        req.on('end', () => {
          const cuerpo = Buffer.concat(partes).toString('utf8');
          mkdirSync(dirname(destino), { recursive: true });
          const m = /^data:[^;,]+;base64,/.exec(cuerpo);
          if (m) writeFileSync(destino, Buffer.from(cuerpo.slice(m[0].length), 'base64'));
          else writeFileSync(destino, cuerpo, 'utf8');
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [guardarRecursos()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html') } },
  },
  server: { port: 5180, host: '127.0.0.1' },
});
