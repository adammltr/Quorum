import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { ThemeProvider } from './components/theme/ThemeProvider'

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('Élément racine #root introuvable.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
