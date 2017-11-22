var path = require('path')
var tape = require('tape')
var wishlist = require('./index')

tape('names only', function(t) {

  wishlist('.', function(err, data) {
    if (err) t.end(err)

    t.is(data.length, 1, 'should have detected 1 dir')
    t.is(data[0], 'node_modules', 'should have detected node_modules')

    t.end()
  })

})

tape('fullpaths', function(t) {

  var fullpath = path.join(__dirname, 'node_modules')

  wishlist('.', { full: true }, function(err, data) {
    if (err) t.end(err)

    t.is(data.length, 1, 'should have detected 1 dir')
    t.is(data[0], fullpath, 'should have detected ./node_modules')

    t.end()
  })

})
