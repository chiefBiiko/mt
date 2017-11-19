const crypto = require('crypto')
const fs = require('fs')
const concat = require('concat-stream')
const hashToPort = require('hash-to-port')
const discoverySwarm = require('discovery-swarm')
const dragDrop = require('drag-drop/buffer')
const dialog = require('electron').remote.dialog
const levelup = require('levelup')
const memdown = require('memdown')
const scuttleupBlacklist = require('scuttleup-blacklist')
const Readable = require('stream').Readable
const prettyHeap = require('./pretty-heap')

const swarm = discoverySwarm({ dht: false })

const sha256 = buf =>
  crypto.createHash('sha256').update(buf).digest().toString('hex')

const makeReadable = buf => {
  const r = new Readable()
  r.push(buf)
  r.push(null)
  return r
}

var view
var me
var team
var logs

const loginHandler = e => {
  me = trap._name.value
  team = trap._team.value
  logs = scuttleupBlacklist(levelup(memdown(`./${me}.db`)))
  logs.createReadStream({ live: true, tail: false }).on('data', dataHandler)
  view.removeChild(trap.getLogin())
  view.appendChild(trap.getDump())
  view.appendChild(trap.getCounter())
  view.appendChild(trap.getProfiler())
  swarm.listen(hashToPort(me))
  swarm.join(team, { announce: true })
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
  trap.getCounter().update()
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
}

const dataHandler = data => {
  var doc
  try {
    doc = JSON.parse(data.entry.toString())
  } catch (err) {
    return console.error(err)
  }
  console.log('doc:\n', doc)
  const filebox = document.createElement('div')
  const savebtn = document.createElement('span')
  const trashbtn = document.createElement('span')
  const saveHandler = () => {
    dialog.showSaveDialog({ title: `Save ${doc.filename} as...` }, aka => {
      if (!aka) return
      makeReadable(Buffer.from(doc.data, 'hex'))
        .pipe(fs.createWriteStream(aka))
    })
  }
  const trashHandler = e => {
    logs.blacklist(data.peer, data.seq, err => {
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
  trap.getProfiler().update()
}

const trap = {
  _counter: null,
  _dump: null,
  _login: null,
  _name: null,
  _team: null,
  _join: null,
  _validator(e) {
    const valid =
      [ this._name, this._team ].every(ui => /[^\s]+/.test(ui.value))
    this._join.disabled = !valid
    this._join.style.cursor = valid ? 'pointer' : 'not-allowed'
    this._join.style.color = valid ? 'gold' : '#999'
    if (valid && e.keyCode === 13) loginHandler(e)
  },
  getLogin() {
    if (this._login) return this._login
    this._login = document.createElement('div')
    this._name = document.createElement('input')
    this._team = document.createElement('input')
    this._join = document.createElement('input')
    this._login.id = 'login'
    this._name.classList.add('textinput')
    this._team.classList.add('textinput')
    this._join.classList.add('okbutton')
    this._name.placeholder = 'yo name'
    this._team.placeholder = 'da team'
    this._join.value = 'join'
    this._join.type = 'submit'
    this._join.disabled = true
    this._join.style.cursor = 'not-allowed'
    this._login.onkeyup = this._validator.bind(this)
    this._join.onclick = loginHandler
    this._login.appendChild(this._name)
    this._login.appendChild(this._team)
    this._login.appendChild(this._join)
    return this._login
  },
  getCounter () {
    if (this._counter) return this._counter
    this._counter = document.createElement('span')
    this._counter.id = 'counter'
    this._counter.style.position = 'fixed'
    this._counter.style.top = this._counter.style.right = '10px'
    this._counter.innerText = '0 peers'
    this._counter.update = () => {
      this._counter.innerText =
        `${swarm.connected} peer${swarm.connected !== 1 ? 's' : ''}`
    }
    return this._counter
  },
  getProfiler() {
    if (this._profiler) return this._profiler
    this._profiler = document.createElement('span')
    this._profiler.id = 'profiler'
    this._profiler.style.position = 'fixed'
    this._profiler.style.top = this._profiler.style.left = '10px'
    this._profiler.innerText = 'mem use\n0MB ~ 0%'
    this._profiler.update = () => {
      const mem = prettyHeap(process.memoryUsage())
      this._profiler.innerText =
        `mem use:\n${mem.heapUsedMB}MB ~ ${mem.heapUsedPercent * 100}%`
    }
    return this._profiler
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

const updateControls = () => {
  trap.getCounter().update()
  trap.getProfiler().update()
}

const initView = () => {
  view = document.createElement('div')
  view.appendChild(trap.getLogin())
  document.body.appendChild(view)
  document.onmouseenter = updateControls
}

swarm.on('connection', connectionHandler)
window.onload = initView
