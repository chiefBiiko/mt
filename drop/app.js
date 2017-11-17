const electron = require('electron')

electron.app.on('ready', () => {
  const mainWindow = new electron.BrowserWindow({ width: 500, height: 500 })
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  mainWindow.openDevTools()
})
