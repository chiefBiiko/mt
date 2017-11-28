var count = require('count-top-entries')
var wishlist = require('./wishlist/index')

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

// designed to be used with ferross drag-drop module
function group (files, opts, callback) { // opts: { size: boolean }
  if (typeof opts === 'function') return group(files, {}, opts)
  var trap = { dirs: [], files: [], paths: [], fdir: [], map: {}, temp: [] }
  var groups = []
  Array.prototype.push.apply(trap.paths, files.map(function (file) {
    return file.path
  }))
  // if single file input always early return as single file
  if (!trap.paths.length)
    return callback(null, [])
  else if (trap.paths.length === 1)
    return callback(null, [ { type: 'file', path: trap.paths[0] } ])
  // split paths into file objects
  trap.fdir = trap.paths.map(function (filepath) {
    return { path: filepath, dir: filepath.replace(/^(.+)(\/|\\).*$/, '$1') }
  })
  // map files to dirs
  trap.map = trap.fdir.reduce(function (acc, cur) {
    if (acc.hasOwnProperty(cur.dir)) acc[cur.dir].push(cur.path)
    else acc[cur.dir] = [ cur.path ]
    return acc
  }, {})
  // push keys of props that represent an entire dir to trap.dirs... via trap.t
  var dirs = Object.keys(trap.map)
  var pending = dirs.length
  dirs.forEach(function (dir) {
    gotAllNestedFiles(dir, trap.map, function (err, truth) {
      if (err) return callback(err, null)
      if (truth) trap.temp.push(dir)
      if (!--pending) finishUp()
    })
  })
  // finish
  function finishUp () {
    // push paths that are not covered by trap.t to trap.files
    Array.prototype.push.apply(trap.files,
      trap.fdir.filter(function (file) {
        return !trap.temp.some(function (dir) {
          return dir === file.dir
        })
      }).map(function (file) {
        return file.path
      })
    )
    // collapse nested dirs in trap.t to trap.dirs
    Array.prototype.push.apply(trap.dirs,
      trap.temp.filter(function (dir, i, arr) {
        return !arr.filter(function (d) {
          return d !== dir
        }).some(function (other) {
          return dir.startsWith(other)
        })
      })
    )
    // package neatly
    groups = trap.files.map(function (file) {
      return { type: 'file', path: file }
    }).concat(trap.dirs.map(function (dir) {
      return { type: 'directory', path: dir }
    }))
    // maybe add size
    if (opts.size) {
      groups = groups.map(function (item, i) {
        if (item.type === 'file') {
          item.size = files.filter(function (file) {
            return file.path === item.path
          })[0].size
        } else {
          item.size = files.reduce(function (acc, cur) {
            if (cur.path.startsWith(item.path)) acc += cur.size
            return acc
          }, 0)
        }
        return item
      })
    }
    callback(null, groups)
  }
}

module.exports = group
