import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 404 — page introuvable. Soignée et dans le ton : pas d'écran cassé. On garde
 * l'atmosphère ambre et on renvoie en douceur vers l'assemblée.
 */
export function NotFound(): ReactNode {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-1/4 left-1/2 h-[55vh] w-[80vw] max-w-[60rem] -translate-x-1/2 rounded-full bg-gold-dim blur-[140px]" />
      </div>
      <div className="flex max-w-md flex-col items-center gap-5">
        <span className="font-mono text-sm tracking-wider text-gold uppercase">Erreur 404</span>
        <h1 className="font-display text-4xl leading-tight text-text sm:text-5xl">
          L’assemblée ne siège pas ici.
        </h1>
        <p className="text-lg leading-relaxed text-text-muted">
          Cette page n’existe pas — ou la délibération s’est déjà dissoute.
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link to="/">
            <ArrowLeft aria-hidden="true" />
            Revenir à l’assemblée
          </Link>
        </Button>
      </div>
    </main>
  )
}
