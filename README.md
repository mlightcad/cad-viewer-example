# CAD Viewer Example

This is an example application that demonstrates how to use the `@mlightcad/cad-viewer` component with a full-featured Vue.js interface.

[**🌐 Live Demo**](https://mlightcad.github.io/cad-viewer-example/)

## Features

- 🎨 **Full UI Interface**: Complete CAD viewer with toolbars, ribbons, menus, and status bar
- 🌐 **Internationalization**: Multi-language support (English, Chinese, Turkish, Czech, Arabic)
- 🎯 **Advanced Controls**: Layer management, point styles, settings, and more
- 📁 **File Support**: DXF and DWG file loading with drag & drop
- ⚙️ **Open options**: Access mode, initial view, curve quality, text rendering, progressive
  rendering, non-plottable layers, paper background, and export toggle

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Analyze the bundle
pnpm analyze

# Preview production build
pnpm preview
```

## Usage

Firstly, add the following dependencies into your `package.json`.

- @mlightcad/cad-agent-plugin
- @mlightcad/cad-html-plugin
- @mlightcad/cad-pdf-plugin
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-svg-plugin
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @mlightcad/libredwg-converter (optional, GPL-3.0 — required for DWG)
- @mlightcad/pdf-renderer
- @mlightcad/three-renderer
- @vueuse/core
- element-plus
- lodash-es
- three
- vue
- vue-i18n

`@mlightcad/cad-viewer` imports `@mlightcad/cad-{html,pdf,svg}-plugin/register` and its
renderer peers directly, so those packages must be installed even if your app never
exports to those formats.

### Register a DWG converter (required for DWG since 1.6.0)

From `@mlightcad/cad-viewer` **1.6.0**, DXF parsing stays built-in, but **DWG is opt-in**. `@mlightcad/cad-simple-viewer` / `@mlightcad/cad-viewer` no longer depend on or register `@mlightcad/libredwg-converter`. Hosts that need open-source DWG support must:

1. Add `@mlightcad/libredwg-converter` (GPL-3.0)
2. Copy its worker **and** wasm next to each other
3. Register the converter **before** the viewer opens a `.dwg` file

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'
import { LIBREDWG_PARSER_WORKER_FILE } from '@mlightcad/cad-simple-viewer'

const converter = new AcDbLibreDwgConverter({
  convertByEntityType: false,
  useWorker: true,
  parserWorkerUrl: `./assets/${LIBREDWG_PARSER_WORKER_FILE}`
})
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

This example does that in `src/registerLibreDwg.ts` and calls it from `src/App.vue` before `MlCadViewer` mounts.

If you ship a closed-source product and cannot distribute GPL code, skip LibreDWG and use a proprietary DWG converter instead. See [cad-viewer proprietary parser](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md).

### Use the Vue component

```vue
<template>
  <MlCadViewer
    locale="default"
    url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/anteen.dwg"
    :mode="AcEdOpenMode.Write"
    :circle-sides="50"
    base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
  />
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
</script>
```

### Install the viewer's `vue-i18n` instance

`@mlightcad/cad-viewer` ships its own `vue-i18n` instance (`i18n`) and every component
calls `useI18n()`. Install it once before mounting the viewer, otherwise you get
`Uncaught SyntaxError: Need to install with app.use function`:

```typescript
import { i18n, MlCadViewer } from '@mlightcad/cad-viewer'

app.use(i18n)
```

Custom command messages must be merged into **both** registries — `AcApI18n` (core
translation) and the viewer's `i18n` (Vue UI). See `src/locale/index.ts`.

### Copy worker and runtime assets

Copy the following files to the **dist/assets** folder. The LibreDWG wasm file must sit next to `libredwg-parser-worker.js`.

- `./node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js`
- `./node_modules/@mlightcad/libredwg-converter/dist/libredwg-parser-worker.js`
- `./node_modules/@mlightcad/libredwg-converter/dist/libredwg-web.wasm`
- `./node_modules/@mlightcad/cad-html-plugin/dist/viewer-runtime.iife.js`

DXF parsing is built into `@mlightcad/data-model` (`AcDbNativeDxfConverter`, registered by default), so no DXF parser worker is needed.
The LibreDWG parser worker runs DWG parsing off the main thread so the UI stays responsive; the MText renderer worker handles multiline text off the main thread.
`viewer-runtime.iife.js` is required by the HTML export plugin.
You can copy those files to **dist/assets** manually; `vite-plugin-static-copy` is recommended.

```typescript
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => {
  const plugins = [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js',
          dest: 'assets',
          rename: { stripBase: true }
        },
        {
          src: './node_modules/@mlightcad/libredwg-converter/dist/libredwg-parser-worker.js',
          dest: 'assets',
          rename: { stripBase: true }
        },
        {
          src: './node_modules/@mlightcad/libredwg-converter/dist/libredwg-web.wasm',
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
        // Main entry point for the app
        input: {
          main: 'index.html'
        }
      }
    },
    plugins: plugins
  }
})
```

### Chunking

`vite/rollupOutput.ts` groups the viewer stack into stable Rollup chunks
(`three`, `three-renderer`, `data-model`, `cad-simple-viewer`, `cad-viewer`, one chunk per
export plugin) so the app entry stays small and each package can be cached
independently. It mirrors `packages/vite-config/pluginRollupOutput.ts` in the
[cad-viewer monorepo](https://github.com/mlightcad/cad-viewer).

Two extra rules protect the lazy `import()` of `@mlightcad/cad-viewer` and are easy to
lose when tuning `manualChunks`:

- `vue`, `@vue/*`, `lodash-es` and `lodash-unified` go to a `vendor` chunk. The upload
  screen imports Vue statically (through element-plus), so if Rollup folds Vue into a
  viewer package chunk, the entry statically depends on that whole chunk.
- Vite's virtual helpers (`\0vite/preload-helper.js`, `\0commonjsHelpers.js`) go to
  `vite-helpers`. They are pulled in statically by modules that also use a dynamic
  `import()`, so wherever Rollup parks them, their importer follows.

Regressing either rule takes the eager entry payload from ~184 kB to several megabytes.
`pnpm analyze` writes `stats.html` for checking this.

### Version alignment

`@mlightcad/cad-viewer` **1.7.8** declares `@mlightcad/data-model` 1.15.21 as an exact
peer, and `@mlightcad/libredwg-converter` **3.15.21** peers on the same 1.15.21. Both are
pinned exactly in `package.json` so the whole viewer stack (including the `@mlightcad/common`
/ `geometry-engine` / `graphic-interface` trio that `data-model` depends on) resolves to a
single copy. When bumping the viewer, bump `libredwg-converter` to the matching 3.15.x
release; `pnpm install` otherwise installs two `data-model` copies and the DWG converter
silently stops being registered against the open database.

## License

[MIT](LICENSE)

DWG support in this example uses `@mlightcad/libredwg-converter`, which is licensed under GPL-3.0.
