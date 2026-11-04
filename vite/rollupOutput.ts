import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

import type { ManualChunksOption, OutputOptions } from 'rollup'
import type { Alias } from 'vite'

function resolvePackageEntry(
  req: NodeRequire,
  name: string
): string | undefined {
  try {
    // `require.resolve` follows the Node "require"/"main" condition, which for
    // the renderer packages is often `*.umd.cjs`. This app imports with ESM
    // named exports, so prefer the sibling ESM build when present.
    const resolved = req.resolve(name)
    if (resolved.endsWith('.umd.cjs')) {
      const esm = resolved.slice(0, -'.umd.cjs'.length) + '.js'
      if (existsSync(esm)) {
        return esm
      }
    }
    // three's require export is build/three.cjs. That file calls
    // process.emitWarning when loaded, which throws in the browser.
    if (resolved.endsWith('.cjs')) {
      const esm = resolved.slice(0, -'.cjs'.length) + '.module.js'
      if (existsSync(esm)) {
        return esm
      }
    }
    return resolved
  } catch {
    return undefined
  }
}

/**
 * Resolves renderer peer packages from this app so nested imports inside the
 * viewer's prebuilt `dist` still bundle under pnpm's isolated layout.
 *
 * Resolve the package entry (`require.resolve(name)`), not `name/package.json`:
 * many `@mlightcad/*` packages omit `package.json` from `exports`.
 */
export function examplePeerPackageAliases(fromPackageDir: string): Alias[] {
  const require = createRequire(fromPackageDir + '/package.json')
  const fallbackRequire = createRequire(
    fromPackageDir + '/node_modules/@mlightcad/cad-simple-viewer/package.json'
  )
  const names = [
    '@mlightcad/mtext-renderer',
    '@mlightcad/three-renderer',
    'three'
  ] as const
  const aliases: Alias[] = []
  for (const name of names) {
    const direct = resolvePackageEntry(require, name)
    const fallback = direct
      ? undefined
      : resolvePackageEntry(fallbackRequire, name)
    const replacement = direct ?? fallback
    if (!replacement) {
      continue
    }
    aliases.push({
      find: name === 'three' ? /^three$/ : name,
      replacement
    })
  }
  return aliases
}

/**
 * Framework runtime shared by the upload screen and the viewer.
 *
 * These packages **must** get their own chunk. `manualChunks` otherwise folds
 * `vue` into whichever viewer package happens to import it first (the agent
 * plugin), and because the upload screen statically imports Vue through
 * element-plus, the app entry ends up statically importing that viewer chunk.
 * That drags the whole ~2 MB viewer stack into the initial payload and defeats
 * the lazy `import()` of `@mlightcad/cad-viewer`.
 */
const VENDOR_PACKAGE_PATTERNS = [
  /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?vue\//,
  /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?@vue\//,
  /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?lodash-es\//,
  /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?lodash-unified\//
] as const

/**
 * Virtual helper modules that both the upload screen and the viewer import
 * (`\0vite/preload-helper.js`, `\0commonjsHelpers.js`).
 *
 * They are pulled in statically by modules that also use a dynamic `import()`,
 * so wherever Rollup parks them, the importing chunk follows. Rollup merged
 * them into `cad-simple-viewer` / `data-model`, which made the entry (and the
 * vendor chunk) depend on the whole viewer. Pinning them to their own ~20 kB
 * chunk keeps those edges cheap.
 */
function isSharedVirtualModule(id: string): boolean {
  return id.startsWith('\0') || id.startsWith('\u0000')
}

function matchVendorPackage(id: string): boolean {
  const normalized = id.replace(/\\/g, '/')
  return VENDOR_PACKAGE_PATTERNS.some(pattern => pattern.test(normalized))
}

/** Export plugins that ship a separate lazy `/register` entry. */
const PLUGIN_PACKAGE_IDS = [
  'cad-pdf-plugin',
  'cad-html-plugin',
  'cad-svg-plugin',
  'cad-simple-ui-plugin',
  'cad-agent-plugin',
  'cad-script-plugin',
  'cad-onedrive-plugin',
  'cad-google-drive-plugin'
] as const

/** Core viewer libraries. */
const VIEWER_PACKAGE_IDS = [
  'cad-simple-viewer',
  'cad-diff-viewer',
  'three-renderer',
  'cad-html-core',
  'cad-agent-core',
  'cad-script-core'
] as const

