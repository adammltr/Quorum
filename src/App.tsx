import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { DesignSystem } from './pages/DesignSystem'

// La page publique n'est utile qu'aux visiteurs d'un lien partagé : on la charge
// à la demande pour ne pas alourdir le bundle initial du parcours principal.
const PublicResult = lazy(() =>
  import('./pages/PublicResult').then((m) => ({ default: m.PublicResult })),
)

// Espaces « compte & rétention » — chargés à la demande (hors parcours first-run).
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })))
const Collections = lazy(() =>
  import('./pages/Collections').then((m) => ({ default: m.Collections })),
)
const Councils = lazy(() => import('./pages/Councils').then((m) => ({ default: m.Councils })))

// Rituel quotidien — Question du Jour (rendez-vous + archive SEO).
const DailyQuestion = lazy(() =>
  import('./pages/DailyQuestion').then((m) => ({ default: m.DailyQuestion })),
)
const DailyArchive = lazy(() =>
  import('./pages/DailyArchive').then((m) => ({ default: m.DailyArchive })),
)

export function App(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Page publique d'un résultat partagé (SSR meta via api/share.ts) */}
      <Route
        path="/q/:slug"
        element={
          <Suspense fallback={null}>
            <PublicResult />
          </Suspense>
        }
      />
      {/* Rituel quotidien — Question du Jour */}
      <Route
        path="/jour"
        element={
          <Suspense fallback={null}>
            <DailyQuestion />
          </Suspense>
        }
      />
      <Route
        path="/jour/archive"
        element={
          <Suspense fallback={null}>
            <DailyArchive />
          </Suspense>
        }
      />
      <Route
        path="/jour/:day"
        element={
          <Suspense fallback={null}>
            <DailyQuestion />
          </Suspense>
        }
      />
      {/* Espaces compte & rétention */}
      <Route
        path="/history"
        element={
          <Suspense fallback={null}>
            <History />
          </Suspense>
        }
      />
      <Route
        path="/collections"
        element={
          <Suspense fallback={null}>
            <Collections />
          </Suspense>
        }
      />
      <Route
        path="/collections/:id"
        element={
          <Suspense fallback={null}>
            <Collections />
          </Suspense>
        }
      />
      <Route
        path="/councils"
        element={
          <Suspense fallback={null}>
            <Councils />
          </Suspense>
        }
      />
      {/* Page interne non listée — vitrine du design system */}
      <Route path="/_designsystem" element={<DesignSystem />} />
    </Routes>
  )
}
