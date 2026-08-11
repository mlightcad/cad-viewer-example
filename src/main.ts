import 'element-plus/dist/index.css'

import { createApp } from 'vue'

import App from './App.vue'

const app = createApp(App)
app.mount('#app')

const loader = document.getElementById('loader')
if (loader) {
  loader.style.display = 'none'
}
