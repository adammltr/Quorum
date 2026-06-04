import { useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthDialog } from '@/components/auth/AuthDialog'

/**
 * Gate « comptes uniquement » pour les délibérations passées de la Question du
 * Jour (l'archive et /jour/:day d'une date révolue). La question d'aujourd'hui
 * reste accessible à tous.
 *
 * Deux usages :
 * - `DailyGate` : overlay modal, déclenché au clic sur une carte d'archive.
 * - `DailyGateInline` : panneau centré, à la place du contenu d'une page d'archive.
 */

const TITLE = 'Les délibérations passées t’attendent'
const TEXT =
  'Crée un compte gratuit pour accéder à toutes les questions passées et comparer ton verdict au consensus mondial.'
const AUTH_REASON = 'pour accéder aux délibérations passées'

const goldButton =
  'w-full bg-gold text-[oklch(18%_0.03_70)] hover:bg-gold/90 focus-visible:ring-2 focus-visible:ring-ring'

/** Overlay modal, fermable (« Continuer sans compte » ne navigue pas). */
export function DailyGate({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactNode {
  const [authOpen, setAuthOpen] = useState(false)

  const handleLogin = (): void => {
    onOpenChange(false)
    setAuthOpen(true)
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content
            className="glass-card fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 p-8 text-center shadow-2xl focus:outline-none"
            aria-describedby={undefined}
          >
            <Calendar aria-hidden="true" className="size-8 text-gold" />
            <Dialog.Title className="font-display text-2xl leading-snug text-text">
              {TITLE}
            </Dialog.Title>
            <p className="text-sm text-text-muted">{TEXT}</p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <Button size="lg" className={goldButton} onClick={handleLogin}>
                Se connecter
              </Button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md py-1.5 text-sm text-text-subtle underline-offset-4 transition-colors hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Continuer sans compte
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} reason={AUTH_REASON} />
    </>
  )
}

/** Panneau inline (à la place du contenu d'une page /jour/:day passée). */
export function DailyGateInline(): ReactNode {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="glass-card flex w-[min(26rem,calc(100vw-2rem))] flex-col items-center gap-4 p-8 text-center shadow-2xl">
        <Calendar aria-hidden="true" className="size-8 text-gold" />
        <h1 className="font-display text-2xl leading-snug text-text">{TITLE}</h1>
        <p className="text-sm text-text-muted">{TEXT}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Button size="lg" className={goldButton} onClick={() => setAuthOpen(true)}>
            Se connecter
          </Button>
          <Button variant="ghost" asChild className="text-sm text-text-subtle hover:text-text-muted">
            <Link to="/jour">Voir la question du jour</Link>
          </Button>
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} reason={AUTH_REASON} />
    </div>
  )
}
