var fs = require('fs')
var path = require('path')
var tape = require('tape')
var fileBroker = require('./index')

  var self = __filename

tape.onFinish(function () {
  fs.unlink(self + 'yea!', function (err) {
    if (err) return console.error(err)
  })
})

tape('file-broker', function (t) {

  var a = fileBroker()
  var b = fileBroker()

  a.listen(10000, '127.0.0.1', function () {

    b.consume(10000, '127.0.0.1', self, self + 'yea!', function (err) {
      if (err) t.end(err)

      t.ok(fs.existsSync(self + 'yea!'), 'file shared')
      t.is(a.supplied, 1, 'a should have supplied 1 file')
      t.is(b.consumed, 1, 'b should have consumed 1 file')

      a.close()
      t.end()
    })

  })

})
