var fs = require('fs')
var path = require('path')

function stat (entry, opts, cb) {
  if (opts.dereference) fs.stat(entry, cb)
  else fs.lstat(entry, cb)
}

function count (dir, opts, callback) {
  if (typeof opts === 'function') return count(dir, {}, opts)
  fs.readdir(dir, function (err, entries) {
    if (err) return callback(err)
    var pending = entries.length
    var files = 0
    var dirs = 0
    entries.map(function (entry) {
      return path.join('.', dir, entry) // is __dirname always available?
    }).forEach(function (fullpath) {
      stat(fullpath, opts, function (err, stats) {
        if (err) return callback(err)
        stats.isDirectory() ? dirs++ : files++
        if (!--pending) callback(null, { files: files, dirs: dirs })
      })
    })
  })
}

module.exports = count
