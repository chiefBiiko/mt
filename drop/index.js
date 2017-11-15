const crypto = require('crypto')
const fs = require('fs')
const concat = require('concat-stream')
const hashToPort = require('hash-to-port')
const discoverySwarm = require('discovery-swarm')
const dragDrop = require('drag-drop/buffer')
const dialog = require('electron').remote.dialog
//const level = require('level')
const levelup = require('levelup')
const leveldown = require('leveldown')
const scuttleup = require('scuttleup')

const sha256 = buf => crypto.createHash('sha256').update(buf).digest()

const login = document.querySelector('#login')
const dump = document.querySelector('#dump')

const swarm = discoverySwarm({ dht: false })

var me
var logs

const loginHandler = e => {
  if (e.keyCode !== 13 || !/[^\s]/i.test(login.value)) return
  login.disabled = true
  me = login.value
  logs = scuttleup(
    levelup(`${me}.db`, { db: leveldown }), { valueEncoding: 'json' }
  )
  logs.createReadStream({ live: true }).on('data', dataHandler)
  swarm.listen(hashToPort(me))
  swarm.join('FRAUD', { announce: true })
}

const connectionHandler = (socket, peer) => {
  console.log(`[ new peer connection from ${peer.host}:${peer.port} ]`)
  socket.pipe(logs.createReplicationStream({ live: true })).pipe(socket)
}

const dataHandler = data => {
  console.log(data)
  const filebox = document.createElement('div')
  filebox.innerText = `${data.username} is sharing ${data.filename}`
  document.body.appendChild(filebox)
}

const saveHandler = () => {}

login.onkeyup = loginHandler
swarm.on('connection', connectionHandler)


dump.onclick = () => {
  dialog.showOpenDialog({ properties: [ 'openFile' ] }, filepaths => {
    if (!filepaths || !filepaths.length) return
    filepaths.forEach(filepath => {
      fs.createReadStream(filepath).pipe(concat(buf => {
        console.log(buf)
        logs.append({
          username: me,
          filename: filepath.replace(/^.+\/|\\(.+)$/, '$1'),
          data: buf.toString('hex'),
          sha256: sha256(buf)
        })
      }))
    })
  })
}
// dialog.showSaveDialog(...args)
dragDrop('#dump', files => {
  files.forEach(buf => {
    console.log(buf)
    logs.append({
      username: me,
      filename: buf.name,
      data: buf.toString('hex'),
      sha256: sha256(buf)
    })
  })
})
