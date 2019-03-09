

const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const _ = require('lodash')
const { join } = require('path')

const packageDefinition = protoLoader.loadSync(join(__dirname, 'usb-device.proto'))

const usbproto = grpc.loadPackageDefinition(packageDefinition).oak.application

const Device = require(join(__dirname, 'device'))

let deviceRef = false

async function List (call, cb) {
  try {
    let devices = await Device.list()
    cb(null, { devices })
  } catch (err) {
    cb(err)
  }
}

async function Write (call, cb) {
  if (!deviceRef) {
    let err = new Error('Device has not been opened')
    err.code = 9 // FAILED_PRECONDITION
    return cb(err)
  }
  let writeCall = await deviceRef.write(call.request.payload)
  if (_.isError(writeCall)) return cb(writeCall)
  cb(_.isError(writeCall) ? writeCall : null, writeCall)
}

async function Open (call) {
  let { devicePath, deviceOpts } = call.request
  let device = new Device(devicePath, deviceOpts)
  deviceRef = device
  device.on('data', payload => call.write({ payload }) )
    .on('error', err => {
      call.end()
      device = false
      deviceRef = false
    })
    .on('close', async err => {
      await device.destroy()
      device = false
      deviceRef = false
    })
  try {
    await device.open(devicePath, deviceOpts)
  } catch (err) {
    call.end(err)
  }
}

// server construction
const server = new grpc.Server()

const connectionString = `0.0.0.0:${process.env.PORT || '9000'}`

server.addService(usbproto.UsbDevice.service, {
  List, Open, Write
})

server.bind(
  connectionString,
  grpc.ServerCredentials.createInsecure()
)

server.start()

console.log(`Server started: ${connectionString}`)