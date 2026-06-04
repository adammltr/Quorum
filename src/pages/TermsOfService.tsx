import { useEffect, type ReactNode } from 'react'
import { AppShell } from '@/components/account/AppShell'
import { LegalSection, LegalUpdated } from '@/components/system/LegalSection'

/**
 * Conditions Générales d’Utilisation — cadre d’usage de Quorum, droit français.
 * Layout commun (AppShell), prose sobre en max-w-2xl, titres en font-display.
 */
export function TermsOfService(): ReactNode {
  useEffect(() => {
    document.title = 'CGU — Quorum'
    return () => {
      document.title = 'Quorum — Le consensus des intelligences'
    }
  }, [])

  return (
    <AppShell
      title="Conditions générales d’utilisation"
      subtitle="Le cadre d’usage de Quorum. En utilisant le service, vous acceptez ces conditions."
    >
      <div className="flex max-w-2xl flex-col gap-8">
        <LegalUpdated />

        <LegalSection title="Nature du service">
          <p>
            Quorum est un <strong className="text-text">outil d’aide à la réflexion</strong> fondé
            sur l’intelligence artificielle. Il soumet une question à plusieurs modèles, les fait
            s’évaluer mutuellement, puis en synthétise un verdict de consensus.
          </p>
        </LegalSection>

        <LegalSection title="Absence de conseil professionnel">
          <p>
            Les réponses générées <strong className="text-text">ne constituent pas des conseils
            professionnels</strong>, qu’ils soient médicaux, juridiques ou financiers. Elles ne
            remplacent en aucun cas l’avis d’un praticien qualifié. Pour toute décision importante,
            consultez un professionnel compétent.
          </p>
        </LegalSection>

        <LegalSection title="Responsabilité de l’utilisateur">
          <p>
            Vous êtes <strong className="text-text">seul responsable de l’usage</strong> que vous
            faites des réponses fournies par Quorum, ainsi que des questions que vous soumettez.
            Vous vous engagez à utiliser le service de manière licite et loyale.
          </p>
        </LegalSection>

        <LegalSection title="Fourniture « en l’état »">
          <p>
            Le service est fourni <strong className="text-text">« tel quel »</strong>, sans
            garantie d’exactitude, de disponibilité ou d’adéquation à un usage particulier. Quorum
            ne saurait être tenu responsable des conséquences résultant de l’utilisation des
            réponses.
          </p>
        </LegalSection>

        <LegalSection title="Évolution du service">
          <p>
            Quorum se réserve le droit de <strong className="text-text">modifier, suspendre ou
            interrompre</strong> tout ou partie du service à tout moment, sans préavis.
          </p>
        </LegalSection>

        <LegalSection title="Suspension des comptes">
          <p>
            En cas d’abus, d’usage frauduleux ou de comportement contraire aux présentes
            conditions, les comptes concernés{' '}
            <strong className="text-text">peuvent être suspendus</strong> sans préavis.
          </p>
        </LegalSection>

        <LegalSection title="Droit applicable">
          <p>
            Les présentes conditions sont régies par la{' '}
            <strong className="text-text">loi française</strong>. Tout litige relatif à leur
            interprétation ou à leur exécution relève des juridictions françaises compétentes.
          </p>
        </LegalSection>
      </div>
    </AppShell>
  )
}
