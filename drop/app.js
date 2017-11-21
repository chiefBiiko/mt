const electron = require('electron')

electron.app.on('ready', () => {
  const mainWindow = new electron.BrowserWindow({ width: 400, height: 400 })
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  mainWindow.openDevTools()
})
