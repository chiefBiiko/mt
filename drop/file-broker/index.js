var fs = require('fs')
var net = require('net')
var pump = require('pump')

function noop () {}

function fileBroker (onPumpEnd) {
  if (!onPumpEnd) onPumpEnd = noop
  var broker = net.createServer(function (socket) {
    socket.on('data', function (buf) {
      pump(fs.createReadStream(buf.toString()), socket, function (err) {
        if (err) return onPumpEnd(err)
        broker.supplied++
        onPumpEnd(null, buf.toString())
      })
    })
  })
  broker.consume = function (port, host, filepath, callback) {
    var socket = net.connect(port, host, function () {
      socket.write(filepath, function () {
        broker.consumed++
        callback(null, socket)
      })
      socket.on('error', function (err) {
        callback(err)
      })
    })
  }
  broker.consumed = 0
  broker.supplied = 0
  return broker
}

module.exports = fileBroker
