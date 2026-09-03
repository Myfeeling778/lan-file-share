const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer, stopServer, getServerStatus } = require('./server');

let mainWindow = null;

const isPackaged = app.isPackaged;
const appRoot = isPackaged ? path.dirname(app.getPath('exe')) : path.join(__dirname, '..');
const shareDir = isPackaged ? path.join(appRoot, 'share') : path.join(__dirname, '..', 'share');

if (!fs.existsSync(shareDir)) {
  fs.mkdirSync(shareDir, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 750,
    minHeight: 600,
    title: '局域网文件分享',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168')) {
        return iface.address;
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function safePathJoin(base, ...args) {
  const target = path.join(base, ...args);
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    return null;
  }
  return resolvedTarget;
}

ipcMain.handle('get-local-ip', () => getLocalIP());

ipcMain.handle('start-server', async (event, port) => {
  try {
    await startServer(port, shareDir, getLocalIP());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-server', async () => {
  try {
    await stopServer();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-server-status', () => getServerStatus());

ipcMain.handle('open-share-dir', async () => {
  await shell.openPath(shareDir);
});

ipcMain.handle('open-in-browser', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-file-list', () => {
  try {
    const files = fs.readdirSync(shareDir);
    return files.map(name => {
      const filePath = path.join(shareDir, name);
      try {
        const stat = fs.statSync(filePath);
        return {
          name,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          isDirectory: stat.isDirectory()
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
});

ipcMain.handle('delete-file', (event, fileName) => {
  const safePath = safePathJoin(shareDir, fileName);
  if (!safePath) return { success: false, error: 'Invalid path' };
  try {
    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      fs.rmSync(safePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(safePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-all-files', () => {
  try {
    const files = fs.readdirSync(shareDir);
    for (const file of files) {
      const safePath = safePathJoin(shareDir, file);
      if (safePath) {
        fs.rmSync(safePath, { recursive: true, force: true });
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('download-file', async (event, fileName) => {
  const safePath = safePathJoin(shareDir, fileName);
  if (!safePath) return { success: false, error: 'Invalid path' };
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled) return { success: false, canceled: true };
    fs.copyFileSync(safePath, result.filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('add-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections']
  });
  if (!result.canceled) {
    for (const filePath of result.filePaths) {
      const fileName = path.basename(filePath);
      const safePath = safePathJoin(shareDir, fileName);
      if (safePath) {
        fs.copyFileSync(filePath, safePath);
      }
    }
    return { success: true, count: result.filePaths.length };
  }
  return { success: false, count: 0 };
});

ipcMain.handle('add-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const folderName = path.basename(folderPath);
    const targetDir = safePathJoin(shareDir, folderName);
    if (targetDir) {
      fs.cpSync(folderPath, targetDir, { recursive: true });
    }
    return { success: true };
  }
  return { success: false };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  await stopServer();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
