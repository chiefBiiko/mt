const fs = require('fs')
const path = require('path')
const countEntries = require('./count-top-entries/index')
const wishlist = require('./wishlist/index')

function gotAllNestedFiles (dir, map, cb) { // cb tells the truth
  countEntries(dir, function (err, count) {
    if (err) return cb(err)
    if (!map[dir] || (count.files !== map[dir].length)) {
      cb(null, false)
    } else if (!count.dirs) {
      cb(null, true)
    } else {
      wishlist(dir, { full: true }, function (err, wishlist) {
        if (err) return cb(err)
        wishlist.dirs.forEach(function (d) {
          gotAllNestedFiles(d, map, cb)
        })
      })
    }
  })
}

function maybeVerbose (opts, trap) {
  if (opts.verbose) return trap
  else return { entireDirs: trap.entireDirs, singleFiles: trap.singleFiles }
}

function group (filepaths, opts, callback) {
  if (typeof opts === 'function') return group(filepaths, {}, opts)
  if (!callback) throw new Error('gimme a callback, gonna callback(err, data)')
  var trap = { entireDirs: [], singleFiles: [], _f: [], _m: {}, _t: [] }
  // split filepaths into file objects
  trap._f = filepaths.map(function (filepath) {
    return { path: filepath, dir: filepath.replace(/^(.+)(\/|\\).*$/, '$1') }
  })
  // if single file input always early return as singleFile
  if (trap._f.length === 1) {
    trap.singleFiles.push(trap._f[0].path)
    return callback(null, trap)
  }
  // map files to dirs
  trap._m = trap._f.reduce(function (acc, cur) {
    if (acc.hasOwnProperty(cur.dir)) acc[cur.dir].push(cur.path)
    else acc[cur.dir] = [ cur.path ]
    return acc
  }, {})
  // push keys of props that represent an entire dir to trap.entir... via temp
  var dirs = Object.keys(trap._m)
  var pending = dirs.length
  dirs.forEach(function (dir) {
    gotAllNestedFiles(dir, trap._m, function (err, truth) {
      if (err) return callback(err, null)
      if (truth) trap._t.push(dir)
      if (!--pending) finishUp()
    })
  })
  // finish
  function finishUp () {
    // push filepaths that are not covered by trap._t to trap.singleFiles
    Array.prototype.push.apply(trap.singleFiles,
      trap._f.filter(function (file) {
        return !trap._t.some(function (dir) { return dir === file.dir })
      }).map(function (file) { return file.path })
    )
    // collapse nested dirs in temp to trap.entireDirs
    Array.prototype.push.apply(trap.entireDirs,
      trap._t.filter(function (dir, i, arr) {
        var others = arr.filter(function (d) { return d !== dir })
        return !others.some(function (other) { return dir.startsWith(other) })
      })
    )
    callback(null, maybeVerbose(opts, trap))
  }
}

module.exports = group
