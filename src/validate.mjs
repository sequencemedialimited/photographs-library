/**
 *  @typedef {import('#types').FileDateType} FileDateType
 */

import {
  dirname,
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
  toPsdPath,
  toJpgPath,
  accessFile,
  getEntriesFileNameSort
} from './utils/index.mjs'

const HEADER = [
  { id: 'row', title: 'Row' },
  { id: 'filePath', title: 'File Path' },
  { id: 'tif', title: 'TIF' },
  { id: 'psd', title: 'PSD' },
  { id: 'jpg', title: 'JPG' },
  { id: 'createDate', title: 'Create Date' },
  { id: 'modifyDate', title: 'Modify Date' },
  { id: 'dateTime', title: 'Date Time' }
]

/**
 *  @param {{
 *    origin: string,
 *    destination: string
 *  }} params
 */
export default async function validate ({
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

  for await (const filePath of glob(join(ORIGIN, '**/*.{tiff,tif}'))) {
    filePathSet.add(filePath)

    fileDateMap.set(filePath, await getFileDate(filePath))
  }

  if (filePathSet.size) {
    /**
     *  @type {Map<string, Map<'tif' | 'psd' | 'jpg', string>>}
     */
    const exceptionsMap = new Map()

    for (const filePath of filePathSet) {
      console.log(dirname(filePath))

      if (!/\/TIF\//.test(dirname(filePath))) {
        const exceptions = exceptionsMap.get(filePath) ?? new Map()
        if (!exceptionsMap.has(filePath)) exceptionsMap.set(filePath, exceptions)
        exceptions.set('tif', filePath)
      } else {
        const psd = toPsdPath(filePath)
        const jpg = toJpgPath(toPsdPath(filePath))

        try {
          await accessFile(psd)
        } catch {
          const exceptions = exceptionsMap.get(filePath) ?? new Map()
          if (!exceptionsMap.has(filePath)) exceptionsMap.set(filePath, exceptions)
          exceptions.set('psd', psd)
        }

        try {
          await accessFile(jpg)
        } catch {
          const exceptions = exceptionsMap.get(filePath) ?? new Map()
          if (!exceptionsMap.has(filePath)) exceptionsMap.set(filePath, exceptions)
          exceptions.set('jpg', jpg)
        }
      }
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
      for await (const [filePath, exceptions] of Array.from(exceptionsMap.entries()).sort(getEntriesFileNameSort(fileDateMap))) {
        await (new Promise((resolve) => {
          const fileDate = fileDateMap.get(filePath)

          writeStream.write(csvStringifier.stringifyRecords([{
            row: ++i,
            filePath,
            tif: exceptions.get('tif') ?? '',
            psd: exceptions.get('psd') ?? '',
            jpg: exceptions.get('jpg') ?? '',
            createDate: fileDate?.createDate?.toISOString() ?? '',
            modifyDate: fileDate?.modifyDate?.toISOString() ?? '',
            dateTime: fileDate?.dateTime?.toISOString() ?? ''
          }]), resolve)
        }))
      }
    } finally {
      writeStream.end()
    }
  }
}
