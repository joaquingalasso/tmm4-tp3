const { app, BrowserWindow, session, ipcMain, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/**
 * El juego se sirve desde app://audere/ (y no desde file://) para que pueda
 * leer los sonidos con fetch y analizarlos. Las imagenes y los sonidos quedan
 * sueltos en resources/app/dist/assets: se reemplazan ahi mismo.
 */
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const DIST = path.join(__dirname, '..', 'dist');
let win;

function crearVentana() {
  protocol.handle('app', async (req) => {
    const u = new URL(req.url);
    const archivo = path.normalize(path.join(DIST, decodeURIComponent(u.pathname)));
    if (!archivo.startsWith(DIST)) return new Response('no', { status: 403 });
    try { return await net.fetch(pathToFileURL(archivo).toString()); } catch { return new Response('', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_wc, permiso, cb) => cb(permiso === 'media'));
  session.defaultSession.setPermissionCheckHandler((_wc, permiso) => permiso === 'media');

  win = new BrowserWindow({
    width: 1280, height: 720, useContentSize: true, backgroundColor: '#000000', fullscreen: true,
    autoHideMenuBar: true, title: 'Audere',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, autoplayPolicy: 'no-user-gesture-required',
    },
  });
  const query = new URLSearchParams();
  for (const arg of process.argv) {
    const m = /^--(escena)=(.+)$/.exec(arg);
    if (m) query.set(m[1], m[2]);
  }
  const qs = query.toString();
  win.loadURL(`app://audere/index.html${qs ? `?${qs}` : ''}`);
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

ipcMain.on('ventana:completa', (_e, si) => { if (win) win.setFullScreen(!!si); });

app.whenReady().then(crearVentana);
app.on('window-all-closed', () => app.quit());
