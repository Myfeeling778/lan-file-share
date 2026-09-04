const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  startServer: (port) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  openShareDir: () => ipcRenderer.invoke('open-share-dir'),
  openInBrowser: (url) => ipcRenderer.invoke('open-in-browser', url),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  getFileList: (subPath) => ipcRenderer.invoke('get-file-list', subPath),
  deleteFile: (fileName) => ipcRenderer.invoke('delete-file', fileName),
  clearAllFiles: () => ipcRenderer.invoke('clear-all-files'),
  addFiles: () => ipcRenderer.invoke('add-files'),
  addFolder: () => ipcRenderer.invoke('add-folder'),
  downloadFile: (fileName) => ipcRenderer.invoke('download-file', fileName),
  dialogChoice: (choice) => ipcRenderer.invoke('dialog-choice', choice),
  dialogCancel: () => ipcRenderer.invoke('dialog-cancel'),
  dialogDontAsk: (checked) => ipcRenderer.invoke('dialog-dont-ask', checked),
  getConfig: () => ipcRenderer.invoke('get-config'),
  onStatusChanged: (cb) => ipcRenderer.on('status-changed', cb),
  onShowCloseDialog: (cb) => ipcRenderer.on('show-close-dialog', cb),
  closeDialogChoice: (choice, dontAsk) => ipcRenderer.invoke('close-dialog-choice', choice, dontAsk),
  closeDialogCancel: () => ipcRenderer.invoke('close-dialog-cancel')
});
