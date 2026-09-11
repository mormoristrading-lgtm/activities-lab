import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
// Self-hosted fonts (bundled + precached → fully available offline).
// Latin subset only — keeps the offline app shell light.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
// Theme-specific display faces — small subset of weights, loaded lazily by the browser.
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/fraunces/latin-500.css'
import '@fontsource/fraunces/latin-700.css'

import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

// Ask the browser to keep our IndexedDB data from being evicted (best-effort).
if ('storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persist().catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
