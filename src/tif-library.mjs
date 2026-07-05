/**
 *  @typedef {import('#types').FileDateType} FileDateType
 */

import {
  join,
  basename
} from 'node:path'

import { constants } from 'node:fs'

import {
  glob,
  mkdir,
  copyFile,
  rm,
  cp
} from 'node:fs/promises'

import {
  getFileDate,
  getFileNameGroups,
  createDir
} from './utils/index.mjs'

/**
 *  @param {string} topDir
 *  @param {{
 *    origin: string,
 *    limit: number,
 *    destination: string,
 *  }} params
 */
export default async function tifLibrary (topDir, {
  origin: ORIGIN,
  limit: LIMIT,
  destination: DESTINATION
}) {
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
    const fileNameGroups = getFileNameGroups(filePathSet, fileDateMap, LIMIT)

    const TIF = join(topDir, 'TIF')

    await createDir(TIF)

    for (const [i, fileNameGroup] of fileNameGroups.entries()) {
      const tifDir = join(TIF, (i + 1).toString(16).toLocaleUpperCase())

      await createDir(tifDir)

      for (const filePath of fileNameGroup) {
        const tif = join(tifDir, basename(filePath))

        await copyFile(filePath, tif, constants.COPYFILE_EXCL)
      }
    }

    await rm(DESTINATION, { recursive: true })
    await mkdir(DESTINATION)
    await cp(topDir, DESTINATION, { recursive: true })
  }
}
