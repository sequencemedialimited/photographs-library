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
  cp,
  stat
} from 'node:fs/promises'

import {
  toJpgPath,
  getFileNameGroups,
  createDir,
  accessFile
} from './utils/index.mjs'

/**
 *  @param {string} filePath
 *  @returns {Promise<FileDateType | null>}
 */
export async function getFileDate (filePath) {
  const {
    atime,
    mtime,
    ctime,
    birthtime
  } = await stat(filePath)

  if (birthtime) {
    return {
      atime,
      mtime,
      ctime,
      birthTime: birthtime
    }
  }

  return null
}

/**
 *  @param {string} topDir
 *  @param {{
 *    origin: string,
 *    limit: number,
 *    destination: string,
 *  }} params
 */
export default async function psdLibrary (topDir, {
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

  for await (const filePath of glob(join(ORIGIN, '**/*.psd'))) {
    filePathSet.add(filePath)

    const [
      fileDate
    ] = await Promise.all([
      getFileDate(filePath),
      accessFile(toJpgPath(filePath))
    ])

    fileDateMap.set(filePath, fileDate)
  }

  if (filePathSet.size) {
    const fileNameGroups = getFileNameGroups(filePathSet, fileDateMap, LIMIT)

    const PSD = join(topDir, 'PSD')

    // parent
    await createDir(PSD)

    for (const [i, fileNameGroup] of fileNameGroups.entries()) {
      const subDir = (i + 1).toString(16).toLocaleUpperCase()

      const psdDir = join(PSD, subDir)

      // sibling
      await createDir(psdDir)

      const jpgDir = join(PSD, subDir, 'JPG')

/**
1 /volume1/Alpha/Storage/Research/Ancestry/.photographs-library/.working-dir/photographs-library-CLbo1r/PSD/1
2 /volume1/Alpha/Storage/Research/Ancestry/.photographs-library/.working-dir/photographs-library-CLbo1r/PSD/1/JPG
 */
console.log(1, psdDir)
console.log(2, jpgDir)

      // child
      await createDir(jpgDir)

      for (const filePath of fileNameGroup) {
        const psd = join(psdDir, basename(filePath))
        const jpg = join(jpgDir, basename(filePath).replace(/\.psd$/, '.jpg'))

        /**
3 /volume1/Alpha/Storage/Research/Ancestry/.photographs-library/.working-dir/photographs-library-CLbo1r/PSD/1/Tom McThune, 30 May 2010.psd /volume1/Alpha/Storage/Research/Ancestry/Library (PSD)/Jonathan Perry/2010/PSD/5/Tom McThune, 30 May 2010.psd
4 /volume1/Alpha/Storage/Research/Ancestry/.photographs-library/.working-dir/photographs-library-CLbo1r/PSD/1/JPG/Tom McThune, 30 May 2010.jpg /volume1/Alpha/Storage/Research/Ancestry/Library (PSD)/Jonathan Perry/2010/PSD/5/JPG/Tom McThune, 30 May 2010.jpg
         */
console.log(3, filePath, psd)
console.log(4, toJpgPath(filePath), jpg)

        await Promise.all([
          copyFile(filePath, psd, constants.COPYFILE_EXCL),
          copyFile(toJpgPath(filePath), jpg, constants.COPYFILE_EXCL)
        ])
      }
    }

    /*
    await rm(DESTINATION, { recursive: true })
    await mkdir(DESTINATION)
    await cp(topDir, DESTINATION, { recursive: true }) */
  }
}
