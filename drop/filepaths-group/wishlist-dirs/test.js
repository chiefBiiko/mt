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
