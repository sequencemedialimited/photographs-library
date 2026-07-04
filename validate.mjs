#!/usr/bin/env node

import {
  resolve,
  parse,
  join
} from 'node:path'

import {
  constants,
  accessSync,
  statSync
} from 'node:fs'

import {
  normalisePath
} from '#photographs-library/utils'

import validate from '#photographs-library/validate'

import configMap from '#photographs-library/config'

if (!configMap.has('from')) throw new Error('`from` is required')

const ORIGIN = resolve(normalisePath(configMap.get('from')))
try {
  // ensure the path exists
  const stats = statSync(ORIGIN)

  // ensure the path is a directory
  if (!stats.isDirectory()) throw new Error(`Invalid \`from\` @ "${ORIGIN}"`) // caught and rethrown

  // ensure the path is read/writable
  accessSync(ORIGIN, constants.R_OK | constants.W_OK)
} catch {
  throw new Error(`Invalid \`from\` @ "${ORIGIN}"`)
}

let DESTINATION =resolve(normalisePath(configMap.get('to') || ORIGIN))
try {
  // parse the path
  const {
    ext,
    dir
  } = parse(DESTINATION)

  if (ext) {
    // it's a file
    accessSync(dir, constants.R_OK | constants.W_OK)
  } else {
    // it's a directory
    accessSync(DESTINATION, constants.R_OK | constants.W_OK)
    DESTINATION = join(DESTINATION, 'validate.csv')
  }
} catch {
  throw new Error(`Invalid \`to\` @ "${DESTINATION}"`)
}

console.log('🚀')
export default (
  validate({
    origin: ORIGIN,
    destination: DESTINATION
  })
    .then(() => {
      console.log('👍')
    })
    .catch(({ message }) => {
      console.error(`💥 ${message}`)
    })
)
