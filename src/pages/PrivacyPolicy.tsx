import { useEffect, type ReactNode } from 'react'
import { AppShell } from '@/components/account/AppShell'
import { LegalSection, LegalUpdated } from '@/components/system/LegalSection'

/**
 * Politique de confidentialité — RGPD, responsable de traitement Adam Molitor.
 * Layout commun (AppShell), prose sobre en max-w-2xl, titres en font-display.
 */
export function PrivacyPolicy(): ReactNode {
  useEffect(() => {
    document.title = 'Confidentialité — Quorum'
    return () => {
      document.title = 'Quorum — Le consensus des intelligences'
    }
  }, [])

  return (
    <AppShell
      title="Politique de confidentialité"
      subtitle="Ce que Quorum collecte, pourquoi, et comment vos données sont protégées."
    >
      <div className="flex max-w-2xl flex-col gap-8">
        <LegalUpdated />

        <LegalSection title="Responsable de traitement">
          <p>
            Le responsable du traitement des données est <strong className="text-text">Adam
            Molitor</strong>, résidant en France. Quorum s’engage à traiter vos données dans le
            respect du Règlement Général sur la Protection des Données (RGPD).
          </p>
        </LegalSection>

        <LegalSection title="Données collectées">
          <p>Quorum applique une collecte minimale. Nous ne recueillons que :</p>
          <ul>
            <li>
              <strong className="text-text">votre adresse email</strong>, uniquement aux fins
              d’authentification de votre compte ;
            </li>
            <li>
              <strong className="text-text">les questions que vous posez</strong> et les réponses
              générées par les modèles, nécessaires au fonctionnement du service et à votre
              historique.
            </li>
          </ul>
          <p>
            Aucune autre donnée personnelle n’est collectée. Quorum reste utilisable sans compte,
            de façon anonyme.
          </p>
        </LegalSection>

        <LegalSection title="Hébergement et stockage">
          <p>
            Les questions et réponses sont stockées sur <strong className="text-text">Supabase</strong>,
            sur une infrastructure située dans l’Union européenne. Les données restent soumises au
            cadre de protection européen.
          </p>
        </LegalSection>

        <LegalSection title="Clés API (BYOK)">
          <p>
            Si vous fournissez votre propre clé API (mode « Bring Your Own Key »), celle-ci est
            chiffrée au repos en <strong className="text-text">AES-256-GCM</strong>. Elle n’est{' '}
            <strong className="text-text">jamais lue en clair</strong> ni journalisée : elle n’est
            déchiffrée qu’à la volée, le temps d’un appel, côté serveur.
          </p>
        </LegalSection>

        <LegalSection title="Adresses IP et anti-abus">
          <p>
            Pour limiter les abus (rate-limiting), votre adresse IP est{' '}
            <strong className="text-text">hachée</strong> avant tout traitement. Elle n’est{' '}
            <strong className="text-text">jamais stockée en clair</strong>.
          </p>
        </LegalSection>

        <LegalSection title="Publicité et revente">
          <p>
            Quorum <strong className="text-text">n’affiche aucune publicité</strong> et ne{' '}
            <strong className="text-text">revend aucune donnée</strong>. Vos questions et vos
            verdicts vous appartiennent.
          </p>
        </LegalSection>

        <LegalSection title="Vos droits">
          <p>
            Conformément au RGPD, vous disposez d’un droit d’accès, de rectification et de
            suppression de vos données. Pour exercer votre{' '}
            <strong className="text-text">droit de suppression</strong> ou toute autre demande,
            contactez-nous via les{' '}
            <a
              href="https://github.com/adammltr/Quorum/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline-offset-4 hover:underline"
            >
              GitHub Issues
            </a>{' '}
            du projet.
          </p>
        </LegalSection>
      </div>
    </AppShell>
  )
}
