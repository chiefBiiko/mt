var fs = require('fs')
var net = require('net')
var pump = require('pump')

function fileBroker () {
  var broker = net.createServer(function (socket) {
    socket.on('data', function (buf) {
      pump(fs.createReadStream(buf.toString()), socket, function (err) {
        if (!err) broker.supplied++
      })
    })
  })
  broker.consume = function (port, host, filepath, mypath, callback) {
    var socket = net.connect(port, host, function () {
      socket.write(filepath)
      pump(socket, fs.createWriteStream(mypath), function (err) {
        if (!err) broker.consumed++
        socket.destroy()
        callback(err)
      })
    })
  }
  broker.consumed = 0
  broker.supplied = 0
  return broker
}

module.exports = fileBroker
