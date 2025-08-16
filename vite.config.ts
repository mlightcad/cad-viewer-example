import { resolve } from 'path'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import viteCompression from 'vite-plugin-compression'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

import Unocss from 'unocss/vite'
import {
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []

  const plugins = [
    vue(),
    svgLoader(),
    Unocss({
      presets: [
        presetUno(),
        presetAttributify(),
        presetIcons({
          scale: 1.2,
          warn: true
        })
      ],
      transformers: [transformerDirectives(), transformerVariantGroup()]
    })
  ]

  // Add conditional plugins
  if (mode === 'analyze') {
    plugins.push(visualizer() as any)
  }

  if (command === 'serve') {
    plugins.push(
      viteStaticCopy({
        targets: [
          {
            src: './node_modules/@mlightcad/libredwg-web/dist/libredwg-web.js',
            dest: 'assets'
          }
        ]
      }) as any
    )
  }

  // Add compression plugins for production builds
  if (command === 'build') {
    plugins.push(
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        filter: /\.(js|css|svg|ttf|otf|eot|woff|woff2)$/i
      }) as any,
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        filter: /\.(js|css|svg|ttf|otf|eot|woff|woff2)$/i
      }) as any
    )
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: id => {
            if (id.includes('@mlightcad/libredwg-web')) {
              return 'libredwg-web'
            }
          }
        }
      }
    },
    plugins: plugins as any
  }
})
