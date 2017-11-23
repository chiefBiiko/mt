var fs = require('fs')
var path = require('path')

function stat (entry, opts, cb) {
  opts.dereference ? fs.stat(entry, cb) : fs.lstat(entry, cb)
}

function wishlistDirs (dir, opts, callback) {
  if (typeof opts === 'function') return wishlistDirs(dir, {}, opts)
  fs.readdir(dir, function (err, entries) {
    if (err) return callback(err)
    var pending = entries.length
    var list = []
    entries.forEach(function (entry) {
      stat(path.join(dir, entry), opts, function(err, stats) {
        if (err) return callback(err)
        if (stats.isDirectory()) list.push(entry)
        if (!--pending) callback(null, list)
      })
    })
  })
}

module.exports = wishlistDirs
