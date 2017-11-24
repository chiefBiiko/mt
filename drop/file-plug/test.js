var fs = require('fs')
var path = require('path')
var tape = require('tape')
var filePlug = require('./index')

var self = __filename

tape.onFinish(function () {
  fs.unlink(self + 'yea!', function (err) {
    if (err) return console.error(err)
  })
})

tape('file sharing', function (t) {

  var a = filePlug()
  var b = filePlug()

  a.listen(10000, '127.0.0.1', function () {

    b.consume(10000, '127.0.0.1', self, function (err, socket) {
      if (err) t.end(err)

      socket.pipe(fs.createWriteStream(self + 'yea!'))

      socket.on('end', function () {

        t.ok(fs.existsSync(self + 'yea!'), 'file shared')
        t.is(a.supplied, 1, 'a should have supplied 1 file')
        t.is(b.consumed, 1, 'b should have consumed 1 file')

        a.close()
        t.end()
      })
    })

  })

})


tape('numb exceptions', function (t) {

  var a = filePlug()
  var b = filePlug()

  a.listen(10000, '127.0.0.1', function () {

    b.consume(10000, '127.0.0.1', self.substr(0, 5), function (err, socket) {
      if (err) t.end(err)

      t.notOk(err, 'error will always be falsey')

      a.close()
      t.end()
    })

  })

})
