const count = require('count-top-entries')
const wishlist = require('./wishlist/index')

function gotAllNestedFiles (dir, map, cb) { // cb tells the truth
  count(dir, function (err, data) {
    if (err) return cb(err)
    if (!map[dir] || (data.files !== map[dir].length)) {
      cb(null, false)
    } else if (!data.dirs) {
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

// function maybeVerbose (opts, trap) {
//   if (opts.verbose) return trap
//   else return { dirs: trap.dirs, files: trap.files }
// }

function group (filepaths, opts, callback) {
  if (typeof opts === 'function') return group(filepaths, {}, opts)
  if (!callback) throw new Error('gimme a callback, gonna callback(err, data)')
  var trap = { groups: [], dirs: [], files: [], f: [], m: {}, t: [] }
  // split filepaths into file objects
  trap.f = filepaths.map(function (filepath) {
    return { path: filepath, dir: filepath.replace(/^(.+)(\/|\\).*$/, '$1') }
  })
  // if single file input always early return as single file
  if (trap.f.length === 1) {
    return callback(null, [ { type: 'file', path: trap.f[0].path } ])
  }
  // map files to dirs
  trap.m = trap.f.reduce(function (acc, cur) {
    if (acc.hasOwnProperty(cur.dir)) acc[cur.dir].push(cur.path)
    else acc[cur.dir] = [ cur.path ]
    return acc
  }, {})
  // push keys of props that represent an entire dir to trap.dirs... via trap.t
  var dirs = Object.keys(trap.m)
  var pending = dirs.length
  dirs.forEach(function (dir) {
    gotAllNestedFiles(dir, trap.m, function (err, truth) {
      if (err) return callback(err, null)
      if (truth) trap.t.push(dir)
      if (!--pending) finishUp()
    })
  })
  // finish
  function finishUp () {
    // push filepaths that are not covered by trap.t to trap.files
    Array.prototype.push.apply(trap.files,
      trap.f.filter(function (file) {
        return !trap.t.some(function (dir) { return dir === file.dir })
      }).map(function (file) { return file.path })
    )
    // collapse nested dirs in trap.t to trap.dirs
    Array.prototype.push.apply(trap.dirs,
      trap.t.filter(function (dir, i, arr) {
        var others = arr.filter(function (d) { return d !== dir })
        return !others.some(function (other) { return dir.startsWith(other) })
      })
    )
    // package neatly
    trap.groups = trap.files.map(function (file) {
      return { type: 'file', path: file }
    })
    Array.prototype.push.apply(trap.groups,
      trap.dirs.map(function (dir) {
        return { type: 'directory', path: dir }
      })
    )
    callback(null, trap.groups)
  }
}

module.exports = group
