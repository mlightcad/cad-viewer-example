<template>
  <div id="app-root">
    <!-- Upload screen when no drawing is open -->
    <div v-if="!showViewer" class="upload-screen">
      <FileUpload
        @file-select="handleFileSelect"
        @new-drawing="handleNewDrawing"
      />
      <!-- Stay on upload UI while CAD chunks load — avoids theme background flash -->
      <div v-if="preparingViewer" class="preparing-overlay" aria-live="polite">
        <div class="preparing-spinner" />
        <p>Preparing viewer…</p>
      </div>
    </div>

    <!-- Mount only after the CAD module is ready -->
    <div v-else-if="MlCadViewer" class="viewer-screen">
      <component
        :is="MlCadViewer"
        locale="default"
        :local-file="store.selectedFile ?? undefined"
        :mode="openOptions.mode"
        :use-main-thread-draw="openOptions.useMainThreadDraw"
        :draw-no-plot-layers="openOptions.drawNoPlotLayers"
        :progressive-rendering="openOptions.progressiveRendering"
        :open-view-mode="openOptions.openViewMode"
        :circle-sides="openOptions.circleSides"
        :paper-space-background="openOptions.paperSpaceBackground"
        :disable-export="openOptions.disableExport"
        @create="onViewerCreate"
        :base-url="BASE_URL"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  type Component
} from 'vue'

import type { AcApOpenOptionsPayload } from './openOptions'
import FileUpload from './components/FileUpload.vue'
import {
  ACDB_DRAW_CIRCLE_SIDES_DRAFT,
  ACGI_PAPER_SPACE_BACKGROUND,
  AcEdOpenMode
} from './openOptions'
import { store } from './store'

const BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'

const showViewer = computed(
  () => store.selectedFile != null || store.isNewDrawing
)

const openOptions = ref<AcApOpenOptionsPayload>({
  mode: AcEdOpenMode.Write,
  useMainThreadDraw: true,
  drawNoPlotLayers: false,
  progressiveRendering: false,
  openViewMode: undefined,
  circleSides: ACDB_DRAW_CIRCLE_SIDES_DRAFT,
  paperSpaceBackground: ACGI_PAPER_SPACE_BACKGROUND,
  disableExport: false
})
const preparingViewer = ref(false)

let i18nInstalled = false
const MlCadViewer = shallowRef<Component>()

// Capture at setup time: `getCurrentInstance()` is null inside async callbacks.
const app = getCurrentInstance()!.appContext.app

const loadCadViewer = async () => {
  if (MlCadViewer.value) return
  const [
    { LIBREDWG_PARSER_WORKER_FILE, AcApSettingManager },
    { registerLibreDwgConverter },
    { initializeLocale },
    { MlCadViewer: Viewer, i18n }
  ] = await Promise.all([
    import('@mlightcad/cad-simple-viewer'),
    import('./registerLibreDwg'),
    import('./locale'),
    import('@mlightcad/cad-viewer')
  ])

  // Isolate this example's persisted prefs from other cad-* demos that share
  // the same origin (they all default to the `settings` localStorage key).
  AcApSettingManager.configure({
    storageKey: 'mlightcad.settings.cad-viewer-example'
  })
  // Merge host command descriptions before the viewer mounts.
  initializeLocale()
  // Opt into GPL DWG support before the viewer opens any drawing (1.6.0+).
  registerLibreDwgConverter(`./assets/${LIBREDWG_PARSER_WORKER_FILE}`)
  if (!i18nInstalled) {
    // The viewer's components call `useI18n()`; install its instance once.
    app.use(i18n)
    i18nInstalled = true
  }
  MlCadViewer.value = Viewer as Component
}

/** Warm CAD chunks after first paint so opening a file is faster. */
const prefetchCadStack = () => {
  void Promise.all([
    loadCadViewer(),
    import('@mlightcad/cad-simple-viewer'),
    import('./commands')
  ])
}

onMounted(() => {
  const startPrefetch = () => {
    if (showViewer.value || preparingViewer.value) return
    prefetchCadStack()
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(startPrefetch, { timeout: 3000 })
  } else {
    window.setTimeout(startPrefetch, 500)
  }
})

const initialize = async () => {
  const { AcApDocManager, AcEdCommandStack } = await import(
    '@mlightcad/cad-simple-viewer'
  )
  const { AcApQuitCmd } = await import('./commands')

  if (import.meta.env.DEV) {
    ;(
      window as Window & { AcApDocManager?: typeof AcApDocManager }
    ).AcApDocManager = AcApDocManager
  }
  const register = AcApDocManager.instance.commandManager
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'quit',
    'quit',
    new AcApQuitCmd()
  )
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'exit',
    'exit',
    new AcApQuitCmd()
  )
}

const createNewDrawing = async () => {
  const { AcApDocManager, layoutBackgroundColorFromRgb } = await import(
    '@mlightcad/cad-simple-viewer'
  )
  const success = await AcApDocManager.instance.newDocument({
    mode: openOptions.value.mode,
    drawNoPlotLayers: openOptions.value.drawNoPlotLayers,
    progressiveRendering: openOptions.value.progressiveRendering,
    circleSides: openOptions.value.circleSides,
    sysVars: {
      paperbkcolor: layoutBackgroundColorFromRgb(
        openOptions.value.paperSpaceBackground
      )
    },
    ...(openOptions.value.openViewMode != null
      ? { openViewMode: openOptions.value.openViewMode }
      : {})
  })
  if (!success) {
    console.error('Failed to create new drawing')
  }
}

const onViewerCreate = async () => {
  await initialize()
  if (store.isNewDrawing) {
    await nextTick()
    await createNewDrawing()
  }
}

/** Ensure CAD module is ready before leaving the upload screen. */
const prepareThenOpen = async (
  options: AcApOpenOptionsPayload,
  open: () => void
) => {
  if (preparingViewer.value) return
  preparingViewer.value = true
  try {
    await loadCadViewer()
    openOptions.value = options
    open()
  } catch (error) {
    console.error('Failed to load CAD viewer', error)
  } finally {
    preparingViewer.value = false
  }
}

const handleFileSelect = (file: File, options: AcApOpenOptionsPayload) => {
  void prepareThenOpen(options, () => {
    store.isNewDrawing = false
    store.selectedFile = file
  })
}

const handleNewDrawing = (options: AcApOpenOptionsPayload) => {
  void prepareThenOpen(options, () => {
    store.selectedFile = null
    store.isNewDrawing = true
  })
}
</script>

<style scoped>
#app-root {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}

.upload-screen {
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: safe center;
  overflow-y: auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  position: absolute;
  z-index: 1000;
  pointer-events: auto;
}

.preparing-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.28);
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  z-index: 2;
}

.preparing-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: preparing-spin 0.8s linear infinite;
}

@keyframes preparing-spin {
  to {
    transform: rotate(360deg);
  }
}

.viewer-screen {
  width: 100%;
  height: 100%;
}
</style>
