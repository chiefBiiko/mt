const fs = require('fs')
const path = require('path')
const tape = require('tape')
const group = require('./index')

fs.mkdirSync(path.join(__dirname, 'fraud'))
fs.mkdirSync(path.join(__dirname, 'fraud', 'z'))

const filepaths = [
  path.join(__dirname, 'noop0.txt'),
  path.join(__dirname, 'fraud', 'noop1.txt'),
  path.join(__dirname, 'fraud', 'noop2.txt'),
  path.join(__dirname, 'fraud', 'z', 'z.txt')
]

filepaths.forEach(filepath => fs.writeFileSync(filepath, '419'))

tape.onFinish(() => {
  filepaths.forEach((filepath, i , arr) => {
    fs.unlinkSync(filepath)
    if (i === arr.length - 1) {
      fs.rmdirSync(path.join(__dirname, 'fraud', 'z'))
      fs.rmdirSync(path.join(__dirname, 'fraud'))
    }
  })
})

tape('filepaths-group multiple filepaths', t => {

  group(filepaths, (err, data) => {
    if (err) t.end(err)

    t.is(data.entireDirectories.length, 1, 'should have detected 1 entire dir')
    t.is(data.singleFiles.length, 1, 'should have detected 1 single file')

    t.end()
  })

})

tape('filepaths-group one filepath', t => {

  group(filepaths.slice(filepaths.length - 1), (err, data) => {
    if (err) t.end(err)

    t.is(data.entireDirectories.length, 0, 'should not indicate any dir')
    t.is(data.singleFiles.length, 1, 'should detect 1 single file')

    t.end()
  })

})
