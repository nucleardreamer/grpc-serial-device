const { join } = require('path')
const QuickgRPC = require('quick-grpc')

async function go () {

  // go and setup the client connection
  const { usbDevice } = await new QuickgRPC({
    host: '0.0.0.0:9000',
    basePath: join(__dirname, 'src')
  })

  let client = await usbDevice()

  // list devices
  client.list(undefined, function (err, payload) {
    if (err) throw err
    console.log('LIST:', payload)
  })

  // open a device, this returns a stream of data
  let dataStream = client.open({
    devicePath: process.env.devicePath || '/dev/ttyUSB0',
    deviceOpts: {
      baudRate: process.env.baudRate || 38400
    }
  })

  dataStream.on('data', function ({ payload }) {
    console.log('DATA:', payload, payload.toString())
    // decode the payload, it is a standard Buffer object
    let data = payload.toString()
    // write some data once we have the connection open
    if (data === 'device.open') {
      doWrite('close1\r')
    }
  })
  function doWrite (data) {
    client.write(
      {
        // we need to make sure to encode our payload, the server expects a `bytes` type
        payload: Buffer.from(data)
      },
      function (err) {
        if (err) console.log('ERROR:', err.message)
      }
    )
  }
}

go()
