const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  // read synchronously at startup so the store can boot from disk
  initialState: ipcRenderer.sendSync('load-state'),
  saveState: (json) => ipcRenderer.invoke('save-state', json),
  saveFile: (filename, buffer) => ipcRenderer.invoke('save-file', filename, buffer),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
})
