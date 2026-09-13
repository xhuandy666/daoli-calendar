const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');

if (process.env.DAOLI_TEST_USER_DATA) app.setPath('userData', process.env.DAOLI_TEST_USER_DATA);
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  function createWindow() {
    const window = new BrowserWindow({
      width: 1220, height: 920, minWidth: 760, minHeight: 600,
      title: '道历', backgroundColor: '#f4efe3',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.loadFile(path.join(__dirname, '../www/index.html'));
  }
  app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: '道历', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { type: 'separator' }, { role: 'quit' }] },
      { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '显示', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
      { label: '窗口', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }] }
    ]));
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('second-instance', () => { const window = BrowserWindow.getAllWindows()[0]; if (window) { window.restore(); window.focus(); } });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
