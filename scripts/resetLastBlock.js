const Redis = require('ioredis')
const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '../.env')
})

const redis = new Redis(process.env.REDIS_URL)

redis.on('error', () => {
  logError('Error: Cannot connect to redis')
})

if (process.argv.length < 4) {
  logError(
    'Please provide process key and new block value. Example:' +
      '\n  signature-request 12345 ' +
      '\n  collected-signatures 12345 ' +
      '\n  affirmation-request 12345'
  )
}

function logError(message) {
  console.log(message)
  process.exit(1)
}

function getRedisKey(name) {
  const isErcToErc = process.env.BRIDGE_MODE && process.env.BRIDGE_MODE === 'ERC_TO_ERC'
  const prefix = isErcToErc ? 'erc-' : ''
  return `${prefix}${name}:lastProcessedBlock`
}

async function main() {
  try {
    const processName = process.argv[2]
    const newBlockValue = process.argv[3]
    const lastBlockRedisKey = getRedisKey(processName)

    const value = await redis.get(lastBlockRedisKey)

    if (!value) {
      logError(
        'Error: Process key not found on redis. Please provide one of the following:' +
          '\n  signature-request' +
          '\n  collected-signatures' +
          '\n  affirmation-request'
      )
    }

    await redis.set(lastBlockRedisKey, newBlockValue)

    console.log(`${processName} last block updated to ${newBlockValue}`)

    redis.disconnect()
  } catch (e) {
    console.log(e)
  }
}

main()
