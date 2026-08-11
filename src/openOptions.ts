/**
 * Local mirrors of @mlightcad/cad-simple-viewer enums so the upload screen
 * does not pull the CAD viewer stack into the initial bundle.
 * Values must stay in sync with the library.
 */
export enum AcEdOpenMode {
  Read = 0,
  Review = 4,
  Write = 8
}

export enum AcApOpenViewMode {
  Extents = 'extents',
  Saved = 'saved'
}
