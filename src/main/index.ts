import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from '../lib/ipc-handlers'
import { flushEmailQueue } from '../lib/email-queue'
import dns from 'dns'

let mainWindow: BrowserWindow | null = null
let wasOnline = false

function checkNetworkAndFlush() {
  dns.lookup('8.8.8.8', (err) => {
    const isOnline = !err
    if (isOnline && !wasOnline) {
      flushEmailQueue()
    }
    wasOnline = isOnline
    if (mainWindow) {
      mainWindow.webContents.send('network-status-changed', isOnline)
    }
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'KAVS Wandoor',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // Auto launch on Windows startup
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  createWindow()

  // Check network every 60 seconds
  setInterval(checkNetworkAndFlush, 60000)
  // Check immediately on startup
  setTimeout(checkNetworkAndFlush, 3000)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})