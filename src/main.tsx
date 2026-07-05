import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSyncLoop } from './store/github'
import { pullAll } from './store/db'
import { getRepoConfig, getToken } from './store/github'

startSyncLoop()
if (getToken() && getRepoConfig()) {
  // hydrate from the data repo in the background (multi-device sync)
  void pullAll().catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