/**
 * data-model and its tightly coupled packages — keep together to avoid
 * cross-chunk "extends undefined" for class hierarchies.
 */
const DATA_MODEL_PACKAGE_IDS = [
  'data-model',
  'geometry-engine',
  'graphic-interface',
  'common'
] as const

/**
 * Packages that stay with the three-renderer chunk (text/rendering stack).
 * three and data-model are split out separately for clearer caching.
 */
const THREE_RENDERER_STACK_IDS = [
  'three-renderer',
  'mtext-renderer',
  'mtext-parser',
  'shx-parser'
] as const

function isPluginRegisterModule(id: string, pluginId: string): boolean {
  return (
    id.includes(`${pluginId}/register`) ||
    id.includes(`${pluginId}\\register`) ||
    id.includes(`${pluginId}/dist/register.`) ||
    id.includes(`${pluginId}\\dist\\register.`) ||
    id.includes(`${pluginId}-register`)
  )
}

function matchMonorepoPackage(id: string, packageId: string): boolean {
  const normalized = id.replace(/\\/g, '/')
  return (
    normalized.includes(`/packages/${packageId}/`) ||
    normalized.includes(`/node_modules/@mlightcad/${packageId}/`) ||
    normalized.includes(`@mlightcad/${packageId}/`) ||
    normalized.includes(`@mlightcad/${packageId}`)
  )
}

/** Match the `three` package without catching `three-renderer` / `@types/three`. */
function matchThreePackage(id: string): boolean {
  const normalized = id.replace(/\\/g, '/')
  if (
    normalized.includes('three-renderer') ||
    normalized.includes('@types/three')
  ) {
    return false
  }
  return (
    normalized.includes('/node_modules/three/') ||
    normalized.includes('/node_modules/.pnpm/three@') ||
    /(?:^|\/)three\/(?:build|examples)\//.test(normalized)
  )
}

/**
 * Groups viewer packages into predictable Rollup chunks so `main-*.js` stays
 * small and each package can be cached independently.
 */
export const exampleManualChunks: ManualChunksOption = (id: string) => {
  // Keep the framework runtime out of the viewer chunks. The entry needs Vue
  // (via element-plus) no matter what, so folding it into a viewer chunk would
  // pull that entire chunk in eagerly.
  if (isSharedVirtualModule(id)) {
    return 'vite-helpers'
  }
  if (matchVendorPackage(id)) {
    return 'vendor'
  }

  if (
    matchMonorepoPackage(id, 'pdf-renderer') ||
    /(?:^|\/)pdf-lib(?:\/|$)/.test(id.replace(/\\/g, '/'))
  ) {
    return 'cad-pdf-plugin'
  }

  // Shared ACEX codecs / packagers ship with the HTML plugin chunk.
  if (matchMonorepoPackage(id, 'cad-html-core')) {
    return 'cad-html-plugin'
  }

  for (const pluginId of PLUGIN_PACKAGE_IDS) {
    if (!matchMonorepoPackage(id, pluginId)) {
      continue
    }
    // Register stubs are tiny; keep them in the app entry to avoid circular
    // chunks with cad-simple-viewer (register imports plugin manager types).
    if (isPluginRegisterModule(id, pluginId)) {
      return undefined
    }
    return pluginId
  }

  if (matchThreePackage(id)) {
    return 'three'
  }

  for (const packageId of DATA_MODEL_PACKAGE_IDS) {
    if (matchMonorepoPackage(id, packageId)) {
      return 'data-model'
    }
  }

  for (const packageId of THREE_RENDERER_STACK_IDS) {
    if (matchMonorepoPackage(id, packageId)) {
      return 'three-renderer'
    }
  }

  for (const packageId of VIEWER_PACKAGE_IDS) {
    if (packageId === 'three-renderer') {
      continue
    }
    if (matchMonorepoPackage(id, packageId)) {
      return packageId
    }
  }
}

/** Rollup output options shared by the `cad-*-example` apps. */
export const exampleRollupOutput: OutputOptions = {
  manualChunks: exampleManualChunks,
  chunkFileNames: 'assets/[name]-[hash].js',
  entryFileNames: 'assets/[name]-[hash].js',
  assetFileNames: 'assets/[name]-[hash][extname]'
}
