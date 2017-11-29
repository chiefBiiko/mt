var electron = require('electron')
var ipcMain = require('electron').ipcMain
var local = require('my-local-ip')
var fsPlug = require('./fs-plug/index')

var plug = fsPlug()

electron.app.on('ready', function () {
  var mw = new electron.BrowserWindow({ width: 300, height: 300 })
  mw.loadURL('file://' + __dirname + '/index.html')
  mw.openDevTools()
})

ipcMain.on('plug-listen', function (e, plugport) {
  plug.supplied = 0
  plug.consumed = 0
  plug.listen(plugport, local(), function () {
    console.log('plug listening @ ' + plug.address().address + ':' + plugport)
  })
})

ipcMain.on('plug-consume',
           function (e, port, host, type, size, filepath, mypath) {
   // use size here to update progress bar
   plug.consume(port, host, type, filepath, mypath, function (err, mypath) {
     e.sender.send('done-consumed', err, mypath)
   })
})

ipcMain.on('supply-count', function (e, _) {
  e.sender.send('supplied-count', plug.supplied)
})
