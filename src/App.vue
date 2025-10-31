<template>
  <MlCadViewer
    locale="en"
    url="https://mlightcad.gitlab.io/cad-data/data/anteen.dwg"
    base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
  />
</template>

<script setup lang="ts">
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'

AcApSettingManager.instance.isShowCommandLine = false
// Decide whether to show vertical toolbar at the right side, performance stats, coordinates in status bar, etc.
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = false
// AcApSettingManager.instance.isShowCoordinate = false
</script>

