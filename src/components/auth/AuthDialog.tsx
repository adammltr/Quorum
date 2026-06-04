import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Dialog } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, KeyRound, Loader2, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from './use-auth'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accroche contextuelle (ex. « pour sauvegarder cette délibération »). */
  reason?: string
}

const OTP_LENGTH = 6

/** Vue courante du dialog : saisie de l'email, puis saisie du code reçu. */
type View =
  | { step: 'email' }
  | { step: 'otp'; email: string; mode: 'convert' | 'signin' }

const GoogleMark = (): ReactNode => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
    <path
      fill="currentColor"
      d="M21.35 11.1H12v3.2h5.35c-.23 1.5-1.6 4.4-5.35 4.4a6.2 6.2 0 1 1 0-12.4c1.77 0 2.96.75 3.64 1.4l2.48-2.4C16.45 3.3 14.45 2.4 12 2.4a9.6 9.6 0 1 0 0 19.2c5.55 0 9.2-3.9 9.2-9.4 0-.63-.07-1.1-.15-1.6Z"
    />
  </svg>
)

/**
 * Saisie d'un code à 6 chiffres : 6 cases distinctes, focus auto sur la case
 * suivante, collage automatique des 6 chiffres, retour arrière intelligent.
 * La case active porte une bordure ambre (token `gold`).
 */
function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
}: {
  value: string
  onChange: (next: string) => void
  onComplete: (code: string) => void
  disabled?: boolean
  invalid?: boolean
}): ReactNode {
  const { t } = useTranslation()
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '')

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]
    el?.focus()
    el?.select()
  }

  const commit = (next: string) => {
    onChange(next)
    if (next.length === OTP_LENGTH) onComplete(next)
  }

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1) // ne garde qu'un chiffre
    if (!digit) return
    const arr = digits.slice()
    arr[i] = digit
    commit(arr.join('').slice(0, OTP_LENGTH))
    if (i < OTP_LENGTH - 1) focusBox(i + 1)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const arr = digits.slice()
      if (arr[i]) {
        arr[i] = ''
        onChange(arr.join(''))
      } else if (i > 0) {
        arr[i - 1] = ''
        onChange(arr.join(''))
        focusBox(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      e.preventDefault()
      focusBox(i + 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    commit(pasted)
    focusBox(pasted.length >= OTP_LENGTH ? OTP_LENGTH - 1 : pasted.length)
  }

  return (
    <div
      role="group"
      aria-label={t('auth.otpGroupLabel', { n: OTP_LENGTH })}
      className="flex justify-center gap-3"
    >
      {digits.map((d, i) => (
        <input
          // Position fixe (6 cases) : l'index est une clé stable et correcte ici.
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={t('auth.digitLabel', { n: i + 1 })}
          aria-invalid={invalid}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-14 w-14 min-w-0 rounded-lg border bg-surface-raised text-center font-mono text-2xl text-text',
            'transition-colors focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none',
            invalid ? 'border-dissent/60' : d ? 'border-border-bright' : 'border-border',
          )}
        />
      ))}
    </div>
  )
}

/**
 * Création de compte / connexion par code OTP à 6 chiffres. Pour une session
 * anonyme, l'email RATTACHE l'identité (même auth.uid) : l'historique de la
 * session n'est jamais perdu. Aucun mot de passe.
 */
