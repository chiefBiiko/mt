var fs = require('fs')
var path = require('path')
var tape = require('tape')
var group = require('./index')

var files = [
  { path: path.join(__dirname, 'noop0.txt'), size: 3 },
  { path: path.join(__dirname, 'fraud', 'noop1.txt'), size: 3 },
  { path: path.join(__dirname, 'fraud', 'noop2.txt'), size: 3 },
  { path: path.join(__dirname, 'fraud', 'z', 'z.txt'), size: 3 }
]

fs.mkdirSync(path.join(__dirname, 'fraud'))
fs.mkdirSync(path.join(__dirname, 'fraud', 'z'))

files.forEach(function (file) {
  fs.writeFileSync(file.path, '419')
})

tape.onFinish(function () {
  files.forEach(function (file, i , arr) {
    fs.unlinkSync(file.path)
    if (i === arr.length - 1) {
      fs.rmdirSync(path.join(__dirname, 'fraud', 'z'))
      fs.rmdirSync(path.join(__dirname, 'fraud'))
    }
  })
})

tape('filepaths-group multiple filepaths', function (t) {

  group(files, function (err, data) {
    if (err) t.end(err)

    var d = data.filter(function (item) {
      return item.type === 'directory'
    })
    var f = data.filter(function (item) {
      return item.type === 'file'
    })

    t.is(d.length, 1, 'should have detected 1 entire dir')
    t.is(f.length, 1, 'should have detected 1 single file')

    t.end()
  })

})

tape('filepaths-group one filepath', function (t) {

  group(files.slice(files.length - 1), function (err, data) {
    if (err) t.end(err)

    var d = data.filter(function (item) {
      return item.type === 'directory'
    })
    var f = data.filter(function (item) {
      return item.type === 'file'
    })

    t.is(d.length, 0, 'should not indicate any dir')
    t.is(f.length, 1, 'should detect 1 single file')

    t.end()
  })

})

tape('opts.size', function (t) {

  group(files, { size: true }, function (err, data) {
    if (err) t.end(err)

    var gotSized = data.every(function (item) {
      return item.hasOwnProperty('size') && typeof item.size === 'number'
    })

    t.ok(gotSized, 'every group item should have a size property')

    t.end()
  })

})
