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
export default async function jpgLibrary (topDir, {
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

  for await (const filePath of glob(join(ORIGIN, '**/*.jpg'))) {
    filePathSet.add(filePath)

    fileDateMap.set(filePath, await getFileDate(filePath))
  }

  if (filePathSet.size) {
    const fileNameGroups = getFileNameGroups(filePathSet, fileDateMap, LIMIT)

    const JPG = join(topDir, 'JPG')

    await createDir(JPG)

    for (const [i, fileNameGroup] of fileNameGroups.entries()) {
      const jpgDir = join(JPG, (i + 1).toString(16).toLocaleUpperCase())

      await createDir(jpgDir)

      for (const filePath of fileNameGroup) {
        const jpg = join(jpgDir, basename(filePath))

        await copyFile(filePath, jpg, constants.COPYFILE_EXCL)
      }
    }

    await rm(DESTINATION, { recursive: true })
    await mkdir(DESTINATION)
    await cp(topDir, DESTINATION, { recursive: true })
  }
}
