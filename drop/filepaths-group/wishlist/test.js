var path = require('path')
var tape = require('tape')
var wishlist = require('./index')

tape('names only', function (t) {

  wishlist('.', function (err, list) {
    if (err) t.end(err)

    t.is(list.dirs.length, 1, 'should have detected 1 dir')
    t.is(list.dirs[0], 'node_modules', 'should have detected node_modules')
    t.ok(list.files.indexOf('test.js') !== -1, 'test.js should be among files')

    t.end()
  })

})

tape('fullpaths', function (t) {

  var expecting = path.join(__dirname, 'node_modules')

  wishlist('.', { full: true }, function (err, list) {
    if (err) t.end(err)

    t.is(list.dirs.length, 1, 'should have detected 1 dir')
    t.is(list.dirs[0], expecting, 'should have detected ./node_modules')

    t.end()
  })

})
