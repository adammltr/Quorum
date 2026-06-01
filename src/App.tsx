import { type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { DesignSystem } from './pages/DesignSystem'

export function App(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Page interne non listée — vitrine du design system */}
      <Route path="/_designsystem" element={<DesignSystem />} />
    </Routes>
  )
}
