const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')

// Production URL — update when deploying to production
const PRODUCTION_URL = 'https://app.picklefund.uk'
// For local Docker usage: 'http://localhost'
const APP_URL = process.env.PICKLEFUND_URL || PRODUCTION_URL

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 600,
    title: 'PickleFund',
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
