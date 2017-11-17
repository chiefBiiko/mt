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
const { Readable, Transform } = require('stream')

/*
  ./node_modules/scuttleup/index.js postinstall mod at line 99:100 to:
  peer: peer.toString('hex'),
  seq: seq || 0
*/

const swarm = discoverySwarm({ dht: false })

const sha256 = buf =>
  crypto.createHash('sha256').update(buf).digest().toString('hex')

const makePlug = buf => {
  const r = new Readable()
  r.push(buf)
  r.push(null)
  return r
}

var view
var me
var logs

const loginHandler = e => {
  if (e.keyCode !== 13 || !/[^\s]/i.test(login.value)) return
  login.disabled = true
  me = login.value
  logs = scuttleup(levelup(memdown(`./${me}.db`)))
  logs.createReadStream({ live: true, tail: false }).on('data', dataHandler)
  view.appendChild(trap.getDump())
  view.removeChild(trap.getLogin())
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
  dialog.showOpenDialog({
    properties: [ 'openFile', 'multiSelections', 'showHiddenFiles' ]
  }, filepaths => {
    if (!filepaths || !filepaths.length) return
    filepaths.forEach(filepath => {
      fs.createReadStream(filepath).pipe(concat(buf => {
        logs.append(JSON.stringify({
          username: me,
          filename: filepath.replace(/^.+(\/|\\)(.+)$/, '$2'),
          data: buf.toString('hex'),
          sha256: sha256(buf)
        }))
      }))
    })
  })
}

const connectionHandler = (socket, peer) => {
  console.log(`[ new peer connection from ${peer.host}:${peer.port} ]`)
  logs.createReadStream().on('data', data => console.log(JSON.stringify(data)))
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
}

const dataHandler = data => {
  const doc = JSON.parse(data.entry.toString())
  console.log('doc:\n', doc)
  const filebox = document.createElement('div')
  const savebtn = document.createElement('span')
  const trashbtn = document.createElement('span')
  const saveHandler = () => {
    dialog.showSaveDialog({ title: `Save ${doc.filename} as...` }, aka => {
      if (!aka) return
      makePlug(Buffer.from(doc.data, 'hex')).pipe(fs.createWriteStream(aka))
    })
  }
  const trashHandler = e => {
    logs.del(data.peer, data.seq, err => {
      if (err) return console.error(err)
      view.removeChild(e.target.parentNode) // aka filebox
    })
  }
  savebtn.onclick = saveHandler
  savebtn.innerText = 'save'
  savebtn.classList.add('savebtn')
  trashbtn.onclick = trashHandler
  trashbtn.innerText = 'trash'
  trashbtn.classList.add('trashbtn')
  filebox.innerText = `${doc.username} is sharing ${doc.filename}`
  filebox.classList.add('filebox')
  filebox.appendChild(savebtn)
  filebox.appendChild(trashbtn)
  view.appendChild(filebox)
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

const initView = () => {
  view = document.createElement('div')
  view.appendChild(trap.getLogin())
  document.body.appendChild(view)
}

swarm.on('connection', connectionHandler)
window.onload = initView
