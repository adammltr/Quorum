import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { DesignSystem } from './pages/DesignSystem'
import { RouteFallback } from './components/system/RouteFallback'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './components/auth/use-auth'
import { isAdminEmail } from './lib/admin'

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

// Page d'un résultat complet (run détenu) — historique cliquable.
const RunResult = lazy(() => import('./pages/RunResult').then((m) => ({ default: m.RunResult })))

// Pages légales — chargées à la demande (hors parcours principal).
const PrivacyPolicy = lazy(() =>
  import('./pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })),
)
const TermsOfService = lazy(() =>
  import('./pages/TermsOfService').then((m) => ({ default: m.TermsOfService })),
)

// Paramètres — placeholder (réglages câblés ultérieurement).
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

// 404 — page introuvable (catch-all), chargée à la demande.
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

/**
 * Garde « admin » : réserve une route au propriétaire du projet. Tant que la
 * session n'est pas résolue, on patiente (jamais de redirection prématurée).
 * Un visiteur non-admin est renvoyé en douceur vers l'accueil.
 */
function AdminRoute({ children }: { children: ReactNode }): ReactNode {
  const { ready, email } = useAuth()
  if (!ready) return <RouteFallback />
  if (!isAdminEmail(email)) return <Navigate to="/" replace />
  return children
}

export function App(): ReactNode {
  return (
    // Un seul Suspense englobe toutes les routes lazy : un fallback soigné
    // (jamais d'écran blanc) le temps que le chunk de la page arrive.
    <AppLayout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Page publique d'un résultat partagé (SSR meta via api/share.ts) */}
          <Route path="/q/:slug" element={<PublicResult />} />
          {/* Rituel quotidien — Question du Jour */}
          <Route path="/jour" element={<DailyQuestion />} />
          <Route path="/jour/archive" element={<DailyArchive />} />
          <Route path="/jour/:day" element={<DailyQuestion />} />
          {/* Espaces compte & rétention */}
          <Route path="/history" element={<History />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<Collections />} />
          <Route path="/councils" element={<Councils />} />
          {/* Page de résultat complète d'un run détenu (depuis l'historique) */}
          <Route path="/run/:runId" element={<RunResult />} />
          {/* Pages légales */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          {/* Paramètres du compte (placeholder) */}
          <Route path="/settings" element={<Settings />} />
          {/* Page interne non listée — vitrine du design system (admin uniquement) */}
          <Route
            path="/_designsystem"
            element={
              <AdminRoute>
                <DesignSystem />
              </AdminRoute>
            }
          />
          {/* Catch-all — 404 soignée, jamais d'écran vide */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  )
}
