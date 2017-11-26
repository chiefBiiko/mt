var hashToPort = require('hash-to-port')
var local = require('my-local-ip')
var discoverySwarm = require('discovery-swarm')
var dragDrop = require('drag-drop')
var dialog = require('electron').remote.dialog
var levelup = require('levelup')
var memdown = require('memdown')
var scuttleup = require('scuttleup-blacklist')
var filegroup = require('./filepaths-group/index')
var fsPlug = require('./fs-plug/index')

var me, team, view, logs, myport, plugport, swarm, plug

function initView () {
  view = document.createElement('div')
  view.appendChild(trap.getLogin())
  document.body.appendChild(view)
  document.onmouseenter = document.onmouseleave = trap.updateMetrics.bind(trap)
}

function loginHandler (e) {
  me = trap.getLoginNameInput().value
  team = trap.getLoginTeamInput().value
  logs = scuttleup(levelup(memdown('./' + me + '.db')))
  swarm = discoverySwarm({ dht: false })
  plug = fsPlug()
  myport = hashToPort(me)
  plugport = myport - 1
  swarm.on('connection', connectionHandler)
  logs.createReadStream({ live: true }).on('data', infoHandler)
  swarm.listen(myport)
  plug.listen(plugport, local())
  swarm.join(team, { announce: true })
  view.removeChild(trap.getLogin())
  view.appendChild(trap.getMain())
}

function dropHandler (files) {
  var filepaths = files.map(function (file) {
    return file.path
  })
  filegroup(filepaths, function (err, data) {
    if (err) return console.error(err)
    var items = data.singleFiles.map(function (file) {
      return [ 'file', file ]
    }).concat(data.entireDirs.map(function (dir) {
      return [ 'directory', dir ]
    }))
    items.forEach(function (item) {
      logs.append(JSON.stringify({
        username: me,
        filename: item[1].replace(/^.+(\/|\\)(.+)$/, '$2'),
        type: item[0],
        filepath: item[1],
        host: local(),
        port: plugport
      }))
    })
  })
  trap.updateMetrics()
}

function connectionHandler (socket, peer) {
  console.log('[ new peer @ ' + peer.host + ':' + peer.port + ' ]')
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
  trap.updateMetrics()
}

function infoHandler (info) {
  var doc
  try {
    doc = JSON.parse(info.entry.toString())
  } catch (err) {
    return console.error(err)
  }
  trap.getBoard().appendChild(trap.makeFilebox(info.peer, info.seq, doc))
  trap.updateMetrics()
}

function escapeHandler () {
  var loginbtn = trap.getLoginButton()
  trap.getLoginTeamInput().value = ''
  loginbtn.disabled = true
  loginbtn.style.cursor = 'not-allowed'
  loginbtn.style.color = '#999'
  trap.getBoard().clearAll()
  view.removeChild(trap.getMain())
  view.appendChild(trap.getLogin())
  memdown.clearGlobalStore(true)
  swarm.leave(team)
  swarm.close()
  plug.close()
}

