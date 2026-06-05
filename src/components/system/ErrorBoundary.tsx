import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Échec de chargement d'un module en code-split (déploiement, réseau coupé). */
function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch/i.test(
    `${error.name} ${error.message}`,
  )
}

/**
 * Garde-fou de dernier recours : capture toute erreur de rendu non gérée pour
 * éviter l'écran blanc. Distingue le cas fréquent du chunk périmé/inaccessible
 * (rechargement) du vrai bug applicatif. Sans dépendance externe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Visible en dev ; en prod, branchable sur un collecteur d'erreurs.
    console.error('[Quorum] Erreur non gérée :', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const chunk = isChunkLoadError(error)
    // Classe → pas de hook : on lit l'instance i18n directement (écran ponctuel).
    const t = i18n.t.bind(i18n)
    return (
      <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-1/4 left-1/2 h-[55vh] w-[80vw] max-w-[60rem] -translate-x-1/2 rounded-full bg-gold-dim blur-[140px]" />
        </div>
        <div className="flex max-w-md flex-col items-center gap-5">
          <span className="font-mono text-sm tracking-wider text-gold uppercase">
            {chunk ? t('errorBoundary.chunkEyebrow') : t('errorBoundary.crashEyebrow')}
          </span>
          <h1 className="font-display text-3xl leading-tight text-text sm:text-4xl">
            {chunk ? t('errorBoundary.chunkTitle') : t('errorBoundary.crashTitle')}
          </h1>
          <p className="text-lg leading-relaxed text-text-muted">
            {chunk ? t('errorBoundary.chunkBody') : t('errorBoundary.crashBody')}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('errorBoundary.reload')}
          </button>
        </div>
      </main>
    )
  }
}
