const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('audereVentana', {
  completa: (si) => ipcRenderer.send('ventana:completa', si),
});
