import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
// Bundled with the app so it works offline (OFL-1.1).
import '@fontsource-variable/manrope'
import './index.css'

if (Capacitor.isNativePlatform()) {
  // Remove the service worker older Android builds installed.
  navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()))
} else {
  registerSW({ immediate: true })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
