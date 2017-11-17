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
  const fresh = buf.toString()
    .split('\n')
    .map((v, i) => {
      if (i < 90 || i > 110) return v
      if (/peer: peer/.test(v))
        v = v.replace(': peer', ': peer.toString("hex")')
      if (/seq: seq/.test(v))
        v = v.replace(': seq', ': seq || 0')
      return v
    }).join('\n')
  makePlug(fresh).pipe(fs.createWriteStream(SCUTTLEUP_INDEX))
}))
