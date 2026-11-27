const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    title: '追番养肥看板 Pro',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 直接加载你上传的 HTML 文件
  win.loadFile('追番养肥看板_优化版11.html');

  // 拦截网页里触发的外部协议（如 animeshelf: 或 file:）
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

// 解析 animeshelf: 协议或本地路径并直接调用 Windows 默认程序
function handleCustomOpen(rawUrl) {
  try {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      shell.openExternal(rawUrl);
      return;
    }
    let decoded = decodeURIComponent(rawUrl);
    // 尝试提取 Windows 盘符路径（例如 C:\... 或 D:/...）
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
    shell.openPath(targetPath.replace(/\//g, '\\'));
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
