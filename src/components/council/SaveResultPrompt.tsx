import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Bookmark, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/use-auth'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { AddToCollectionDialog } from '@/components/account/AddToCollectionDialog'
import { track } from '@/lib/analytics'
import { easeMedium } from '@/lib/motion'

/**
 * Invitation à conserver le résultat — affichée UNIQUEMENT après le premier
 * verdict (premier moment de valeur, SPEC §7 soft paywall). Jamais intrusive,
 * toujours fermable.
 *
 * - Session anonyme → créer un compte (rattache la session, rien n'est perdu).
 * - Déjà inscrit     → la délibération est déjà dans l'historique ; on propose
 *   de l'épingler dans une collection.
 */

interface SaveResultPromptProps {
  runId: string
  onDismiss: () => void
}

export function SaveResultPrompt({ runId, onDismiss }: SaveResultPromptProps): ReactNode {
  const reduced = useReducedMotion()
  const { isAuthenticated } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  const handleSignUp = () => {
    track('signup_intent', { source: 'save_result' })
    setAuthOpen(true)
  }

  return (
    <motion.div
      className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface/60 px-5 py-4"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { ...easeMedium, delay: 0.3 }}
    >
      {isAuthenticated ? (
        <>
          <Check aria-hidden="true" className="size-5 shrink-0 text-consensus" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm font-medium text-text">Sauvegardée dans ton historique</p>
            <p className="text-sm text-text-muted">
              Range-la dans une collection pour la retrouver vite.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPinOpen(true)}>
              <Bookmark aria-hidden="true" />
              Épingler
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Fermer">
              <X aria-hidden="true" />
            </Button>
          </div>
          <AddToCollectionDialog runId={runId} open={pinOpen} onOpenChange={setPinOpen} />
        </>
      ) : (
        <>
          <Bookmark aria-hidden="true" className="size-5 shrink-0 text-gold" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm font-medium text-text">Sauvegarder cette délibération</p>
            <p className="text-sm text-text-muted">
              Crée un compte gratuit pour la retrouver — sans ça, elle s’efface après 7 jours.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={handleSignUp}>
              Créer un compte
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Fermer">
              <X aria-hidden="true" />
            </Button>
          </div>
          <AuthDialog
            open={authOpen}
            onOpenChange={setAuthOpen}
            reason="Crée ton compte pour garder cette délibération — ta session reste attachée."
          />
        </>
      )}
    </motion.div>
  )
}
