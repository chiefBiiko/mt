var fs = require('fs')
var path = require('path')

function stat (entry, opts, cb) {
  opts.dereference ? fs.stat(entry, cb) : fs.lstat(entry, cb)
}

function count (dir, opts, callback) {
  if (typeof opts === 'function') return count(dir, {}, opts)
  fs.readdir(dir, function (err, entries) {
    if (err) return callback(err)
    var pending = entries.length
    var stash = { dirs: 0, files: 0 }
    entries.forEach(function (entry) {
      stat(path.join(dir, entry), opts, function (err, stats) {
        if (err) return callback(err)
        if (stats.isDirectory()) stash.dirs++
        else if (stats.isFile()) stash.files++
        if (!--pending) callback(null, stash)
      })
    })
  })
}

module.exports = count
