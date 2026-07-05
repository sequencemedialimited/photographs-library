declare global {
  namespace PhotographsLibraryTypes {
    export interface FileDateType {
      createDate?: Date | null
      modifyDate?: Date | null
      dateTime?: Date | null
      birthTime?: Date | null
      atime?: Date | null
      mtime?: Date | null
      ctime?: Date | null
    }
  }
}

export {}
