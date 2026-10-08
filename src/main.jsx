import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initLargeTextClass } from '@/lib/largeText'

// Påfør «Større tekst»-klassen før render så det ikke blinker.
initLargeTextClass()

// Se etter ny service worker når appen kommer i forgrunnen igjen
// (registreringen sjekker bare ved oppstart).
if ('serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
