const crypto = require('crypto')
const fs = require('fs')
const concat = require('concat-stream')
const hashToPort = require('hash-to-port')
const discoverySwarm = require('discovery-swarm')
const dragDrop = require('drag-drop/buffer')
const dialog = require('electron').remote.dialog
const levelup = require('levelup')
const memdown = require('memdown')
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
  logs = scuttleup(levelup(memdown(`./${me}.db`)), { valueEncoding: 'json' })
  logs.createReadStream({ live: true }).on('data', dataHandler)
  swarm.listen(hashToPort(me))
  swarm.join('FRAUD', { announce: true })
}

const connectionHandler = (socket, peer) => {
  console.log(`[ new peer connection from ${peer.host}:${peer.port} ]`)
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
}

const dataHandler = data => {
  console.log('dataHandler data:', data)
  const filebox = document.createElement('div')
  const savebtn = document.createElement('span')
  savebtn.innerText = 'Save'
  savebtn.style.cursor = 'pointer'
  savebtn.onclick = e => dialog.showSaveDialog()
  filebox.innerText = `${data.username} is sharing ${data.filename}`
  filebox.appendChild(savebtn)
  document.body.appendChild(filebox)
}

const dropHandler = files => {
  files.forEach(buf => {
    console.log(buf)
    logs.append({
      username: me,
      filename: buf.name,
      data: buf.toString('hex'),
      sha256: sha256(buf)
    })
  })
}

const openHandler = () => {
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

const saveHandler = () => {}

login.onkeyup = loginHandler
swarm.on('connection', connectionHandler)
dump.onclick = openHandler
dragDrop('#dump', dropHandler)
