import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { FadeIn, GlassCard, SpringReveal, StaggerContainer } from '@/components/primitives'

/* ── Données de démonstration ─────────────────────────────────────── */

interface Swatch {
  name: string
  className: string
  note: string
}

const surfaceSwatches: readonly Swatch[] = [
  { name: 'background', className: 'bg-background', note: 'encre chaude' },
  { name: 'surface', className: 'bg-surface', note: 'cartes' },
  { name: 'surface-raised', className: 'bg-surface-raised', note: 'modales' },
  { name: 'border', className: 'bg-border', note: 'séparateurs' },
  { name: 'border-bright', className: 'bg-border-bright', note: 'focus' },
]

const textSwatches: readonly Swatch[] = [
  { name: 'text', className: 'bg-text', note: 'principal' },
  { name: 'text-muted', className: 'bg-text-muted', note: 'labels' },
  { name: 'text-subtle', className: 'bg-text-subtle', note: 'désactivé' },
]

const goldSwatches: readonly Swatch[] = [
  { name: 'gold', className: 'bg-gold', note: 'verdict' },
  { name: 'gold-muted', className: 'bg-gold-muted', note: 'hover' },
  { name: 'gold-dim', className: 'bg-gold-dim', note: 'lueur' },
]

const voteSwatches: readonly Swatch[] = [
  { name: 'consensus', className: 'bg-consensus', note: 'accord' },
  { name: 'partial', className: 'bg-partial', note: 'partiel' },
  { name: 'dissent', className: 'bg-dissent', note: 'désaccord' },
]

const typeScale: readonly { token: string; cls: string; px: string }[] = [
  { token: 'text-5xl', cls: 'text-5xl', px: '61px' },
  { token: 'text-4xl', cls: 'text-4xl', px: '49px' },
  { token: 'text-3xl', cls: 'text-3xl', px: '39px' },
  { token: 'text-2xl', cls: 'text-2xl', px: '31px' },
  { token: 'text-xl', cls: 'text-xl', px: '25px' },
  { token: 'text-lg', cls: 'text-lg', px: '20px' },
  { token: 'text-base', cls: 'text-base', px: '16px' },
  { token: 'text-sm', cls: 'text-sm', px: '13px' },
]

const councilModels: readonly { name: string; latency: string }[] = [
  { name: 'llama-3.3-70b', latency: '1.2s' },
  { name: 'mistral-7b', latency: '0.9s' },
  { name: 'gemma-2-9b', latency: '1.5s' },
  { name: 'qwen3-235b', latency: '2.1s' },
]

/* ── Sous-composants ──────────────────────────────────────────────── */

