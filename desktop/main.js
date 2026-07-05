const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const path = require('path')

// Production URL — update when deploying to production
const PRODUCTION_URL = 'https://app.picklefund.uk'
// For local Docker usage: 'http://localhost'
const APP_URL = process.env.PICKLEFUND_URL || PRODUCTION_URL

// EPIC12: version hiển thị (Electron đọc từ package.json).
const APP_VERSION = app.getVersion()

function showAbout() {
  void dialog.showMessageBox({
    type: 'info',
    title: 'Giới thiệu PickleFund',
    message: 'PickleFund Desktop',
    detail: `Phiên bản ${APP_VERSION}\nMáy chủ: ${APP_URL}\n© 2026 PickleFund`,
    buttons: ['Đóng'],
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 600,
    title: `PickleFund v${APP_VERSION}`,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
    show: false,
  })

  // Show when ready to avoid white flash
  win.once('ready-to-show', () => win.show())

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  win.loadURL(APP_URL)

  // Minimal menu
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'PickleFund',
      submenu: [
        { label: 'Tải lại', accelerator: 'F5', click: () => win.reload() },
        { label: 'Mở DevTools', accelerator: 'F12', click: () => win.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: `Giới thiệu (v${APP_VERSION})`, click: () => showAbout() },
        { type: 'separator' },
        { label: 'Thoát', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
  ]))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
