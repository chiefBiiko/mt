const fs = require('fs')
const path = require('path')

const countEntries = require('./count-top-entries/index')
const ops = require('pojo-ops')

function listDirs (dirpath) {
  return fs.readdirSync(dirpath)
    .map(entry => path.join(dirpath, entry))
    .filter(filepath => fs.statSync(filepath).isDirectory())
}

function gotAllNestedFiles (dir, map, cb) { // cb tells the truth
  countEntries(dir, (err, count) => {
    if (err) return cb(err, null)
    if (!map[dir] || (count.files !== map[dir].length)) cb(null, false)
    else if (!count.dirs) cb(null, true)
    else listDirs(dir).forEach(d => gotAllNestedFiles(d, map, cb))
  })
}

function group (filepaths, callback) {
  const trap = {
    entireDirectories: [],
    singleFiles: [],
    _files: [],
    _map: {},
    _temp: []
  }
  if (!callback) throw new Error('gimme a callback, gonna callback(err, data)')
  // split filepaths into file objects
  trap._files = filepaths.map(filepath => {
    return {
      name: filepath.replace(/^.+(\/|\\)(.+)$/, '$2'),
      path: filepath,
      dir: filepath.replace(/^(.+)(\/|\\).*$/, '$1')
    }
  })
  // if single file input always early return as singleFile
  if (trap._files.length === 1) {
    trap.singleFiles.push(trap._files[0].path)
    return callback(null, trap)
  }
  // map files to dirs
  trap._map = trap._files.reduce((acc, cur) => {
    acc.hasOwnProperty(cur.dir)
      ? acc[cur.dir].push(cur.path) : acc[cur.dir] = [ cur.path ]
    return acc
  }, {})
  // push keys of props that represent an entire dir to trap.entir... via temp
  var pending = ops.size(trap._map)
  ops.forEach(trap._map, (files, dir) => {
    gotAllNestedFiles(dir, trap._map, (err, truth) => {
      if (err) return callback(err, null)
      if (truth) trap._temp.push(dir)
      if (--pending === 0) finishUp()
    })
  })
  // finish
  function finishUp () {
    // push filepaths that are not covered by trap._temp to trap.singleFiles
    trap.singleFiles.push(...trap._files.filter(file => {
      return !trap._temp.some(dir => dir === file.dir)
    }).map(file => file.path))
    // collapse nested dirs in temp to trap.entireDirectories
    trap.entireDirectories.push(...trap._temp.filter((dir, i, arr) => {
      return !arr.filter(d => d !== dir).some(other => dir.startsWith(other))
    }))
    callback(null, trap)
  }
}

module.exports = group