var trap = { // all-in-1 factory that cooks up dom elements
  _login: null,
  _name: null,
  _team: null,
  _join: null,
  _counter: null,
  _escaper: null,
  _dump: null,
  _board: null,
  _main: null,
  _validator(e) {
    var valid = [ this._name, this._team ].every(function (ui) {
      return /[^\s]/.test(ui.value)
    })
    this._join.disabled = !valid
    this._join.style.cursor = valid ? 'pointer' : 'not-allowed'
    this._join.style.color = valid ? 'gold' : '#999'
    if (valid && e.keyCode === 13) loginHandler(e)
  },
  getLoginNameInput() {
    if (this._name) return this._name
    this._name = document.createElement('input')
    this._name.classList.add('textinput')
    this._name.placeholder = 'yo name'
    return this._name
  },
  getLoginTeamInput() {
    if (this._team) return this._team
    this._team = document.createElement('input')
    this._team.classList.add('textinput')
    this._team.placeholder = 'da team'
    return this._team
  },
  getLoginButton() {
    if (this._join) return this._join
    this._join = document.createElement('input')
    this._join.classList.add('okbutton')
    this._join.value = 'join'
    this._join.type = 'submit'
    this._join.disabled = true
    this._join.style.cursor = 'not-allowed'
    this._join.onclick = loginHandler
    return this._join
  },
  getLogin() {
    if (this._login) return this._login
    this._login = document.createElement('div')
    this._login.id = 'login'
    this._login.onkeyup = this._validator.bind(this)
    this._login.appendChild(this.getLoginNameInput())
    this._login.appendChild(this.getLoginTeamInput())
    this._login.appendChild(this.getLoginButton())
    return this._login
  },
  getCounter () {
    if (this._counter) return this._counter
    this._counter = document.createElement('span')
    this._counter.id = 'counter'
    this._counter.style.position = 'fixed'
    this._counter.style.top = this._counter.style.right = '10px'
    this._counter.innerText = '0 peers\nsupplied: 0\nconsumed: 0'
    this._counter.update = function () {
      if (!swarm || !plug) return
      this.innerText =
        swarm.connected + ' peer' + (swarm.connected !== 1 ? 's' : '') +
        '\nsupplied: ' + plug.supplied + '\nconsumed: ' + plug.consumed
    }
    return this._counter
  },
  getEscaper() {
    if (this._escaper) return this._escaper
    this._escaper = document.createElement('span')
    this._escaper.id = 'escaper'
    this._escaper.style.position = 'fixed'
    this._escaper.style.top = this._escaper.style.left = '10px'
    this._escaper.innerText = 'escape'
    this._escaper.onclick = escapeHandler
    return this._escaper
  },
  getDump() {
    if (this._dump) return this._dump
    this._dump = document.createElement('div')
    this._dump.id = 'dump'
    this._dump.innerText = 'drag and drop\nfiles and directories'
    dragDrop(this._dump, dropHandler)
    return this._dump
  },
  getBoard() {
    if (this._board) return this._board
    this._board = document.createElement('div')
    this._board.id = 'board'
    this._board.style.height = 100
    this._board.style.border = '5px dotted black'
    this._board.clearAll = (function (callback) {
      while (this._board.children.length) {
        this._board.removeChild(this._board.children[0])
      }
      if (callback) callback(null)
    }).bind(trap)
    return this._board
  },
  getMain() {
    if (this._main) return this._main
    this._main = document.createElement('div')
    this._main.id = 'main'
    this._main.appendChild(this.getCounter())
    this._main.appendChild(this.getEscaper())
    this._main.appendChild(this.getDump())
    this._main.appendChild(this.getBoard())
    return this._main
  },
  makeFilebox(peer, seq, doc) {
    var filebox = document.createElement('div')
    var savebtn = document.createElement('span')
    function saveHandler () {
      dialog.showSaveDialog({ title: 'Save ' + doc.filename }, function (as) {
        if (!as) return
        console.log('consuming...' + as)
        document.body.style.cursor = 'progress'
        plug.consume(doc.port, doc.host, doc.type, doc.filepath, as,
          function (err, mypath) {
            document.body.style.cursor = 'auto'
            if (err) return console.error(err)
            console.log('consumed ', mypath, ' !!!')
        })
      })
    }
    savebtn.onclick = saveHandler
    savebtn.innerText = 'save'
    savebtn.classList.add('savebtn')
    filebox.innerText =
      doc.username + ' is sharing ' + doc.type + ' ' + doc.filename
    filebox.classList.add('filebox')
    filebox.appendChild(savebtn)
    return filebox
  },
  updateMetrics() {
    this.getCounter().update()
  }
}

window.onload = initView

process.on('exit', function () {
  swarm.close()
  plug.close()
})
