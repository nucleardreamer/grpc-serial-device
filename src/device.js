const _ = require('lodash')
const SerialPort = require('serialport')
const EventEmitter = require('events')

class Serial extends EventEmitter {
  /**
   * Make a new serial device
   *
   * @param {devicePath} devicePath Path to the device, usually starting with /dev
   * @param {string} deviceOpts Node `serialport` options
   *
   * @returns {EventEmitter}
  */
  constructor (devicePath, deviceOpts) {
    super()
    if (!devicePath) throw new Error('You cannot have an empty device path')
    this.devicePath = devicePath
    this.deviceOpts = deviceOpts
  }

  write (payload) {
    let _this = this
    return new Promise((resolve, reject) => {
      if (!_this.port) return reject('Device not open')
      _this.port.write(payload, err => {
        err ? reject(err) : resolve()
      })
    })
  }


  open (devicePath, deviceOpts) {
    let _this = this
    return new Promise(async (resolve, reject) => {
      if (!devicePath) devicePath = _this.devicePath
      if (!deviceOpts) deviceOpts = _this.deviceOpts
      _.assign(deviceOpts, { autoOpen: false })
      await _this.destroy()
      _this.port = new SerialPort(devicePath, deviceOpts)
      _this.port.on('data', data => {
        _this.emit('data', data)
      })
      _this.port.on('error', async err => {
        _this.emit('error', err)
        await _this.destroy()
        reject(err)
      })
      _this.port.on('close', async err => {
        _this.emit('close', err)
        await _this.destroy()
        reject(err)
      })
      _this.port.open(() => {
        _this.emit('data', Buffer.from('device.open'))
        resolve(_this)
      })
    })
  }

  destroy () {
    let _this = this
    return new Promise((resolve, reject) => {
      try {
        _this.port.close(async err => {
          if (err) return reject(err)
          _this.port = false
          resolve()
        })
      } catch (e) {}
      resolve()
    })
  }

  static parseBufPayload (data) {
    return data.toString().replace(/[^a-zA-Z0-9]/gi, '')
  }

  static list (filter) {
    return new Promise((resolve, reject) => {
      SerialPort.list(function (err, devices) {
        if (err) return reject(err)
        if (filter) devices = _.filter(devices, filter)
        resolve(devices)
      })
    })
  }
}

module.exports = Serial