export function AuthDialog({ open, onOpenChange, reason }: AuthDialogProps): ReactNode {
  const { t } = useTranslation()
  const { sendMagicLink, verifyOtp, signInWithGoogle, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [view, setView] = useState<View>({ step: 'email' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Réinitialise tout à la fermeture (tous les chemins passent par onOpenChange :
  // bouton Fermer, Échap, clic overlay, succès de vérification).
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setView({ step: 'email' })
      setCode('')
      setBusy(false)
      setError(null)
    }
    onOpenChange(next)
  }

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value || busy) return
    setBusy(true)
    setError(null)
    const res = await sendMagicLink(value)
    setBusy(false)
    if (res.ok) {
      setCode('')
      setView({ step: 'otp', email: value, mode: res.mode })
    } else {
      setError(res.message ?? t('auth.sendFailed'))
    }
  }

  const handleVerify = async (fullCode: string) => {
    if (view.step !== 'otp' || busy) return
    if (fullCode.length !== OTP_LENGTH) return
    setBusy(true)
    setError(null)
    const res = await verifyOtp(view.email, fullCode)
    setBusy(false)
    if (res.ok) {
      handleOpenChange(false)
    } else {
      setError(t('auth.codeInvalid'))
      setCode('')
    }
  }

  const handleResend = async () => {
    if (view.step !== 'otp' || busy) return
    setBusy(true)
    setError(null)
    const res = await sendMagicLink(view.email)
    setBusy(false)
    setCode('')
    if (!res.ok) setError(res.message ?? t('auth.resendFailed'))
  }

  const backToEmail = () => {
    setView({ step: 'email' })
    setCode('')
    setError(null)
  }

  const isOtp = view.step === 'otp'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className={cn(
            'glass-card fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col shadow-2xl focus:outline-none',
            isOtp
              ? 'w-[min(28rem,calc(100vw-2rem))] gap-6 p-8'
              : 'w-[min(28rem,calc(100vw-2rem))] gap-5 p-6',
          )}
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-2xl leading-snug text-text">
                {isOtp ? t('auth.otpTitle') : t('auth.title')}
              </Dialog.Title>
              <p className={cn('text-text-muted', isOtp ? 'text-base' : 'text-sm')}>
                {isOtp ? (
                  <>
                    {t('auth.codeSentTo')}
                    <br />
                    <span className="font-semibold text-text">{view.email}</span>
                  </>
                ) : (
                  reason ?? t('auth.reasonDefault')
                )}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('common.close')}>
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          {isOtp ? (
            // ── Écran 2 : saisie du code OTP ──
            <div className="flex flex-col gap-6">
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={(c) => void handleVerify(c)}
                disabled={busy}
                invalid={!!error}
              />

              {error && (
                <p role="alert" className="text-center text-sm text-dissent">
                  {error}{' '}
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    className="font-medium text-gold underline-offset-2 hover:underline"
                  >
                    {t('auth.resendQ')}
                  </button>
                </p>
              )}

              <Button
                type="button"
                size="lg"
                className="mt-6 h-12 w-full text-base"
                disabled={busy || code.length !== OTP_LENGTH}
                onClick={() => void handleVerify(code)}
              >
                {busy ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    {t('auth.verifying')}
                  </>
                ) : (
                  <>
                    <KeyRound aria-hidden="true" />
                    {t('auth.validate')}
                  </>
                )}
              </Button>

              <div className="mt-4 flex items-center justify-between px-1 text-sm text-text-subtle">
                <button
                  type="button"
                  onClick={backToEmail}
                  disabled={busy}
                  className="inline-flex items-center gap-1 underline-offset-2 transition-colors hover:text-text-muted disabled:opacity-50"
                >
                  <ArrowLeft aria-hidden="true" className="size-3.5" />
                  {t('auth.changeEmail')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={busy}
                  className="underline-offset-2 transition-colors hover:text-text-muted disabled:opacity-50"
                >
                  {t('auth.resendCode')}
                </button>
              </div>
            </div>
          ) : (
            // ── Écran 1 : Google + email ──
            <>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full text-base"
                disabled={!configured}
                onClick={() => void signInWithGoogle()}
              >
                <GoogleMark />
                {t('auth.continueGoogle')}
              </Button>

              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-xs text-text-subtle">{t('auth.or')}</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleEmail} className="flex flex-col gap-2.5">
                <label htmlFor="auth-email" className="sr-only">
                  {t('auth.emailLabel')}
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  disabled={!configured || busy}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
                {error && (
                  <p role="alert" className="text-sm text-dissent">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={!configured || busy}>
                  {busy ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      {t('auth.sending')}
                    </>
                  ) : (
                    <>
                      <Mail aria-hidden="true" />
                      {t('auth.getCode')}
                    </>
                  )}
                </Button>
              </form>

              {!configured && (
                <p className="text-center text-xs text-text-subtle">
                  {t('auth.demoUnavailable')}
                </p>
              )}
              <p className="text-center text-xs text-text-subtle">
                {t('auth.noPassword')}
              </p>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
