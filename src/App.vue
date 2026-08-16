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
        locale="en"
        :local-file="store.selectedFile ?? undefined"
        :mode="selectedMode"
        :use-main-thread-draw="useMainThreadDraw"
        :draw-no-plot-layers="drawNoPlotLayers"
        :progressive-rendering="progressiveRendering"
        :open-view-mode="openViewMode"
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

import FileUpload from './components/FileUpload.vue'
import { AcApOpenViewMode, AcEdOpenMode } from './openOptions'
import { store } from './store'

const BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'

const showViewer = computed(
  () => store.selectedFile != null || store.isNewDrawing
)

const selectedMode = ref<AcEdOpenMode>(AcEdOpenMode.Write)
const useMainThreadDraw = ref(false)
const drawNoPlotLayers = ref(false)
const progressiveRendering = ref(false)
const openViewMode = ref<AcApOpenViewMode | undefined>(undefined)
const preparingViewer = ref(false)

const app = getCurrentInstance()!.appContext.app
let i18nInstalled = false
const MlCadViewer = shallowRef<Component>()

const loadCadViewer = async () => {
  if (MlCadViewer.value) return
  const [
    { LIBREDWG_PARSER_WORKER_FILE },
    { registerLibreDwgConverter },
    { MlCadViewer: Viewer, i18n }
  ] = await Promise.all([
    import('@mlightcad/cad-simple-viewer'),
    import('./registerLibreDwg'),
    import('@mlightcad/cad-viewer')
  ])
  // Opt into GPL DWG support before the viewer mounts (1.6.0+).
  registerLibreDwgConverter(`./assets/${LIBREDWG_PARSER_WORKER_FILE}`)
  if (!i18nInstalled) {
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
    import('./locale'),
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
  const { initializeLocale } = await import('./locale')
  const { AcApQuitCmd } = await import('./commands')

  initializeLocale()
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
  const { AcApDocManager } = await import('@mlightcad/cad-simple-viewer')
  const success = await AcApDocManager.instance.newDocument({
    mode: selectedMode.value,
    drawNoPlotLayers: drawNoPlotLayers.value,
    progressiveRendering: progressiveRendering.value,
    ...(openViewMode.value != null ? { openViewMode: openViewMode.value } : {})
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

const applyOpenOptions = (
  mode: AcEdOpenMode,
  mainThreadDraw: boolean,
  showNoPlotLayers: boolean,
  enableProgressiveRendering: boolean,
  viewMode: AcApOpenViewMode | undefined
) => {
  selectedMode.value = mode
  useMainThreadDraw.value = mainThreadDraw
  drawNoPlotLayers.value = showNoPlotLayers
  progressiveRendering.value = enableProgressiveRendering
  openViewMode.value = viewMode
}

/** Ensure CAD module is ready before leaving the upload screen. */
const prepareThenOpen = async (open: () => void) => {
  if (preparingViewer.value) return
  preparingViewer.value = true
  try {
    await loadCadViewer()
    open()
  } catch (error) {
    console.error('Failed to load CAD viewer', error)
  } finally {
    preparingViewer.value = false
  }
}

const handleFileSelect = (
  file: File,
  mode: AcEdOpenMode,
  mainThreadDraw: boolean,
  showNoPlotLayers: boolean,
  enableProgressiveRendering: boolean,
  viewMode: AcApOpenViewMode | undefined
) => {
  void prepareThenOpen(() => {
    store.isNewDrawing = false
    applyOpenOptions(
      mode,
      mainThreadDraw,
      showNoPlotLayers,
      enableProgressiveRendering,
      viewMode
    )
    store.selectedFile = file
  })
}

const handleNewDrawing = (
  mode: AcEdOpenMode,
  mainThreadDraw: boolean,
  showNoPlotLayers: boolean,
  enableProgressiveRendering: boolean,
  viewMode: AcApOpenViewMode | undefined
) => {
  void prepareThenOpen(() => {
    store.selectedFile = null
    applyOpenOptions(
      mode,
      mainThreadDraw,
      showNoPlotLayers,
      enableProgressiveRendering,
      viewMode
    )
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
