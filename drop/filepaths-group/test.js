var fs = require('fs')
var path = require('path')
var tape = require('tape')
var group = require('./index')

fs.mkdirSync(path.join(__dirname, 'fraud'))
fs.mkdirSync(path.join(__dirname, 'fraud', 'z'))

var filepaths = [
  path.join(__dirname, 'noop0.txt'),
  path.join(__dirname, 'fraud', 'noop1.txt'),
  path.join(__dirname, 'fraud', 'noop2.txt'),
  path.join(__dirname, 'fraud', 'z', 'z.txt')
]

filepaths.forEach(function (filepath) {
  fs.writeFileSync(filepath, '419')
})

tape.onFinish(function () {
  filepaths.forEach(function (filepath, i , arr) {
    fs.unlinkSync(filepath)
    if (i === arr.length - 1) {
      fs.rmdirSync(path.join(__dirname, 'fraud', 'z'))
      fs.rmdirSync(path.join(__dirname, 'fraud'))
    }
  })
})

tape('filepaths-group multiple filepaths', function (t) {

  group(filepaths, function (err, data) {
    if (err) t.end(err)

    var dirs = data.filter(function (obj) {
      return obj.type === 'directory'
    })
    var files = data.filter(function (obj) {
      return obj.type === 'file'
    })

    t.is(dirs.length, 1, 'should have detected 1 entire dir')
    t.is(files.length, 1, 'should have detected 1 single file')

    t.end()
  })

})

tape('filepaths-group one filepath', function (t) {

  group(filepaths.slice(filepaths.length - 1), function (err, data) {
    if (err) t.end(err)

    var dirs = data.filter(function (obj) {
      return obj.type === 'directory'
    })
    var files = data.filter(function (obj) {
      return obj.type === 'file'
    })

    t.is(dirs.length, 0, 'should not indicate any dir')
    t.is(files.length, 1, 'should detect 1 single file')

    t.end()
  })

})
