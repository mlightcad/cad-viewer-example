import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vue from '@vitejs/plugin-vue'

/**
 * Split heavy peer deps into their own chunks so `main-*.js` stays smaller
 * and each package can be cached independently.
 *
 * Keep `data-model` with `geometry-engine` / `graphic-interface` / `common`
 * (tight class hierarchy). Keep `mtext-*` / `shx-parser` with `three-renderer`
 * so they are not absorbed into the viewer and create a circular chunk edge.
 * `three` includes `three/examples/jsm/*`.
 */
function viewerManualChunk(id: string): string | undefined {
  const path = id.replace(/\\/g, '/')
  if (
    path.includes('/node_modules/three/') ||
    path.includes('/node_modules/.pnpm/three@')
  ) {
    return 'three'
  }
  if (
    path.includes('/@mlightcad/three-renderer/') ||
    path.includes('/@mlightcad/mtext-renderer/') ||
    path.includes('/@mlightcad/mtext-parser/') ||
    path.includes('/@mlightcad/shx-parser/')
  ) {
    return 'three-renderer'
  }
  if (
    path.includes('/@mlightcad/data-model/') ||
    path.includes('/@mlightcad/geometry-engine/') ||
    path.includes('/@mlightcad/graphic-interface/') ||
    path.includes('/@mlightcad/common/')
  ) {
    return 'data-model'
  }
}

export default defineConfig(() => {
  const plugins = [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets',
          rename: { stripBase: true }
        },
        {
          src: './node_modules/@mlightcad/cad-html-plugin/dist/viewer-runtime.iife.js',
          dest: 'assets',
          rename: { stripBase: true }
        }
      ]
    })
  ]

  return {
    base: './',
    build: {
      outDir: 'dist',
      modulePreload: false,
      rollupOptions: {
        input: {
          main: 'index.html'
        },
        output: {
          manualChunks: viewerManualChunk
        }
      }
    },
    plugins: plugins
  }
})
