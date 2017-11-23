var path = require('path')
var tape = require('tape')
var wishlistDirs = require('./index')

tape('names only', function (t) {

  wishlistDirs('.', function (err, data) {
    if (err) t.end(err)

    t.is(data.length, 1, 'should have detected 1 dir')
    t.is(data[0], 'node_modules', 'should have detected node_modules')

    t.end()
  })

})

tape('fullpaths', function (t) {

  var fullpath = path.join(__dirname, 'node_modules')

  wishlistDirs('.', { full: true }, function (err, data) {
    if (err) t.end(err)

    t.is(data.length, 1, 'should have detected 1 dir')
    console.log(data[0], fullpath)
    t.is(data[0], fullpath, 'should have detected ./node_modules')

    t.end()
  })

})
