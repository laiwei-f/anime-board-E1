const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function getExeDir() {
  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
}

function getCustomDataDir() {
  const exeDir = getExeDir();
  const configFile = path.join(exeDir, 'data_path.txt');
  try {
    if (fs.existsSync(configFile)) {
      const customPath = fs.readFileSync(configFile, 'utf-8').trim();
      if (customPath) return customPath;
    }
  } catch (e) {}
  return path.join(exeDir, 'Data');
}

const targetDataDir = getCustomDataDir();
if (!fs.existsSync(targetDataDir)) {
  fs.mkdirSync(targetDataDir, { recursive: true });
}
app.setPath('userData', targetDataDir);

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    title: '追番养肥看板 Pro',
    icon: path.join(__dirname, 'build/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('追番养肥看板_优化版11.html');

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') || !url.endsWith('.html')) {
      event.preventDefault();
      handleCustomOpen(url);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    handleCustomOpen(url);
    return { action: 'deny' };
  });
}

function handleCustomOpen(rawUrl) {
  try {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      shell.openExternal(rawUrl);
      return;
    }
    let decoded = decodeURIComponent(rawUrl);
    const winPathMatch = decoded.match(/([a-zA-Z]:[\\\/][^"'&?]+)/);
    if (winPathMatch) {
      const targetPath = winPathMatch[1].replace(/\//g, '\\');
      shell.openPath(targetPath);
    }
  } catch (e) {
    console.error('打开失败:', e);
  }
}

ipcMain.on('open-local-path', (event, targetPath) => {
  if (targetPath) {
    const winPathMatch = targetPath.match(/([a-zA-Z]:[\\\/][^"'&?]+)/);
    const finalPath = winPathMatch ? winPathMatch[1] : targetPath;
    shell.openPath(finalPath.replace(/\//g, '\\'));
  }
});

ipcMain.on('open-data-folder', () => {
  const dir = getCustomDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  shell.openPath(dir);
});

ipcMain.handle('get-current-data-path', () => {
  return getCustomDataDir();
});

ipcMain.handle('set-custom-data-path', (event, newPath) => {
  const trimmed = (newPath || '').trim();
  if (!trimmed) return { ok: false, msg: '路径不能为空' };
  try {
    const configFile = path.join(getExeDir(), 'data_path.txt');
    fs.writeFileSync(configFile, trimmed, 'utf-8');
    if (!fs.existsSync(trimmed)) fs.mkdirSync(trimmed, { recursive: true });
    return { ok: true, msg: '保存成功，关闭并重启软件后生效' };
  } catch (e) {
    return { ok: false, msg: '保存失败: ' + e.message };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
