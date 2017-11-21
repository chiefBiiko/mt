const countFiles = require('count-files')
const ops = require('pojo-ops')

module.exports = function group (filepaths, cb) {
  const trap = {
    entireDirectories: [],
    singleFiles: [],
    _files: [],
    _map: {},
    _temp: []
  }
  if (!cb) throw new Error('gimme a callback, gonna do cb(err, data)')
  // split filepaths into file objects
  trap._files = filepaths.map(filepath => {
    return {
      name: filepath.replace(/^.+(\/|\\)(.+)$/, '$2'),
      path: filepath,
      dir: filepath.replace(/^(.+(\/|\\)).*$/, '$1')
    }
  })
  // map files to dirs
  trap._map = trap._files.reduce((acc, cur) => {
    const dir = cur.path.replace(cur.name, '')
    acc.hasOwnProperty(dir) ? acc[dir].push(cur.path) : acc[dir] = [ cur.path ]
    return acc
  }, {})
  // push keys of props that represent an entire dir to trap.entir... via temp
  var size = ops.size(trap._map)
  ops.forEach(trap._map, (files, dir) => {
    countFiles(dir, (err, count) => {
      if (err) cb(err, null)
      if (count.files - count.dirs === files.length) trap._temp.push(dir)
      if (--size === 0) finish()
    })
  })
  // finish up
  function finish () {
    // push filepaths that are not covered by trap._temp to trap.singleFiles
    trap.singleFiles.push(...trap._files.filter(file => {
      return !trap._temp.some(dir => dir === file.dir)
    }).map(file => file.path))
    // collapse nested dirs in temp to trap.entireDirectories
    trap.entireDirectories.push(...trap._temp.filter((dir, i, arr) => {
      return !arr.filter(d => d !== dir).some(other => dir.startsWith(other))
    }))
    return cb(null, trap)
  }
}
