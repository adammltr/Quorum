import { type ReactNode } from 'react'

/**
 * Brique de mise en page des pages légales (Confidentialité, CGU).
 *
 * Titre en font-display, corps en prose sobre (text-text-muted, interlignage
 * généreux). Les listes/paragraphes héritent d'un espacement homogène pour une
 * lecture calme, fidèle au ton éditorial de DESIGN.md.
 */
export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}): ReactNode {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl leading-snug text-text sm:text-2xl">{title}</h2>
      <div className="flex flex-col gap-3 text-base leading-relaxed text-text-muted [&_a]:text-gold [&_li]:ml-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}

/** Mention « dernière mise à jour » discrète, en tête de page légale. */
export function LegalUpdated(): ReactNode {
  return (
    <p className="font-mono text-xs tracking-wide text-text-subtle uppercase">
      Dernière mise à jour : 3 juin 2026
    </p>
  )
}
