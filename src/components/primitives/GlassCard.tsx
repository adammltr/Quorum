import { type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type GlassCardProps = ComponentProps<'div'>

/**
 * Carte de verre — applique la recette glassmorphism cross-browser de
 * DESIGN.md §4 (.glass-card, définie dans index.css). Chaque modèle du
 * conseil est une carte de verre.
 */
export function GlassCard({ className, children, ...props }: GlassCardProps): ReactNode {
  return (
    <div className={cn('glass-card', className)} {...props}>
      {children}
    </div>
  )
}
