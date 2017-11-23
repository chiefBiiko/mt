var fs = require('fs')
var path = require('path')

function stat (entry, opts, cb) {
  if (opts.dereference) fs.stat(entry, cb)
  else fs.lstat(entry, cb)
}

function fulfill (entries) {
  return entries.map(function (entry) {
    return path.join(__dirname, entry)
  })
}

function wishlistDirs (dir, opts, callback) {
  if (typeof opts === 'function') return wishlistDirs(dir, {}, opts)
  fs.readdir(dir, function (err, entries) {
    if (err) return callback(err)
    var pending = entries.length
    var list = []
    entries.forEach(function (entry, i) {
      stat(path.join(dir, entry), opts, function(err, stats) {
        if (err) return callback(err)
        if (stats.isDirectory()) list.push(entry)
        if (!--pending) return callback(null, opts.full ? fulfill(list) : list)
      })
    })
  })
}

module.exports = wishlistDirs
