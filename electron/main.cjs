const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

// Everything the app saves lives in a visible folder the user can open/backup:
//   Documents\YouthClub Billing\data.json   (clients + bills + settings)
//   Documents\YouthClub Billing\Exports\    (PDF / Excel / Word files)
const dataDir = process.env.YCB_DATA_DIR || path.join(app.getPath('documents'), 'YouthClub Billing')
const exportsDir = path.join(dataDir, 'Exports')
const dataFile = path.join(dataDir, 'data.json')

function ensureDirs() {
  fs.mkdirSync(exportsDir, { recursive: true })
}

ipcMain.on('load-state', (e) => {
  try {
    e.returnValue = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, 'utf8') : null
  } catch {
    e.returnValue = null
  }
})

ipcMain.handle('save-state', (_e, json) => {
  ensureDirs()
  // write via temp file so a crash mid-write never corrupts data.json
  const tmp = dataFile + '.tmp'
  fs.writeFileSync(tmp, json)
  fs.renameSync(tmp, dataFile)
})

ipcMain.handle('save-file', (_e, filename, buffer) => {
  ensureDirs()
  const safe = String(filename).replace(/[\\/:*?"<>|]+/g, '-')
  const target = path.join(exportsDir, safe)
  fs.writeFileSync(target, Buffer.from(buffer))
  shell.showItemInFolder(target)
  return target
})

ipcMain.handle('open-data-folder', () => {
  ensureDirs()
  shell.openPath(dataDir)
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    show: false,
    backgroundColor: '#0d1117',
    title: 'YouthClub Billing',
    icon: path.join(__dirname, '..', 'build-res', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  })
  Menu.setApplicationMenu(null)
  win.maximize()
  win.once('ready-to-show', () => win.show())

  // blob: URLs (PDF viewer tab) open inside the app; real links go to the browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: '#333' } }
  })

  win.loadFile(path.join(__dirname, '..', 'dist-app', 'index.html'))
}

app.whenReady().then(() => {
  ensureDirs()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
