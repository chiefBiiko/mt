var fs = require('fs')
var net = require('net')
var pump = require('pump')

function noop () {}

function filePlug (onPumpEnd) {
  if (!onPumpEnd) onPumpEnd = noop
  var plug = net.createServer(function (socket) {
    socket.on('data', function (buf) {
      pump(fs.createReadStream(buf.toString()), socket, function (err) {
        if (err) {
          socket.destroy(err)
          return onPumpEnd(err)
        }
        plug.supplied++
        onPumpEnd(null, buf.toString())
      })
    })
  })
  plug.consume = function (port, host, filepath, callback) {
    var socket = net.connect(port, host, function () {
      socket.write(filepath, function () {
        plug.consumed++
        callback(null, socket)
      })
      socket.on('error', function (err) {
        callback(err)
      })
    })
  }
  plug.consumed = 0
  plug.supplied = 0
  return plug
}

module.exports = filePlug
