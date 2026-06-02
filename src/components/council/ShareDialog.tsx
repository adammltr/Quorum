import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Check, Copy, Link2, Loader2, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'
import { slotAccent } from './slots'
import {
  buildEmojiGrid,
  buildShareText,
  canNativeShare,
  copyToClipboard,
  createShare,
  linkedInIntentUrl,
  nativeShare,
  shareUrl,
  xIntentUrl,
} from '@/lib/share'

/**
 * Partage d'une délibération — la boucle d'acquisition gratuite.
 *
 * Le partage est créé paresseusement à l'ouverture (RPC idempotente), puis on
 * propose : aperçu de la carte, texte pré-rempli spoiler-friendly, copier-le-
 * lien, X, LinkedIn et partage natif. Toujours gratuit, jamais derrière le
 * paywall — visible y compris pour les sessions anonymes / FREE.
 */

interface ShareDialogProps {
  runId: string
  question: string
  consensusScore: number | null
  /** Slots présents dans l'ordre d'affichage (A, B, C, D…). */
  slots: string[]
  borda: Record<string, number> | null
  /** 'primary' = appel à l'action ambre ; 'inline' = bouton discret. */
  variant?: 'primary' | 'inline'
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; slug: string; url: string; text: string }
  | { kind: 'error'; message: string }

export function ShareDialog({
  runId,
  question,
  consensusScore,
  slots,
  borda,
  variant = 'primary',
}: ShareDialogProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)

  const grid = buildEmojiGrid(slots, borda)

  // Crée le partage à la première ouverture (puis le réutilise — RPC idempotente).
  useEffect(() => {
    if (!open || state.kind === 'loading' || state.kind === 'ready') return
    let cancelled = false
    const run = async () => {
      setState({ kind: 'loading' })
      track('share_opened', { run_id: runId })
      try {
        const slug = await createShare(runId)
        if (cancelled) return
        const url = shareUrl(slug)
        const text = buildShareText({ question, consensusScore, grid, url })
        setState({ kind: 'ready', slug, url, text })
        track('share_created', { slug })
      } catch (err) {
        if (cancelled) return
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Partage indisponible.',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open, runId, question, consensusScore, grid, state.kind])

  const handleCopy = useCallback(
    async (kind: 'link' | 'text', value: string) => {
      const ok = await copyToClipboard(value)
      if (ok) {
        setCopied(kind)
        track('share_copied', { kind })
        window.setTimeout(() => setCopied(null), 2000)
      }
    },
    [],
  )

  const handleNative = useCallback(async () => {
    if (state.kind !== 'ready') return
    const ok = await nativeShare({ title: 'Quorum', text: state.text, url: state.url })
    if (ok) track('share_channel', { channel: 'native' })
  }, [state])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {variant === 'primary' ? (
          <Button
            size="lg"
            className="bg-gold text-[oklch(18%_0.03_70)] hover:bg-gold/90"
          >
            <Share2 aria-hidden="true" />
            Partager le verdict
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Share2 aria-hidden="true" />
            Partager
          </Button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-2xl leading-snug text-text">
                Partager cette délibération
              </Dialog.Title>
              <p className="text-sm text-text-muted">
                Une page publique propre, gratuite et illimitée.
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Aperçu de la carte — ce qui se partage (sans révéler le verdict) */}
          <div className="relative overflow-hidden rounded-xl border border-gold/20 bg-surface p-5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 right-0 h-32 w-40 rounded-full bg-gold-dim blur-3xl"
            />
            <div className="relative flex flex-col gap-3">
              <span className="font-mono text-xs tracking-wider text-gold uppercase">
                Quorum · le consensus des intelligences
              </span>
              <p className="line-clamp-3 font-display text-lg leading-snug text-text">
                {question}
              </p>
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {slots.map((slot) => (
                    <span
                      key={slot}
                      className="size-2.5 rounded-full"
                      style={{ background: slotAccent(slot) }}
                    />
                  ))}
                </div>
                {consensusScore !== null && (
                  <span className="font-mono text-sm text-text-muted">
                    <span className="text-2xl text-text">{consensusScore}</span>% de consensus
                  </span>
                )}
              </div>
            </div>
          </div>

          {state.kind === 'error' ? (
            <p role="alert" className="text-sm text-dissent">
              {state.message}
            </p>
          ) : state.kind === 'ready' ? (
            <>
              {/* Texte pré-rempli — éditable visuellement, copiable */}
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-xs tracking-wide text-text-muted uppercase">
                  Texte de partage
                </span>
                <textarea
                  readOnly
                  rows={4}
                  value={state.text}
                  onFocus={(e) => e.currentTarget.select()}
                  className="resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-text focus:border-border-bright focus:outline-none"
                />
              </label>

              {/* Lien public + copie */}
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <Link2 aria-hidden="true" className="size-4 shrink-0 text-text-subtle" />
                  <span className="truncate font-mono text-sm text-text-muted">{state.url}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy('link', state.url)}
                  className="shrink-0"
                >
                  {copied === 'link' ? (
                    <>
                      <Check aria-hidden="true" className="text-consensus" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" />
                      Copier
                    </>
                  )}
                </Button>
              </div>

              {/* Canaux de diffusion */}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <a
                    href={xIntentUrl(state.text)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('share_channel', { channel: 'x' })}
                  >
                    Partager sur X
                  </a>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <a
                    href={linkedInIntentUrl(state.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('share_channel', { channel: 'linkedin' })}
                  >
                    LinkedIn
                  </a>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleCopy('text', state.text)}>
                  {copied === 'text' ? (
                    <>
                      <Check aria-hidden="true" className="text-consensus" />
                      Texte copié
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" />
                      Copier le texte
                    </>
                  )}
                </Button>
                {canNativeShare() && (
                  <Button variant="secondary" size="sm" onClick={handleNative}>
                    <Share2 aria-hidden="true" />
                    Plus…
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 py-4 text-sm text-text-muted">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Préparation du lien public…
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
