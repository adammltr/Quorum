import { type ReactNode } from 'react'
import { CouncilStage } from '@/components/council/CouncilStage'

/** Écran principal — Stage 1 : convocation de l'assemblée et streaming parallèle. */
export function Home(): ReactNode {
  return <CouncilStage />
}
