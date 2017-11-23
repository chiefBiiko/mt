const crypto = require('crypto')
const fs = require('fs')
const net = require('net')
const concat = require('concat-stream')
const hashToPort = require('hash-to-port')
const discoverySwarm = require('discovery-swarm')
const dragDrop = require('drag-drop')
const dialog = require('electron').remote.dialog
const levelup = require('levelup')
const memdown = require('memdown')
const scuttleupBlacklist = require('scuttleup-blacklist')
const Readable = require('stream').Readable
const tar = require('tar-fs')
const zlib = require('zlib')
const filegroup = require('./filepaths-group/index')
const prettyHeap = require('pretty-heap-used')
const fileBroker = require('./file-broker/index')
// const be = require('be-of-type')
// const is = {/*...*/}

const sha256 = buf =>
  crypto.createHash('sha256').update(buf).digest().toString('hex')

const makeReadable = buf => {
  const stream = new Readable()
  stream.push(buf)
  stream.push(null)
  return stream
}

const swarm = discoverySwarm({ dht: false })
const broker = fileBroker()

var view
var me
var team
var logs
var brokerport

const loginHandler = e => {
  me = trap.getLoginNameInput().value
  team = trap.getLoginTeamInput().value
  logs = scuttleupBlacklist(levelup(memdown(`./${me}.db`)))
  brokerport = hashToPort(me) - 1
  logs.createReadStream({ live: true }).on('data', dataHandler)
  swarm.listen(hashToPort(me))
  broker.listen(brokerport/*, '0.0.0.0'*/)
  swarm.join(team, { announce: true })
  view.removeChild(trap.getLoginForm())
  view.appendChild(trap.getDump())
  view.appendChild(trap.getCounter())
  view.appendChild(trap.getProfiler())
}

const dropHandler = files => {

  console.log('files', files)

  // distinguishing files and dirs
  filegroup(files.map(file => file.path), (err, data) => {
    if (err) return console.error(err)

    console.log(data)

    data.singleFiles.map(file => [ 'file', file ])
      .concat(data.entireDirectories.map(dir => [ 'directory', dir ]))
      .forEach(item => {
        (item[0] === 'file' ? fs.createReadStream(item[1]) : tar.pack(item[1]))
          .pipe(zlib.createGzip())
          .pipe(concat(buf => {
            logs.append(JSON.stringify({
              username: me,
              filename: item[1].replace(/^.+(\/|\\)(.+)$/, '$2'),
              type: item[0],
              filepath: item[1],
              host: swarm.address().address,
              port: brokerport,
              data: buf.toString('hex'),
              sha256: sha256(Buffer.isBuffer(buf) ? buf : '')
            }))
          }))
       })
  })
  trap.updateMetrics()
}

const connectionHandler = (socket, peer) => {
  console.log(`[ new peer connection from ${peer.host}:${peer.port} ]`)
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
  trap.updateMetrics()
}

const dataHandler = data => {
  var doc
  try {
    doc = JSON.parse(data.entry.toString())
  } catch (err) {
    return console.error(err)
  }

  console.log(doc)

  view.appendChild(trap.makeFilebox(data.peer, data.seq, doc))
  trap.updateMetrics()
}

const trap = { // all-in-1 factory that cooks up dom elements
  _counter: null,
  _dump: null,
  _login: null,
  _name: null,
  _team: null,
  _join: null,
  _validator(e) {
    const valid =
      [ this._name, this._team ].every(ui => /[^\s]/.test(ui.value))
    this._join.disabled = !valid
    this._join.style.cursor = valid ? 'pointer' : 'not-allowed'
    this._join.style.color = valid ? 'gold' : '#999'
    if (valid && e.keyCode === 13) loginHandler(e)
  },
  getLoginForm() {
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
  getLoginNameInput() {
    return this._name
  },
  getLoginTeamInput() {
    return this._team
  },
  getDump() {
    if (this._dump) return this._dump
    this._dump = document.createElement('div')
    this._dump.id = 'dump'
    this._dump.innerText = 'drag and drop\nfiles and directories'
    dragDrop(this._dump, dropHandler)
    return this._dump
  },
  makeFilebox(peer, seq, doc) {
    const filebox = document.createElement('div')
    const savebtn = document.createElement('span')
    const trashbtn = document.createElement('span')
    const saveHandler = () => {

      console.log('doc', doc)

      dialog.showSaveDialog({ title: `Save ${doc.filename} as...` }, aka => {
        if (!aka) return
        var writeStream
        if (doc.type === 'directory') {
          var alias = `${aka}.tar`
          writeStream = fs.createWriteStream(alias)
          writeStream.on('finish', function () {
            const readTar = fs.createReadStream(alias)
            readTar.on('end', function () {
              fs.unlink(alias, function (err) {
                if (err) console.error(err)
              })
            })
            readTar.pipe(tar.extract(aka))
          })
        } else {
          writeStream = fs.createWriteStream(aka)
        }
        console.log('saving out!!!')
        broker.consume(doc.port, doc.host, doc.filepath,
                       function (err, socket) {
          socket.pipe(zlib.createGunzip()).pipe(writeStream)
        })
        // makeReadable(Buffer.from(doc.data, 'hex'))
        //   .pipe(zlib.createGunzip())
        //   .pipe(writeStream)
      })

    }
    const trashHandler = e => {
      logs.blacklist(peer, seq, err => {
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
    filebox.innerText =
      `${doc.username} is sharing ${doc.type} ${doc.filename}`
    filebox.classList.add('filebox')
    filebox.appendChild(savebtn)
    filebox.appendChild(trashbtn)
    return filebox
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
        `mem use:\n${mem.heapUsedMB}MB ~ ` +
          `${Math.round(mem.heapUsedPercent * 100)}%`
    }
    return this._profiler
  },
  updateMetrics() {
    this.getCounter().update()
    this.getProfiler().update()
  }
}

const initView = () => {
  view = document.createElement('div')
  view.appendChild(trap.getLoginForm())
  document.body.appendChild(view)
  document.onmouseenter = document.onmouseleave = trap.updateMetrics.bind(trap)
}

swarm.on('connection', connectionHandler)
window.onload = initView
