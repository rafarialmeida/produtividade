import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'navigate' && typeof event.data.url === 'string') {
    window.history.pushState({}, '', event.data.url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
