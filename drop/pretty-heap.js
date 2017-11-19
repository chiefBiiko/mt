const ops = require('pojo-ops')

module.exports = function prettify (mem) {
  return ops.extendLock(mem, { // calculate metrics n extend with lock
    heapUsedPercent: parseFloat((mem.heapUsed / mem.heapTotal).toFixed(2)),
    heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100
  })
}