function SwatchRow({ items }: { items: readonly Swatch[] }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((s) => (
        <div key={s.name} className="flex flex-col gap-2">
          <div
            className={`h-16 w-full rounded-lg border border-border ${s.className}`}
          />
          <div className="flex flex-col">
            <span className="font-mono text-xs text-text">{s.name}</span>
            <span className="text-xs text-text-subtle">{s.note}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string
  kicker: string
  children: ReactNode
}): ReactNode {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 border-b border-border pb-4">
        <span className="font-mono text-xs tracking-wider text-gold uppercase">
          {kicker}
        </span>
        <h2 className="font-display text-3xl text-text">{title}</h2>
      </header>
      {children}
    </section>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */

export function DesignSystem(): ReactNode {
  // Clé pour rejouer l'animation orchestrée (remonte le conteneur).
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div className="relative min-h-dvh">
      {/* Atmosphère de fond */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute -top-40 left-1/4 h-[50vh] w-[50vh] rounded-full bg-gold-dim blur-[140px]" />
        <div className="absolute right-1/4 bottom-0 h-[40vh] w-[40vh] rounded-full bg-consensus-dim blur-[140px]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16 lg:px-10">
        {/* En-tête */}
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-wider text-text-muted uppercase">
              Quorum · Design System
            </span>
            <h1 className="font-display text-5xl leading-tight text-text">
              La matière de l'assemblée
            </h1>
            <p className="max-w-xl text-text-muted">
              Tokens OKLCH, typographie éditoriale, verre et mouvement — la
              traduction vivante de{' '}
              <code className="font-mono text-gold">docs/DESIGN.md</code>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="font-mono text-sm text-text-muted underline-offset-4 hover:text-text hover:underline"
            >
              ← Accueil
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Palette */}
        <Section kicker="01 — Couleur" title="Palette OKLCH">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-sm text-text-muted">Surfaces</h3>
              <SwatchRow items={surfaceSwatches} />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-sm text-text-muted">Texte</h3>
              <SwatchRow items={textSwatches} />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-sm text-text-muted">
                Accent signature — or
              </h3>
              <SwatchRow items={goldSwatches} />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-sm text-text-muted">
                Sémantique du vote
              </h3>
              <SwatchRow items={voteSwatches} />
            </div>
          </div>
        </Section>

        {/* Typographie */}
        <Section kicker="02 — Typographie" title="Trois voix">
          <div className="grid gap-8 lg:grid-cols-3">
            <GlassCard className="flex flex-col gap-3 p-6">
              <span className="font-mono text-xs text-gold">Display</span>
              <p className="font-display text-4xl leading-tight text-text">
                Instrument Serif
              </p>
              <p className="font-display text-2xl text-text-muted italic">
                Le verdict de l'assemblée
              </p>
            </GlassCard>
            <GlassCard className="flex flex-col gap-3 p-6">
              <span className="font-mono text-xs text-gold">UI / Corps</span>
              <p className="font-sans text-4xl text-text">Geist Sans</p>
              <p className="font-sans text-base text-text-muted">
                La conscience peut-elle être simulée, ou est-elle
                fondamentalement biologique&nbsp;?
              </p>
            </GlassCard>
            <GlassCard className="flex flex-col gap-3 p-6">
              <span className="font-mono text-xs text-gold">Technique</span>
              <p className="font-mono text-4xl text-text">Geist Mono</p>
              <p className="font-mono text-sm text-text-muted">
                consensus = 72% · 1.84s · borda
              </p>
            </GlassCard>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {typeScale.map((t) => (
              <div
                key={t.token}
                className="flex items-baseline gap-4 border-b border-border/50 pb-2"
              >
                <span className="w-20 shrink-0 font-mono text-xs text-text-subtle">
                  {t.px}
                </span>
                <span className={`font-display text-text ${t.cls}`}>
                  Quorum
                </span>
                <span className="ml-auto font-mono text-xs text-text-subtle">
                  {t.token}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Composants shadcn */}
        <Section kicker="03 — Composants" title="Boutons & badges">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Convoquer l'assemblée</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="outline">Contour</Button>
              <Button variant="ghost">Fantôme</Button>
              <Button variant="destructive">Annuler</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Défaut</Badge>
              <Badge variant="secondary">PRO</Badge>
              <Badge variant="outline">:free</Badge>
              <Badge variant="destructive">Rate-limit</Badge>
            </div>
          </div>
        </Section>

        {/* Verre + mouvement */}
        <Section kicker="04 — Verre & mouvement" title="Le conseil s'assemble">
          <div className="flex items-center justify-between">
            <p className="text-text-muted">
              Chaque modèle est une carte de verre. Entrée orchestrée en
              ressort.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplayKey((k) => k + 1)}
            >
              <RotateCcw aria-hidden="true" />
              Rejouer
            </Button>
          </div>

          <StaggerContainer
            key={replayKey}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {councilModels.map((model) => (
              <SpringReveal key={model.name} inStagger>
                <GlassCard className="flex h-44 flex-col justify-between p-5">
                  <div className="flex items-center justify-between">
                    <span
                      className="h-2 w-2 rounded-full bg-consensus"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs text-text-subtle">
                      {model.latency}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-text">{model.name}</p>
                  <p className="text-xs leading-relaxed text-text-muted">
                    Réponse en cours de délibération…
                  </p>
                </GlassCard>
              </SpringReveal>
            ))}
          </StaggerContainer>

          {/* Verdict — fondu distinct, accent or */}
          <FadeIn key={`verdict-${replayKey}`} delay={0.5}>
            <GlassCard className="mt-2 flex flex-col gap-4 p-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tracking-wider text-gold uppercase">
                  Verdict du Chairman
                </span>
                <span className="ml-auto font-mono text-4xl text-gold">72%</span>
              </div>
              <p className="font-display text-3xl leading-snug text-text">
                Les quatre modèles convergent sur l'essentiel, mais divergent
                sur la nature du substrat.
              </p>
              <div className="flex gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-consensus" />
                <span className="h-1.5 flex-1 rounded-full bg-partial" />
                <span className="h-1.5 w-8 rounded-full bg-dissent" />
              </div>
            </GlassCard>
          </FadeIn>
        </Section>

        <footer className="border-t border-border pt-8 pb-4 font-mono text-xs text-text-subtle">
          Quorum — page interne /_designsystem · non listée
        </footer>
      </div>
    </div>
  )
}
