var hashToPort = require('hash-to-port')
var local = require('my-local-ip')
var discoverySwarm = require('discovery-swarm')
var dragDrop = require('drag-drop')
var dialog = require('electron').remote.dialog
var ipcRenderer = require('electron').ipcRenderer
var levelup = require('levelup')
var memdown = require('memdown')
var scuttleup = require('scuttleup-blacklist')
var filegroup = require('./filepaths-group/index')

function noop () {}

function notify (title, data) {
  return new Notification(title, data)
}

function shortify (stryng, max) {
  max = max || 10
  return stryng.length > max ? stryng.substring(0, max - 3) + '...' : stryng
}

var me, team, myport, plugport, swarm, logs, view, removeDragDrop
var peers = {}

function peerExit (peer, username) {
  trap.getBoard().clearAll(username)
  peers[peer].forEach(function (seq) {
    logs.blacklist(peer, seq, noop)
  })
}

function exitHandler (e) {
  if (!logs || !swarm) return
  if (e) e.preventDefault()
  logs.append(JSON.stringify({ username: me, exit: true }), function (err) {
    if (err) return console.error(err) // pass thru to user !??
    setTimeout(function () {
      swarm.leave(team)
      swarm.close(function () {
        memdown.clearGlobalStore(true)
        if (e) window.close()
      })
    }, 100)
  })
}

function initView () {
  view = document.createElement('div')
  view.id = 'view'
  view.appendChild(trap.getLogin())
  document.body.appendChild(view)
  trap.getLoginNameInput().focus()
  // dragDrop(document.body, dropHandler)
}

function loginHandler (e) {
  if (swarm && swarm.listening) return swarm.close(loginHandler.bind(null, e))
  me = trap.getLoginNameInput().value
  team = trap.getLoginTeamInput().value
  logs = scuttleup(levelup(memdown('./' + me + '.db')))
  swarm = discoverySwarm({ dht: false })
  myport = hashToPort(me)
  plugport = myport - 1
  ipcRenderer.send('plug-listen', plugport)
  swarm.on('connection', connectionHandler)
  logs.createReadStream({ live: true }).on('data', infoHandler)
  swarm.listen(myport)
  swarm.join(team, { announce: true })
  document.onmouseenter = document.onmouseleave =
    trap.requestSuppliedCount.bind(trap)
  trap.getSubTeam().set(team)
  trap.getSubName().set(me)
  view.removeChild(trap.getLogin())
  view.appendChild(trap.getMain())
  removeDragDrop = dragDrop(document.body, dropHandler)
}

function dropHandler (files) {
  filegroup(files, { size: true }, function (err, groups) {
    if (err) return console.error(err) // pass thru to user!
    var localhost = local()
    groups.forEach(function (item) {
      logs.append(JSON.stringify({
        username: me,
        filename: item.path.replace(/^.+(\/|\\)(.+)$/, '$2'),
        type: item.type,
        filepath: item.path,
        size: item.size,
        host: localhost,
        port: plugport,
        timestamp: new Date().getTime()
      }))
    })
  })
  trap.requestSuppliedCount()
}

function connectionHandler (socket, peer) { // TODO: pump
  socket.pipe(
    logs.createReplicationStream({ live: true, mode: 'sync' })
  ).pipe(socket)
  trap.updatePeerCount()
  notify('New peer!', { body: '@ ' + peer.host + ':' + peer.port })
}

function infoHandler (info) {
  var doc
  if (peers[info.peer]) peers[info.peer].push(info.seq)
  else peers[info.peer] = [ info.seq ]
  try {
    doc = JSON.parse(info.entry.toString())
  } catch (err) {
    return console.error(err)
  }
  if (doc.exit) return peerExit(info.peer, doc.username)
  trap.getBoard().appendChild(trap.makeFilebox(doc))
  trap.requestSuppliedCount()
  notify('New share!', {
    body: doc.username + ' is sharing ' + doc.type + ' ' + doc.filename
  })
}

function saveHandler (e, doc, iconid) { // TODO: progress bar
  dialog.showSaveDialog({ title: 'Save ' + doc.filename }, function (as) {
    if (!as) return
    ipcRenderer.send('plug-consume',
      doc.port, doc.host, doc.type, doc.filepath, as, doc.size, iconid
    )
  })
}

