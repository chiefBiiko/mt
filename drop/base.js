var electron = require('electron')
var ipcMain = require('electron').ipcMain
var local = require('my-local-ip')
var fsPlug = require('./fs-plug/index')

var plug = fsPlug()
var mw

electron.app.on('ready', function () {
  mw = new electron.BrowserWindow({ width: 800, height: 400 })
  mw.loadURL('file://' + __dirname + '/index.html')
  mw.openDevTools()
})

ipcMain.on('plug-listen', function plugListenHandler (e, plugport) {
  if (plug.listening) {
    return plug.close(plugListenHandler.bind(null, e, plugport))
  }
  plug.supplied = plug.consumed = 0
  plug.listen(plugport, local())
})

ipcMain.on('supply-count', function (e, _) {
  e.sender.send('supplied-count', plug.supplied)
})

ipcMain.on('plug-consume',
           function (e, port, host, type, filepath, mypath, size, id) {
  plug.consume(port, host, type, filepath, mypath, function (err, mypath) {
    mw.setProgressBar(-1)
    e.sender.send('done-consumed', err, mypath, id)
  })
  plug.on('bytes-consumed', function (bytes) {
    mw.setProgressBar(bytes / size)
  })
})

process.on('exit', function () {
  plug.close()
})
