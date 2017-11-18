const fs = require('fs')
const path = require('path')
const concat = require('concat-stream')
const Readable = require('stream').Readable

const SCUTTLEUP_INDEX =
  path.join(__dirname, 'node_modules', 'scuttleup', 'index.js')

const makePlug = stryng => {
  const r = new Readable()
  r.push(stryng)
  r.push(null)
  return r
}

fs.createReadStream(SCUTTLEUP_INDEX).pipe(concat(buf => {
  makePlug(buf.toString().split('\n').map((line, i) => {
      if (i < 90 || i > 110) return line
      if (/peer: peer/.test(line))
        line = line.replace(': peer', ': peer.toString("hex")')
      if (/seq: seq/.test(line))
        line = line.replace(': seq', ': seq || 0')
      return line
    }).join('\n')).pipe(fs.createWriteStream(SCUTTLEUP_INDEX))
}))
