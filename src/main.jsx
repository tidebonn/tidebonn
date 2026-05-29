import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initLargeTextClass } from '@/lib/largeText'

// Påfør «Større tekst»-klassen før render så det ikke blinker.
initLargeTextClass()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
