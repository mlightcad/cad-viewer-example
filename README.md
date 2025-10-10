# CAD Viewer Example

This is an example application that demonstrates how to use the `@mlightcad/cad-viewer` component with a full-featured Vue.js interface.

[**🌐 Live Demo**](https://mlightcad.gitlab.io/cad-viewer-example/)

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

- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- element-plus
- vue
- vue-i18n

Secondly, add the following code in your Vue component.


```vue
<template>
  <MlCadViewer locale="zh" url="https://cdn.jsdelivr.net/gh/mlight-lee/cad-data/data/anteen.dwg" />
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
</script>
```

Finally, copy the following files to **dist/assets** folder.

- ./node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js
- ./node_modules/@mlightcad/cad-simple-viewer/dist/libredwg-parser-worker.js
- ./node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js

Those files are used to parser dxf/dwg files in web worker so that UI not blocked. You can copy those files to folder **dist/assets** manually.
However, vite-plugin-static-copy is recommended to make your life easier.

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
          src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets'
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