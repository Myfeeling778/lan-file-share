const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { startServer, stopServer, getServerStatus } = require('./server');

let mainWindow = null;
let tray = null;

const isPackaged = app.isPackaged;
const appRoot = isPackaged ? path.dirname(app.getPath('exe')) : path.join(__dirname, '..');
const shareDir = isPackaged ? path.join(appRoot, 'share') : path.join(__dirname, '..', 'share');
const configDir = app.getPath('userData');
const configPath = path.join(configDir, 'config.json');

if (!fs.existsSync(shareDir)) {
  fs.mkdirSync(shareDir, { recursive: true });
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return { closeToTray: false, dontAskAgain: false, port: 18080 };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch {}
}

function getLocalIP() {
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

let isQuitting = false;
let closeDialogShown = false;

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip('局域网文件分享');
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const status = getServerStatus();
  const menu = Menu.buildFromTemplate([
    { label: '局域网文件分享', enabled: false },
    { type: 'separator' },
    { label: status.running ? '● 服务运行中' : '○ 服务已停止', enabled: false },
    { type: 'separator' },
    {
      label: '显示主窗口',
      click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } }
    },
    {
      label: status.running ? '停止服务' : '启动服务',
      click: async () => {
        if (status.running) {
          await stopServer();
        } else {
          const cfg = loadConfig();
          await startServer(cfg.port || 18080, shareDir, getLocalIP());
        }
        updateTrayMenu();
        if (mainWindow) mainWindow.webContents.send('status-changed');
      }
    },
    { type: 'separator' },
    { label: '打开共享目录', click: () => shell.openPath(shareDir) },
    { type: 'separator' },
    {
      label: '退出',
      click: async () => {
        isQuitting = true;
        await stopServer();
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
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

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;
    const cfg = loadConfig();
    if (cfg.dontAskAgain) {
      e.preventDefault();
      if (cfg.closeToTray) {
        mainWindow.hide();
      } else {
        isQuitting = true;
        await stopServer();
        app.quit();
      }
      return;
    }
    if (closeDialogShown) return;
    e.preventDefault();
    closeDialogShown = true;
    mainWindow.webContents.send('show-close-dialog');
  });
}

// --- IPC Handlers ---

ipcMain.handle('close-dialog-choice', async (event, choice, dontAsk) => {
  closeDialogShown = false;
  const cfg = loadConfig();
  if (dontAsk) {
    cfg.dontAskAgain = true;
    cfg.closeToTray = (choice === 'tray');
    saveConfig(cfg);
  }
  if (choice === 'tray') {
    if (mainWindow) mainWindow.hide();
  } else if (choice === 'exit') {
    isQuitting = true;
    await stopServer();
    app.quit();
  }
});

ipcMain.handle('close-dialog-cancel', () => {
  closeDialogShown = false;
});

ipcMain.handle('get-local-ip', () => getLocalIP());

ipcMain.handle('start-server', async (event, port) => {
  try {
    const cfg = loadConfig();
    cfg.port = port;
    saveConfig(cfg);
    await startServer(port, shareDir, getLocalIP());
    updateTrayMenu();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-server', async () => {
  try {
    await stopServer();
    updateTrayMenu();
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

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_NAME = 'LanShare';

ipcMain.handle('get-auto-start', () => {
  try {
    const result = execSync(`reg query "${REG_KEY}" /v "${APP_NAME}" 2>nul`, { encoding: 'utf-8' });
    return result.includes(APP_NAME);
  } catch {
    return false;
  }
});

ipcMain.handle('set-auto-start', (event, enabled) => {
  try {
    if (enabled) {
      const exePath = app.getPath('exe');
      execSync(`reg add "${REG_KEY}" /v "${APP_NAME}" /t REG_SZ /d "${exePath}" /f`, { encoding: 'utf-8' });
    } else {
      execSync(`reg delete "${REG_KEY}" /v "${APP_NAME}" /f`, { encoding: 'utf-8' });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-file-list', (event, subPath) => {
  try {
    const targetDir = subPath ? safePathJoin(shareDir, subPath) : shareDir;
    if (!targetDir) return [];
    const files = fs.readdirSync(targetDir);
    return files.map(name => {
      const filePath = path.join(targetDir, name);
      try {
        const stat = fs.statSync(filePath);
        return { name, size: stat.size, mtime: stat.mtime.toISOString(), isDirectory: stat.isDirectory() };
      } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
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
      if (safePath) fs.rmSync(safePath, { recursive: true, force: true });
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
      if (safePath) fs.copyFileSync(filePath, safePath);
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
    if (targetDir) fs.cpSync(folderPath, targetDir, { recursive: true });
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-config', () => loadConfig());

app.whenReady().then(() => {
  createTray();
  createWindow();
});

app.on('window-all-closed', async () => {
  if (isQuitting) {
    await stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});
