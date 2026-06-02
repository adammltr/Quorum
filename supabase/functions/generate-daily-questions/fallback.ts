/**
 * Banque de secours — 30 Questions du Jour rédigées à la main.
 *
 * Garantit qu'il n'y a JAMAIS de jour sans QdJ : si OpenRouter échoue (panne,
 * quota, JSON invalide), on pioche ici. Chaque question est choisie pour son
 * fort potentiel de DIVERGENCE entre LLMs : dilemmes éthiques, arbitrages de
 * valeurs, questions ouvertes sans consensus établi.
 *
 * Contraintes (mêmes que la génération) : énoncé FR, ≥ 50 et ≤ 200 caractères.
 */

export interface GeneratedQuestion {
  question: string
  theme: string
  expected_divergence: 'high' | 'medium'
}

export const FALLBACK_QUESTIONS: readonly GeneratedQuestion[] = [
  { question: 'Faut-il dire une vérité qui blesse profondément, ou un mensonge qui apaise et protège ?', theme: 'Éthique', expected_divergence: 'high' },
  { question: 'Pour diriger une nation, vaut-il mieux être craint ou être aimé de son peuple ?', theme: 'Pouvoir', expected_divergence: 'high' },
  { question: 'La fin justifie-t-elle les moyens lorsque l’enjeu est la survie de millions de personnes ?', theme: 'Morale', expected_divergence: 'high' },
  { question: 'Vaut-il mieux organiser sa vie entière autour du bonheur ou autour de la quête de sens ?', theme: 'Existence', expected_divergence: 'high' },
  { question: 'Quand croissance économique et écologie s’opposent frontalement, laquelle faut-il privilégier ?', theme: 'Société', expected_divergence: 'high' },
  { question: 'Une intelligence artificielle devrait-elle pouvoir prendre seule une décision médicale vitale ?', theme: 'Technologie', expected_divergence: 'high' },
  { question: 'La liberté d’expression doit-elle protéger aussi les discours que la majorité juge haineux ?', theme: 'Société', expected_divergence: 'high' },
  { question: 'Est-il juste de sacrifier la vie privée de tous pour accroître la sécurité collective ?', theme: 'Société', expected_divergence: 'high' },
  { question: 'La peine de mort est-elle parfois moralement justifiable, ou jamais acceptable en aucun cas ?', theme: 'Justice', expected_divergence: 'high' },
  { question: 'Devrions-nous coloniser d’autres planètes, ou d’abord réparer la nôtre avant de partir ailleurs ?', theme: 'Futur', expected_divergence: 'high' },
  { question: 'Le libre arbitre existe-t-il vraiment, ou nos choix sont-ils entièrement déterminés à l’avance ?', theme: 'Philosophie', expected_divergence: 'high' },
  { question: 'La conscience peut-elle être simulée par une machine, ou est-elle fondamentalement biologique ?', theme: 'Esprit', expected_divergence: 'high' },
  { question: 'Faut-il toujours obéir à une loi que l’on juge profondément injuste, ou la désobéir est-il un devoir ?', theme: 'Justice', expected_divergence: 'high' },
  { question: 'L’art a-t-il une valeur en soi, ou seulement celle que la société et le marché lui accordent ?', theme: 'Culture', expected_divergence: 'medium' },
  { question: 'Vaut-il mieux un revenu universel pour tous ou des aides ciblées réservées aux plus démunis ?', theme: 'Économie', expected_divergence: 'high' },
  { question: 'Sommes-nous moralement responsables des générations futures que nous ne connaîtrons jamais ?', theme: 'Éthique', expected_divergence: 'medium' },
  { question: 'L’immortalité serait-elle un cadeau merveilleux ou une malédiction insupportable pour l’humain ?', theme: 'Existence', expected_divergence: 'high' },
  { question: 'Devrait-on modifier génétiquement les humains pour éliminer les maladies héréditaires graves ?', theme: 'Technologie', expected_divergence: 'high' },
  { question: 'La nature humaine est-elle fondamentalement bonne, ou égoïste et tournée vers son seul intérêt ?', theme: 'Philosophie', expected_divergence: 'high' },
  { question: 'Le progrès technologique rend-il l’humanité globalement plus libre, ou de plus en plus dépendante ?', theme: 'Technologie', expected_divergence: 'medium' },
  { question: 'Faut-il pardonner une faute grave au nom de la paix, ou exiger justice au risque du conflit ?', theme: 'Morale', expected_divergence: 'high' },
  { question: 'L’éducation doit-elle d’abord former des citoyens, ou préparer efficacement au monde du travail ?', theme: 'Société', expected_divergence: 'medium' },
  { question: 'Est-il préférable de vivre une courte vie intense, ou une longue vie paisible et sans éclat ?', theme: 'Existence', expected_divergence: 'high' },
  { question: 'La démocratie est-elle toujours le meilleur régime, même quand la majorité se trompe gravement ?', theme: 'Pouvoir', expected_divergence: 'high' },
  { question: 'Doit-on laisser une IA décider qui sauver lors d’un accident inévitable de voiture autonome ?', theme: 'Technologie', expected_divergence: 'high' },
  { question: 'Le bonheur des uns peut-il légitimement se construire sur le sacrifice volontaire des autres ?', theme: 'Morale', expected_divergence: 'high' },
  { question: 'Vaut-il mieux préserver une tradition rassurante, ou tout réinventer au nom du progrès et du futur ?', theme: 'Culture', expected_divergence: 'medium' },
  { question: 'La richesse extrême de quelques-uns est-elle acceptable tant que la pauvreté absolue persiste ?', theme: 'Économie', expected_divergence: 'high' },
  { question: 'Faut-il tout dire à un proche en fin de vie, ou parfois lui épargner une vérité trop lourde ?', theme: 'Éthique', expected_divergence: 'high' },
  { question: 'Le hasard gouverne-t-il nos existences, ou chacun forge-t-il réellement son propre destin ?', theme: 'Philosophie', expected_divergence: 'medium' },
] as const
