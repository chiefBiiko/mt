var fs = require('fs')
var net = require('net')
var zlib = require('zlib')
var tar = require('tar-fs')
var pump = require('pump')

function noop () {}

function stat (entry, opts, cb) {
  opts.dereference ? fs.stat(entry, cb) : fs.lstat(entry, cb)
}

function filePlug (opts, onconsumer) {
  if (typeof opts === 'function') return filePlug({}, opts)
  else if (!opts && !onconsumer) return filePlug({}, noop)
  var plug = net.createServer(function (socket) {
    socket.on('data', function (buf) {
      var filepath = buf.toString()
      stat(filepath, opts, function (err, stats) {
        if (err) return onconsumer(err)
        var readStream = stats.isDirectory()
          ? tar.pack(filepath) : fs.createReadStream(filepath)
        pump(readStream, zlib.createGzip(), socket, function (err) {
          if (err) return onconsumer(err)
          plug.supplied++
          onconsumer(null, filepath)
        })
      })
    })
  })
  plug.consume = function (port, host, type, filepath, mypath, callback) {
    if (!callback) callback = noop
    var socket = net.connect(port, host, function () {
      socket.write(filepath, function () {
        var writeStream =
          fs.createWriteStream(type === 'file' ? mypath : mypath + '.tar')
        pump(socket, zlib.createGunzip(), writeStream, function (err) {
          if (err) return callback(err)
          plug.consumed++
          if (type === 'file') {
            callback(null, mypath)
          } else {
            var tarStream = fs.createReadStream(mypath + '.tar')
            pump(tarStream, tar.extract(mypath), function (err) {
              if (err) return callback(err)
              fs.unlink(mypath + '.tar', function (err) {
                if (err) return callback(err)
                callback(null, mypath)
              })
            })
          }
        })
        setTimeout(function () {
          if (!socket.bytesRead) socket.destroy('consume timeout')
        }, 250)
      })
    })
  }
  plug.consumed = 0
  plug.supplied = 0
  return plug
}

module.exports = filePlug
