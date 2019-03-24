var electron = require('electron')
var ipcMain = require('electron').ipcMain
var local = require('my-local-ip')
var fsPlug = require('fs-plug')

var menu = require('./menu.js')

var plug = fsPlug({ enforceWhitelist: false })
var mw

electron.app.on('ready', function () {
  mw = new electron.BrowserWindow({ width: 400, height: 400 })
  mw.loadURL('file://' + __dirname + '/index.html')
  electron.Menu.setApplicationMenu(menu)
})

ipcMain.on('plug-listen', function onlisten (e, plugport) {
  if (plug.listening) {
    return plug.close(onlisten.bind(null, e, plugport))
  }
  plug.supplied = plug.consumed = 0
  plug.listen(plugport, local())
})

ipcMain.on('supply-count', function (e, _) {
  e.sender.send('supplied-count', plug.supplied)
})

ipcMain.on('plug-consume', function (e, conf, size, iconid) {
  mw.setProgressBar(2)
  function onprogress (bytes) {
    mw.setProgressBar(bytes / size)
  }
  plug.on('bytes-consumed', onprogress)
  plug.consume(conf, function (err, localPath) {
    mw.setProgressBar(-1)
    plug.removeListener('bytes-consumed', onprogress)
    e.sender.send('plug-consumed', err, localPath, iconid)
  })
})

process.on('exit', function () {
  plug.close()
})
