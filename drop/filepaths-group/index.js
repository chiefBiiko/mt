const countFiles = require('count-files')
const ops = require('pojo-ops')

module.exports = function group (filepaths, cb) {
  const trap = {
    entireDirectories: [],
    singleFiles: [],
    _files: [],
    _map: {}
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
  if (!ops.size(trap._map)) return trap
  // push keys of props that represent an entire dir to trap.entir... via temp
  var temp = []
  var size = ops.size(trap._map)
  ops.forEach(trap._map, (files, dir) => {
    console.log(dir)
    countFiles(dir, (err, count) => {
      if (err) cb(err, null)
      if (count.files === files.length) temp.push(dir)
      console.log(size)
      if (--size === 0) finish()
    })
  })
  // finish up
  function finish () {
    console.log('finishing')
    // collapse nested dirs in temp to trap.entireDirectories
    trap.entireDirectories.push(...temp.filter((dir, i, arr) => {
      return !arr.some(otherDir => RegExp(`${otherDir}.`).test(dir))
    }))
    // push filepaths that are not covered by trap.entir... to trap.singleFiles
    // trap.singleFiles.push(...trap._files.map(file => file.path).filter(filepath => {
    trap.singleFiles.push(...trap._files.filter(file => {
      return !trap.entireDirectories.some(dir => dir === file.dir)
      // return !ops.some(trap._map, (dirFiles, dir) => {
      //   return dirFiles.some(dirFile => dirFile === file)
      // })
    }).map(file => file.path))
    cb(null, trap)
  }
}
