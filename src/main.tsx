import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { ThemeProvider } from './components/theme/ThemeProvider'
import { AuthProvider } from './components/auth/AuthProvider'
import { PaywallProvider } from './components/billing/PaywallProvider'
import { ErrorBoundary } from './components/system/ErrorBoundary'

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('Élément racine #root introuvable.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <PaywallProvider>
              <App />
            </PaywallProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
