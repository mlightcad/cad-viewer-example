/**
 * Local mirrors of `@mlightcad/cad-simple-viewer` / `@mlightcad/data-model`
 * constants so the upload screen does not pull the CAD viewer stack into the
 * initial bundle. Values must stay in sync with the libraries (1.7.x).
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

/**
 * Open options forwarded to `MlCadViewer` for both file open and new drawings.
 *
 * Mirrors the subset of `AcApOpenDatabaseOptions` / `MlCadViewer` props this
 * example exposes on the upload screen.
 */
export interface AcApOpenOptionsPayload {
  mode: AcEdOpenMode
  useMainThreadDraw: boolean
  drawNoPlotLayers: boolean
  progressiveRendering: boolean
  openViewMode: AcApOpenViewMode | undefined
  circleSides: number
  paperSpaceBackground: number
  disableExport: boolean
}

/** `ACDB_DRAW_CIRCLE_SIDES_*` from `@mlightcad/data-model`. */
export const ACDB_DRAW_CIRCLE_SIDES_DRAFT = 50
export const ACDB_DRAW_CIRCLE_SIDES_STANDARD = 100
export const ACDB_DRAW_CIRCLE_SIDES_HIGH = 1000

/** `ACGI_*_SPACE_BACKGROUND` from `@mlightcad/graphic-interface`. */
export const ACGI_MODEL_SPACE_BACKGROUND = 0x000000
export const ACGI_PAPER_SPACE_BACKGROUND = 0xffffff
