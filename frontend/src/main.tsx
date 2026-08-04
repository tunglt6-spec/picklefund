import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PwaReloadPrompt } from './components/PwaReloadPrompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaReloadPrompt />
  </StrictMode>,
)
