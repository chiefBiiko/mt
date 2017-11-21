const tape = require('tape')
const group = require('./index')

tape('filepaths-group', t => {
  const filepaths = []
  const grouped = group(filepaths)

  t.same(false, true)
  t.end()
})
