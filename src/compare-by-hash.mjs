/**
 *  @typedef {import('#types').FileDateType} FileDateType
 */

import {
  join
} from 'node:path'

import { createWriteStream } from 'node:fs'

import {
  glob,
  unlink
} from 'node:fs/promises'

import { createObjectCsvStringifier } from 'csv-writer'

import {
  getFileDate,
  getFileHash,
  getFileNameSort,
  getEntriesFileNameSort,
  toISO
} from './utils/index.mjs'

const HEADER = [
  { id: 'row', title: 'Row' },
  { id: 'original', title: 'Original' },
  { id: 'duplicate', title: 'Duplicate' },
  { id: 'originalDate', title: 'Original Date' },
  { id: 'duplicateDate', title: 'Duplicate Date' },
  { id: 'originalHash', title: 'Original Hash' },
  { id: 'duplicateHash', title: 'Duplicate Hash' }
]

/**
 *  @param {{
 *    origin: string,
 *    destination: string
 *  }} params
 */
export default async function compareByHash ({
  origin: ORIGIN,
  destination: DESTINATION
}) {
  try {
    await unlink(DESTINATION)
  } catch (e) {
    if (e instanceof Error) { // @ts-ignore
      const { code } = e
      if (code !== 'ENOENT') throw e
    }
  }

  /**
   *  @type {Set<string>}
   */
  const filePathSet = new Set()

  /**
   *  @type {Map<string, FileDateType | null>}
   */
  const fileDateMap = new Map()

  /**
   *  @type {Map<string, string>}
   */
  const fileHashMap = new Map()

  for await (const filePath of glob(join(ORIGIN, '**/*.{tiff,tif}'))) {
    filePathSet.add(filePath)

    const [date, hash] = await Promise.all([
      getFileDate(filePath),
      getFileHash(filePath)
    ])

    fileDateMap.set(filePath, date)
    fileHashMap.set(filePath, hash)
  }

  if (filePathSet.size) {
    /**
     *  @type {Map<string, Set<string>>}
     */
    const duplicateMap = new Map()

    const originalPaths = Array.from(filePathSet).sort(getFileNameSort(fileDateMap))
    for (const originalPath of originalPaths) {
      const originalHash = fileHashMap.get(originalPath)
      const dulicateSet = new Set(originalPaths
        .filter((candidatePath) => originalPath !== candidatePath)
        .filter((candidatePath) => originalHash === fileHashMap.get(candidatePath)))
      if (dulicateSet.size) duplicateMap.set(originalPath, dulicateSet)
    }

    const csvStringifier = createObjectCsvStringifier({
      header: HEADER
    })

    const writeStream = createWriteStream(DESTINATION, {
      flags: 'a'
    })

    try {
      await (new Promise((resolve) => {
        writeStream.write(csvStringifier.getHeaderString(), resolve)
      }))

      let i = 0
      for await (const [original, duplicateSet] of Array.from(duplicateMap.entries()).sort(getEntriesFileNameSort(fileDateMap))) {
        await (new Promise((resolve) => {
          writeStream.write(csvStringifier.stringifyRecords(Array.from(duplicateSet).map((duplicate) => {
            const originalDate = fileDateMap.get(original)
            const duplicateDate = fileDateMap.get(duplicate)

            return {
              row: ++i,
              original,
              duplicate,
              originalDate: toISO(originalDate),
              duplicateDate: toISO(duplicateDate),
              originalHash: fileHashMap.get(original) ?? '',
              duplicateHash: fileHashMap.get(duplicate) ?? ''
            }
          })), resolve)
        }))
      }
    } finally {
      writeStream.end()
    }
  }
}
