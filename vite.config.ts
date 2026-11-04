import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

import {
  examplePeerPackageAliases,
  exampleRollupOutput
} from './vite/rollupOutput'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Runtime assets copied verbatim into `dist/assets`.
 *
 * Keep these names aligned with `@mlightcad/cad-simple-viewer`'s
 * `AcApWorkerAssets` and `@mlightcad/libredwg-converter`.
 */
const LIBREDWG_CONVERTER_PACKAGE = '@mlightcad/libredwg-converter'
const LIBREDWG_PARSER_WORKER_FILE = 'libredwg-parser-worker.js'
const LIBREDWG_PARSER_WASM_FILE = 'libredwg-web.wasm'
const MTEXT_RENDERER_WORKER_FILE = 'mtext-renderer-worker.js'
const VIEWER_RUNTIME_FILE = 'viewer-runtime.iife.js'

const MTEXT_WORKER_SRC = `./node_modules/@mlightcad/cad-simple-viewer/dist/${MTEXT_RENDERER_WORKER_FILE}`
const LIBREDWG_DIST = `./node_modules/${LIBREDWG_CONVERTER_PACKAGE}/dist`
const LIBREDWG_WORKER_SRC = `${LIBREDWG_DIST}/${LIBREDWG_PARSER_WORKER_FILE}`
const LIBREDWG_WASM_SRC = `${LIBREDWG_DIST}/${LIBREDWG_PARSER_WASM_FILE}`
const VIEWER_RUNTIME_SRC = `./node_modules/@mlightcad/cad-html-plugin/dist/${VIEWER_RUNTIME_FILE}`

/**
 * Packages that the viewer loads lazily through dynamic `import()`.
 *
 * They are listed in `optimizeDeps.exclude` so dev mode serves them as-is
 * instead of pre-bundling every vendor chunk up front.
 */
const LAZY_VIEWER_PACKAGES = [
  '@mlightcad/cad-agent-plugin',
  '@mlightcad/cad-html-plugin',
  '@mlightcad/cad-pdf-plugin',
  '@mlightcad/cad-simple-viewer',
  '@mlightcad/cad-svg-plugin',
  '@mlightcad/cad-viewer',
  '@mlightcad/pdf-renderer',
  '@mlightcad/three-renderer'
]

export default defineConfig(({ command, mode }) => {
  const hasViewerRuntime = existsSync(resolve(__dirname, VIEWER_RUNTIME_SRC))
  if (!hasViewerRuntime) {
    console.warn(
      `[cad-viewer-example] ${VIEWER_RUNTIME_FILE} not found — HTML export will be unavailable. ` +
        'Opening DXF/DWG does not require this file.'
    )
  }
  const hasLibreDwgWasm = existsSync(resolve(__dirname, LIBREDWG_WASM_SRC))

  const plugins = [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: MTEXT_WORKER_SRC,
          dest: 'assets',
          rename: { stripBase: true }
        },
        {
          src: LIBREDWG_WORKER_SRC,
          dest: 'assets',
          rename: { stripBase: true }
        },
        // The wasm file must sit next to the LibreDWG parser worker.
        ...(hasLibreDwgWasm
          ? [
              {
                src: LIBREDWG_WASM_SRC,
                dest: 'assets',
                rename: { stripBase: true }
              }
            ]
          : []),
        ...(hasViewerRuntime
          ? [
              {
                src: VIEWER_RUNTIME_SRC,
                dest: 'assets',
                rename: { stripBase: true }
              }
            ]
          : [])
      ]
    })
  ]

  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      // Resolve `three` / renderer entries from this package so nested imports
      // inside the viewer's prebuilt dist still resolve under pnpm.
      alias: examplePeerPackageAliases(__dirname)
    },
    optimizeDeps: {
      // Pre-bundle the PDF stack so the first lazy import of the PDF plugin
      // does not trigger a Vite optimizeDeps full-page reload.
      include:
        command === 'serve'
          ? [
              '@mlightcad/pdf-renderer > pdf-lib',
              '@mlightcad/pdf-renderer > @pdf-lib/fontkit',
              '@mlightcad/pdf-renderer > pdf-lib > @pdf-lib/standard-fonts',
              '@mlightcad/pdf-renderer > pdf-lib > @pdf-lib/upng',
              '@mlightcad/pdf-renderer > pako'
            ]
          : [],
      exclude: command === 'serve' ? LAZY_VIEWER_PACKAGES : []
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      minify: true,
      rollupOptions: {
        input: {
          main: 'index.html'
        },
        output: exampleRollupOutput
      }
    },
    plugins
  }
})
