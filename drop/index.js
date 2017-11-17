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
const Readable = require('stream').Readable

const swarm = discoverySwarm({ dht: false })

const sha256 = buf =>
  crypto.createHash('sha256').update(buf).digest().toString('hex')

const makePlug = buf => {
  const r = new Readable()
  r.push(buf)
  r.push(null)
  return r
}

var me
var logs

const loginHandler = e => {
  if (e.keyCode !== 13 || !/[^\s]/i.test(login.value)) return
  login.disabled = true
  me = login.value
  logs = scuttleup(levelup(memdown(`./${me}.db`)))
  logs.createReadStream({ live: true }).on('data', dataHandler)
  document.body.appendChild(trap.getDump())
  document.body.removeChild(trap.getLogin())
  swarm.listen(hashToPort(me))
  swarm.join('FRAUD', { announce: true })
}

const dropHandler = files => {
  files.forEach(buf => {
    logs.append(JSON.stringify({
      username: me,
      filename: buf.name,
      data: buf.toString('hex'),
      sha256: sha256(buf)
    }))
  })
}

const openHandler = () => {
  dialog.showOpenDialog({ properties: [ 'openFile' ] }, filepaths => {
    if (!filepaths || !filepaths.length) return
    filepaths.forEach(filepath => {
      fs.createReadStream(filepath).pipe(concat(buf => {
        logs.append(JSON.stringify({
          username: me,
          filename: filepath.replace(/^.+\/|\\(.+)$/, '$1'),
          data: buf.toString('hex'),
          sha256: sha256(buf)
        }))
      }))
    })
  })
}

const connectionHandler = (socket, peer) => {
  console.log(`[ new peer connection from ${peer.host}:${peer.port} ]`)
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
}

const dataHandler = data => {
  const doc = JSON.parse(data.entry.toString())
  console.log('doc:\n', doc)
  const filebox = document.createElement('div')
  const savebtn = document.createElement('span')
  const saveHandler = () => {
    dialog.showSaveDialog({ title: `Save ${doc.filename} as...` }, aka => {
      makePlug(Buffer.from(doc.data, 'hex')).pipe(fs.createWriteStream(aka))
    })
  }
  savebtn.onclick = saveHandler
  savebtn.innerText = 'save'
  savebtn.classList.add('savebtn')
  filebox.innerText = `${doc.username} is sharing ${doc.filename}`
  filebox.classList.add('filebox')
  filebox.appendChild(savebtn)
  document.body.appendChild(filebox)
}

const trap = {
  _login: null,
  _dump: null,
  getLogin() {
    if (this._login) return this._login
    this._login = document.createElement('input')
    this._login.id = 'login'
    this._login.placeholder = 'yo name'
    this._login.onkeyup = loginHandler
    return this._login
  },
  getDump() {
    if (this._dump) return this._dump
    this._dump = document.createElement('div')
    this._dump.id = 'dump'
    this._dump.innerText = 'drag and drop or\npick files here...'
    dragDrop(this._dump, dropHandler)
    this._dump.onclick = openHandler
    return this._dump
  }
}

window.onload = () => document.body.appendChild(trap.getLogin())
swarm.on('connection', connectionHandler)
