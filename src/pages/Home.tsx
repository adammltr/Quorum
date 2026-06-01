import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function Home(): ReactNode {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Lueur ambre discrète en fond — atmosphère, pas décoration gratuite */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-gold-dim blur-[120px]"
      />

      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <main className="relative flex max-w-2xl flex-col items-center text-center">
        <p className="font-mono text-sm tracking-wider text-text-muted uppercase">
          Le consensus des intelligences
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-text">
          Quorum
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-text-muted">
          Posez une question. Regardez quatre intelligences délibérer, se juger en
          aveugle, puis rendre un verdict.
        </p>

        <Link
          to="/_designsystem"
          className="mt-10 font-mono text-sm text-gold underline-offset-4 transition-colors hover:text-gold-muted hover:underline"
        >
          → Voir le design system
        </Link>
      </main>
    </div>
  )
}
