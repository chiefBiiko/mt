var fs = require('fs')
var path = require('path')

function stat (entry, opts, cb) {
  opts.dereference ? fs.stat(entry, cb) : fs.lstat(entry, cb)
}

function fulfill (dir, entry, opts) {
  return opts.full
    ? path.join(path.isAbsolute(dir) ? '' : __dirname, dir, entry) : entry
}

function wishlist (dir, opts, callback) {
  if (typeof opts === 'function') return wishlist(dir, {}, opts)
  fs.readdir(dir, function (err, entries) {
    if (err) return callback(err)
    var pending = entries.length
    var list = { dirs: [], files: [] }
    entries.forEach(function (entry) {
      stat(path.join(dir, entry), opts, function(err, stats) {
        if (err) return callback(err)
        if (stats.isDirectory()) list.dirs.push(fulfill(dir, entry, opts))
        else list.files.push(fulfill(dir, entry, opts))
        if (!--pending) callback(null, list)
      })
    })
  })
}

module.exports = wishlist