ipcRenderer.on('done-consumed', function (e, err, mypath, iconid) {
  var saveicon = document.querySelector('#' + iconid)
  saveicon.src = './img/' + (err ? 'warning.svg' : 'check.svg')
  saveicon.title = mypath
  saveicon.style.display = 'inline'
})

function escapeHandler () {
  var team = trap.getLoginTeamInput()
  var loginbtn = trap.getLoginButton()
  removeDragDrop()
  exitHandler()
  team.value = ''
  loginbtn.disabled = true
  loginbtn.style.cursor = 'not-allowed'
  loginbtn.style.color = '#999'
  trap.getBoard().clearAll()
  view.removeChild(trap.getMain())
  view.appendChild(trap.getLogin())
  team.focus()
}

var trap = { // all-in-1 factory that cooks up dom elements
  _login: null,
  _name: null,
  _team: null,
  _join: null,
  _logintitle: null,
  _peercount: null,
  _suppliedcount: null,
  _stats: null,
  _escaper: null,
  _subhead: null,
  _subteam: null,
  _subname: null,
  _head: null,
  _dump: null,
  _board: null,
  _main: null,
  _validator(e) {
    var valid = [ this._name, this._team ].every(function (ui) {
      return /[^\s]/.test(ui.value)
    })
    this._join.disabled = !valid
    this._join.style.cursor = valid ? 'pointer' : 'not-allowed'
    this._join.style.color = valid ? 'firebrick' : '#999'
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
    this._join.id = 'loginbtn'
    this._join.value = 'join'
    this._join.type = 'submit'
    this._join.disabled = true
    this._join.style.cursor = 'not-allowed'
    this._join.onclick = loginHandler
    return this._join
  },
  getLoginTitle() {
    if (this._logintitle) return this._logintitle
    this._logintitle = document.createElement('span')
    this._logintitle.id ='logintitle'
    this._logintitle.innerText = 'drag drop'
    return this._logintitle
  },
  getLogin() {
    if (this._login) return this._login
    this._login = document.createElement('div')
    this._login.id = 'login'
    this._login.onkeyup = this._validator.bind(this)
    this._login.appendChild(this.getLoginTitle())
    this._login.appendChild(this.getLoginNameInput())
    this._login.appendChild(this.getLoginTeamInput())
    this._login.appendChild(this.getLoginButton())
    return this._login
  },
  getPeerCount() {
    if (this._peercount) return this._peercount
    this._peercount = document.createElement('span')
    this._peercount.id = 'peercount'
    this._peercount.innerText = 0
    this._peercount.update = (function () {
      this._peercount.innerText = swarm.connected
    }).bind(trap)
    return this._peercount
  },
  getSuppliedCount() {
    if (this._suppliedcount) return this._suppliedcount
    this._suppliedcount = document.createElement('span')
    this._suppliedcount.id = 'suppliedcount'
    this._suppliedcount.innerText = 0
    this._suppliedcount.update = (function (num) {
      this._suppliedcount.innerText = num
    }).bind(trap)
    return this._suppliedcount
  },
  getStats () {
    if (this._stats) return this._stats
    var peericon = document.createElement('img')
    var suppliedicon = document.createElement('img')
    this._stats = document.createElement('div')
    this._stats.id = 'stats'
    peericon.src = './img/people.svg'
    suppliedicon.src = './img/arrow-thick-top.svg'
    peericon.id = 'peericon'
    suppliedicon.id = 'suppliedicon'
    this._stats.appendChild(peericon)
    this._stats.appendChild(this.getPeerCount())
    this._stats.appendChild(suppliedicon)
    this._stats.appendChild(this.getSuppliedCount())
    return this._stats
  },
  getEscaper() {
    if (this._escaper) return this._escaper
    this._escaper = document.createElement('img')
    this._escaper.id = 'escapebtn'
    this._escaper.src = './img/account-logout.svg'
    this._escaper.onclick = escapeHandler
    return this._escaper
  },
  getHead() {
    if (this._head) return this._head
    this._head = document.createElement('div')
    this._head.id = 'head'
    this._head.appendChild(this.getEscaper())
    this._head.appendChild(this.getStats())
    return this._head
  },
  getSubName() {
    if (this._subname) return this._subname
    this._subname = document.createElement('span')
    this._subname.id = 'subname'
    this._subname.set = (function (name) {
      this._subname.innerText = name
    }).bind(trap)
    return this._subname
  },
  getSubTeam() {
    if (this._subteam) return this._subteam
    this._subteam = document.createElement('span')
    this._subteam.id = 'subteam'
    this._subteam.set = (function (team) {
      this._subteam.innerText = team
    }).bind(trap)
    return this._subteam
  },
  getSubHead() {
    if (this._subhead) return this._subhead
    this._subhead = document.createElement('div')
    this._subhead.id = 'subhead'
    this._subhead.appendChild(this.getSubTeam())
    this._subhead.appendChild(this.getSubName())
    return this._subhead
  },
  getDump() {
    if (this._dump) return this._dump
    this._dump = document.createElement('div')
    this._dump.id = 'dump'
    this._dump.innerText = 'drag drop'
  //dragDrop(this._dump, dropHandler)
    return this._dump
  },
  getBoard() {
    if (this._board) return this._board
    this._board = document.createElement('div')
    this._board.id = 'board'
    this._board.clearAll = (function (user, callback) {
      if (user) {
        document.querySelectorAll('#board > .' + user).forEach(function (box) {
            this._board.removeChild(box)
        }, trap)
      } else {
        while (this._board.children.length) {
          this._board.removeChild(this._board.children[0])
        }
      }
      if (callback) callback(null)
    }).bind(trap)
    return this._board
  },
  getMain() {
    if (this._main) return this._main
    this._main = document.createElement('div')
    this._main.id = 'main'
    this._main.appendChild(this.getHead())
    this._main.appendChild(this.getSubHead())
    this._main.appendChild(this.getDump())
    this._main.appendChild(this.getBoard())
    return this._main
  },
  makeFilebox(/*peer, seq, */doc) {
    var filebox = document.createElement('div')
    var msgbox = document.createElement('div')
    var msg = document.createElement('span')
    var typeicon = document.createElement('img')
    var savebtn = document.createElement('img')
    var trashbtn = document.createElement('img')
    var saveicon = document.createElement('img')
    var trashlabel = document.createElement('span')
    filebox.isOpen = true
    filebox.onclick = function (e) {
      Array.from(this.children).forEach(function (child) {
        if (child.classList.contains('trashbtn') ||
            child.classList.contains('trashlabel')) {
          child.style.display = this.isOpen ? 'block' : 'none'
        } else {
          child.style.display = this.isOpen ? 'none' : 'block'
        }
      }, this)
      this.isOpen = !this.isOpen
    }
    savebtn.onclick = function (e) {
      e.stopPropagation()
      saveHandler(e, doc, saveicon.id)
    }
    trashbtn.onclick = function (e) {
      e.stopPropagation()
      trap.getBoard().removeChild(this.parentNode)
    }
    filebox.id =
      (doc.username + doc.filename + doc.timestamp).replace(/[\.\s#]/g, '')
    filebox.classList.add('filebox')
    filebox.classList.add(doc.username)
    msgbox.classList.add('msgbox')
    savebtn.src = './img/data-transfer-download.svg'
    savebtn.classList.add('savebtn')
    trashbtn.src = './img/trash.svg'
    trashbtn.classList.add('trashbtn')
    trashlabel.classList.add('trashlabel')
    msg.classList.add('message')
    typeicon.classList.add('typeicon')
    typeicon.src = doc.type === 'file'
      ? './img/file.svg' : './img/folder.svg'
    saveicon.id = 'saveicon' + filebox.id
    saveicon.classList.add('saveicon')
    saveicon.style.display = 'none'
    filebox.title = trashlabel.innerText = doc.username + ': ' + doc.filename
    msg.appendChild(document.createTextNode(doc.username + ' is sharing '))
    msg.appendChild(typeicon)
    msg.appendChild(document.createTextNode(' ' + doc.filename))
    msgbox.appendChild(msg)
    msgbox.appendChild(saveicon)
    filebox.appendChild(msgbox)
    filebox.appendChild(trashbtn)
    filebox.appendChild(trashlabel)
    filebox.appendChild(savebtn)
    return filebox
  },
  requestSuppliedCount() {
    ipcRenderer.send('supply-count', null)
  },
  updatePeerCount() {
    this.getPeerCount().update()
  }
}

ipcRenderer.on('supplied-count', function (e, supplied) {
  trap.getSuppliedCount().update(supplied)
})

window.onload = initView
window.onbeforeunload = exitHandler
