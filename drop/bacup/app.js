var electron = require('electron')

electron.app.on('ready', function () {
  var mw = new electron.BrowserWindow({ width: 300, height: 300 })
  mw.loadURL('file://' + __dirname + '/index.html')
  mw.openDevTools()
})
