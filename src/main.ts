import { createApp } from 'vue'
import { Quasar } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './styles/app.scss'
import App from './App.vue'

createApp(App).use(Quasar, { config: {} }).mount('#app')
