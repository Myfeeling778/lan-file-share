const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  startServer: (port) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  openShareDir: () => ipcRenderer.invoke('open-share-dir'),
  openInBrowser: (url) => ipcRenderer.invoke('open-in-browser', url),
  getFileList: () => ipcRenderer.invoke('get-file-list'),
  deleteFile: (fileName) => ipcRenderer.invoke('delete-file', fileName),
  clearAllFiles: () => ipcRenderer.invoke('clear-all-files'),
  addFiles: () => ipcRenderer.invoke('add-files'),
  addFolder: () => ipcRenderer.invoke('add-folder'),
  downloadFile: (fileName) => ipcRenderer.invoke('download-file', fileName)
});
