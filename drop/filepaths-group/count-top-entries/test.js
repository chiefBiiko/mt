var tape = require('tape')
var count = require('./index')

tape('counts correct', function (t) {

  count('.', {}, function (err, data) {
    if (err) t.end(err)

    t.is(data.files, 4, 'should count 4 files')
    t.is(data.dirs, 1, 'should count 1 dir')

    t.end()
  })

})
