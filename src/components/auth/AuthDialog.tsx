import { useState, type FormEvent, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Check, Loader2, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from './use-auth'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accroche contextuelle (ex. « pour sauvegarder cette délibération »). */
  reason?: string
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; mode: 'convert' | 'signin'; email: string }
  | { kind: 'error'; message: string }

const GoogleMark = (): ReactNode => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
    <path
      fill="currentColor"
      d="M21.35 11.1H12v3.2h5.35c-.23 1.5-1.6 4.4-5.35 4.4a6.2 6.2 0 1 1 0-12.4c1.77 0 2.96.75 3.64 1.4l2.48-2.4C16.45 3.3 14.45 2.4 12 2.4a9.6 9.6 0 1 0 0 19.2c5.55 0 9.2-3.9 9.2-9.4 0-.63-.07-1.1-.15-1.6Z"
    />
  </svg>
)

/**
 * Création de compte / connexion. Pour une session anonyme, l'email ou Google
 * RATTACHE l'identité (même auth.uid) : l'historique de la session n'est jamais
 * perdu. Aucun mot de passe — lien magique uniquement.
 */
export function AuthDialog({ open, onOpenChange, reason }: AuthDialogProps): ReactNode {
  const { sendMagicLink, signInWithGoogle, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>({ kind: 'idle' })

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value) return
    setState({ kind: 'sending' })
    const res = await sendMagicLink(value)
    if (res.ok) setState({ kind: 'sent', mode: res.mode, email: value })
    else setState({ kind: 'error', message: res.message ?? 'Envoi impossible. Réessaie.' })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-2xl leading-snug text-text">
                Garder cette assemblée
              </Dialog.Title>
              <p className="text-sm text-text-muted">
                {reason ?? 'Crée ton compte pour retrouver tes délibérations, partout.'}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          {state.kind === 'sent' ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-consensus/30 bg-consensus-dim px-5 py-6 text-center">
              <Check aria-hidden="true" className="size-6 text-consensus" />
              <p className="text-sm text-text">
                Lien envoyé à <span className="font-medium">{state.email}</span>. Ouvre-le sur cet
                appareil pour {state.mode === 'convert' ? 'rattacher' : 'ouvrir'} ton compte.
              </p>
              {state.mode === 'convert' && (
                <p className="text-xs text-text-muted">
                  Ton historique de cette session reste attaché — rien n’est perdu.
                </p>
              )}
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={!configured}
                onClick={() => void signInWithGoogle()}
              >
                <GoogleMark />
                Continuer avec Google
              </Button>

              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-xs text-text-subtle">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleEmail} className="flex flex-col gap-2.5">
                <label htmlFor="auth-email" className="sr-only">
                  Adresse email
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="toi@exemple.com"
                  value={email}
                  disabled={!configured || state.kind === 'sending'}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={state.kind === 'error'}
                />
                {state.kind === 'error' && (
                  <p role="alert" className="text-sm text-dissent">
                    {state.message}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={!configured || state.kind === 'sending'}>
                  {state.kind === 'sending' ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Mail aria-hidden="true" />
                      Recevoir un lien magique
                    </>
                  )}
                </Button>
              </form>

              {!configured && (
                <p className="text-center text-xs text-text-subtle">
                  Authentification indisponible : backend Supabase non configuré (mode démo).
                </p>
              )}
              <p className="text-center text-xs text-text-subtle">
                Pas de mot de passe. On t’envoie un lien sécurisé.
              </p>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
