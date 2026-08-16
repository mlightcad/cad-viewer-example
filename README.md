# CAD Viewer Example

This is an example application that demonstrates how to use the `@mlightcad/cad-viewer` component with a full-featured Vue.js interface.

[**🌐 Live Demo**](https://mlightcad.github.io/cad-viewer-example/)

## Features

- 🎨 **Full UI Interface**: Complete CAD viewer with toolbars, menus, and status bar
- 🌐 **Internationalization**: Multi-language support (English and Chinese)
- 🎯 **Advanced Controls**: Layer management, point styles, settings, and more
- 📁 **File Support**: DXF and DWG file loading with drag & drop

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Usage

Firstly, add the following dependencies into your `package.json`.

- @mlightcad/cad-agent-plugin
- @mlightcad/cad-html-plugin
- @mlightcad/cad-pdf-plugin
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @mlightcad/libredwg-converter (optional, GPL-3.0 — required for DWG)
- element-plus
- lodash-es
- three
- vue
- vue-i18n

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
  <MlCadViewer locale="zh" url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data/data/anteen.dwg" />
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
</script>
```

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

## License

[MIT](LICENSE)

DWG support in this example uses `@mlightcad/libredwg-converter`, which is licensed under GPL-3.0.
