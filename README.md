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

Firstly, add the following dependencies into your package.json.

- @mlightcad/cad-agent-plugin
- @mlightcad/cad-html-plugin
- @mlightcad/cad-pdf-plugin
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- element-plus
- lodash-es
- three
- vue
- vue-i18n

Secondly, add the following code in your Vue component.


```vue
<template>
  <MlCadViewer locale="zh" url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data/data/anteen.dwg" />
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
</script>
```

Finally, copy the following files to **dist/assets** folder.

- ./node_modules/@mlightcad/cad-simple-viewer/dist/libredwg-parser-worker.js
- ./node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js
- ./node_modules/@mlightcad/cad-html-plugin/dist/viewer-runtime.iife.js

DXF parsing is built into `@mlightcad/data-model` (`AcDbNativeDxfConverter`, registered by default), so the old `dxf-json` parser worker is no longer needed.
The LibreDWG parser worker still runs DWG parsing off the main thread so the UI stays responsive; the MText renderer worker handles multiline text off the main thread.
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