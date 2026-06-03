/**
 * Contrôle d'accès « admin » — réservé au propriétaire du projet.
 *
 * La vitrine interne (/_designsystem) et tout futur outil interne ne doivent
 * être visibles QUE pour l'auteur. On reconnaît son identité à une sous-chaîne
 * stable de l'email (insensible à la casse), pas à un id codé en dur.
 */

const ADMIN_EMAIL_NEEDLES = ['adammltr', 'adammolitor'] as const

/** true si l'email appartient à l'admin (vitrine design system, outils internes). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.toLowerCase()
  return ADMIN_EMAIL_NEEDLES.some((needle) => e.includes(needle))
}
