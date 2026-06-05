/**
 * Chaînes françaises — version actuelle du produit (avant i18n).
 *
 * `typeof en` garantit à la compilation que fr.ts couvre EXACTEMENT les mêmes
 * clés que en.ts (aucune oubliée, aucune en trop).
 *
 * Noms propres conservés à l'identique dans les 2 langues : Quorum, Chairman,
 * Borda, et les noms de presets de councils (Les Sceptiques, Le Comité Créatif…).
 */
import type en from './en'

const fr: typeof en = {
  common: {
    retry: 'Réessayer',
    close: 'Fermer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    loading: 'Chargement…',
    updating: 'Mise à jour…',
  },

  lang: {
    en: 'EN',
    fr: 'FR',
    switch: 'Changer de langue',
  },

  nav: {
    newQuestion: 'Nouvelle question',
    questionOfDay: 'Question du Jour',
    history: 'Historique',
    collections: 'Collections',
    councils: 'Councils',
    myCouncils: 'Mes councils',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    upgradePro: 'Passer en PRO',
    account: 'Mon compte',
    accountMenu: 'Menu du compte',
    freePlan: 'Plan gratuit',
    pro: 'Pro',
    designSystem: 'design system',
    mainNav: 'Navigation principale',
    accountSpaces: 'Espaces du compte',
    lockedHint: 'Connecte-toi pour accéder à l’historique',
  },

  home: {
    tagline: 'Le consensus des intelligences',
    title: 'Convoquez l’assemblée.',
    subtitle: '4 IA répondent, s’évaluent en aveugle, puis tranchent.',
    orAnswerDaily: 'Ou répondez à la Question du Jour',
  },

  composer: {
    label: 'Votre question à l’assemblée',
    placeholder: 'Posez une question à l’assemblée…',
    convene: 'Convoquer',
    orExplore: 'Ou explorez :',
  },

  trust: {
    free: 'Gratuit',
    noSignup: 'Sans inscription',
    keysPrivate: 'Tes clés restent privées',
    openSource: 'Open source',
    legalNav: 'Liens légaux',
  },

  footer: {
    privacy: 'Confidentialité',
    terms: 'CGU',
  },

  council: {
    stepAnswers: 'Réponses',
    stepEvaluation: 'Évaluation',
    stepVerdict: 'Verdict',
    newQuestion: 'Nouvelle question',
    assemblyBadge: 'Assemblée :',
    removeCouncil: 'Retirer le council choisi',
    sharePublicNote: 'Une page publique propre — gratuite et illimitée, même sans compte.',
    status: {
      done: 'Délibération terminée',
      error: 'Délibération interrompue',
      answers: 'Réponses parallèles',
      crossEval: 'Évaluation croisée',
      chairmanSynthesis: 'Synthèse du Chairman',
    },
    errorRetry: 'Réessayer',
  },

  tier: {
    consensus: 'Accord fort',
    partial: 'Accord partiel',
    dissent: 'Point de divergence',
  },

  stage2: {
    eyebrow: '02 — Évaluation croisée',
    title: 'L’assemblée se juge en aveugle',
    votedCount: '{{n}}/{{total}} ont voté',
    aggregating: 'Agrégation des votes (Borda)…',
    modelFallback: 'Modèle {{slot}}',
    ballotSentence: '{{reviewer}} a classé {{ranking}}.',
    howScored: 'Comment ce score est calculé',
    bordaFinal:
      'Score final Borda : {{label}} {{score}}/{{max}} pts (1er = 3 pts, 2e = 2 pts, 3e = 1 pt).',
    explainer:
      'Plus une réponse rallie de voix, plus l’accord est fort. La dernière marque le <0>point de divergence</0> — non une faute, mais l’endroit précis où les intelligences cessent de s’accorder.',
  },

  stage3: {
    eyebrow: '03 — Verdict du Chairman',
    title: 'La synthèse de l’assemblée',
    consensusScore: 'Score de consensus',
    deliberating: 'Le Chairman délibère',
    disagreements: 'Désaccords assumés — là où l’assemblée diverge',
    tierBroad: 'Accord large',
    tierNuanced: 'Accord nuancé',
    tierStrongDivergence: 'Forte divergence',
    disclaimer:
      '⚠ Le consensus Quorum ne valide pas des faits — il synthétise des perspectives. Jamais de décision médicale, légale ou financière basée sur ce verdict.',
  },

  modelCard: {
    streaming: 'en cours',
    timeout: 'délai dépassé',
    unavailable: 'indisponible',
    failedBody: 'Ce modèle n’a pas pu répondre. L’assemblée poursuit avec les autres.',
    slowHint: 'Les modèles gratuits prennent parfois leur temps — la qualité vaut le détour.',
  },

  auth: {
    title: 'Garder cette assemblée',
    reasonDefault: 'Crée ton compte pour retrouver tes délibérations, partout.',
    continueGoogle: 'Continuer avec Google',
    or: 'ou',
    emailLabel: 'Adresse email',
    emailPlaceholder: 'toi@exemple.com',
    getCode: 'Recevoir le code',
    sending: 'Envoi…',
    noPassword: 'Pas de mot de passe. On t’envoie un code à 6 chiffres.',
    demoUnavailable:
      'Authentification indisponible : backend Supabase non configuré (mode démo).',
    otpTitle: 'Entre le code reçu par email',
    codeSentTo: 'Code envoyé à',
    validate: 'Valider',
    verifying: 'Vérification…',
    changeEmail: 'Changer d’email',
    resendCode: 'Renvoyer le code',
    resendQ: 'Renvoyer ?',
    codeInvalid: 'Code incorrect ou expiré.',
    sendFailed: 'Envoi impossible. Réessaie.',
    resendFailed: 'Renvoi impossible. Réessaie.',
    otpGroupLabel: 'Code à {{n}} chiffres',
    digitLabel: 'Chiffre {{n}}',
  },

  sidebar: {
    newQuestion: 'Nouvelle question',
    pinned: 'Épinglés',
    recent: 'Récent',
    noDeliberations: 'Aucune délibération pour l’instant.',
    unpin: 'Désépingler',
    pin: 'Épingler',
    shareCopy: 'Partager (copier)',
    delete: 'Supprimer',
    actions: 'Actions',
    historyWaiting: 'Ton historique et tes collections t’attendent',
    createAccountCta: 'Crée un compte gratuit pour retrouver toutes tes délibérations.',
    signInToSee: 'Connecte-toi pour voir ton historique.',
  },

  councils: {
    subtitle:
      'Compose ton assemblée idéale, donne-lui un nom, réutilise-la. Pars d’un preset ou de zéro.',
    compose: 'Composer',
    mine: 'Mes councils',
    readyMade: 'Assemblées prêtes à l’emploi',
    premium: 'Assemblées premium',
    premiumNote: 'Modèles premium — disponibles avec Quorum PRO',
    preset: 'Preset',
    convene: 'Convoquer',
    duplicate: 'Dupliquer',
    edit: 'Modifier',
    deleteCouncil: 'Supprimer le council',
    unlockPro: 'Débloquer en PRO',
    emptyMine: 'Aucun council perso. Duplique un preset ci-dessous ou compose le tien.',
    atLimit: 'Tu as atteint ta limite de {{count}} council perso.',
    atLimit_other: 'Tu as atteint ta limite de {{count}} councils perso.',
    upgradeForMore: 'Passe en PRO',
    upgradeForMoreSuffix: ' pour en composer jusqu’à 10.',
    signInToCompose: 'Connecte-toi pour composer et sauvegarder tes assemblées',
  },

  account: {
    historyTitle: 'Historique',
    historyDescPro: 'Toutes tes délibérations, conservées sans limite et recherchables.',
    historyDescFree:
      'Tes délibérations des 7 derniers jours. Passe en PRO pour les garder sans limite.',
    searchPlaceholder: 'Rechercher dans tes questions…',
    searchAria: 'Rechercher dans l’historique',
    anonRetentionNote:
      'Cet historique vit sur cet appareil et s’efface après 7 jours. Crée un compte pour le garder partout.',
    historyEmptyTitle: 'Aucune délibération pour l’instant',
    historyNoResults: 'Aucun résultat',
    historyEmptyHint: 'Convoque une assemblée pour commencer.',
    historyNoResultsHint: 'Essaie d’autres mots-clés.',
    askQuestion: 'Poser une question',
    collectionsTitle: 'Collections',
    collectionsSubtitle:
      'Range tes délibérations dans des dossiers nommés. Privées par défaut, partageables.',
    newCollection: 'Nouvelle collection',
    collectionsAtLimit: 'Plan gratuit : 2 collections maximum.',
    collectionsUpgrade: 'Passe en PRO',
    collectionsUpgradeSuffix: ' pour un nombre illimité.',
    collectionsEmptyTitle: 'Aucune collection',
    collectionsEmptyHint: 'Crée ta première collection pour organiser tes verdicts.',
    collectionDetailFallback: 'Collection',
    allCollections: 'Toutes les collections',
    collectionEmptyTitle: 'Collection vide',
    collectionEmptyHint: 'Épingle une délibération depuis ton historique pour la ranger ici.',
    public: 'Publique',
    private: 'Privée',
    newCollectionTitle: 'Nouvelle collection',
    collectionNamePlaceholder: 'Nom (ex. « Décisions produit »)',
    collectionDescPlaceholder: 'Description (optionnelle)',
    createCollection: 'Créer la collection',
    createFailed: 'Création impossible.',
    deleteCollection: 'Supprimer la collection',
    itemCount_one: '{{count}} délibération',
    itemCount_other: '{{count}} délibérations',
  },

  historyCard: {
    openAria: 'Ouvrir la délibération : {{question}}',
    consensusAria: 'Consensus {{score}} sur 100',
    expiresSoon: 'expire bientôt',
    expiresIn: 'expire dans {{n}} j',
    expiresTooltip: 'Historique gratuit : 7 jours. Passe en PRO pour le conserver.',
    pin: 'Épingler',
    deleteAria: 'Supprimer cette délibération',
  },

  accountPopover: {
    settings: 'Paramètres',
    github: 'GitHub',
    proShort: 'Pro',
    freeShort: 'Gratuit',
  },

  quota: {
    title: 'Quota quotidien atteint',
    body: 'Tu as utilisé tes questions gratuites du jour. Le compteur repart à zéro à minuit.',
    resetIn: 'Remise à zéro dans',
    resetAria: 'Temps avant remise à zéro',
    remaining_one: '{{remaining}}/{{limit}} question restante aujourd’hui',
    remaining_other: '{{remaining}}/{{limit}} questions restantes aujourd’hui',
    goByok: 'Passer en BYOK',
    comeBackTomorrow: 'Revenir demain',
    counter_one: '{{remaining}} question restante aujourd’hui',
    counter_other: '{{remaining}} questions restantes aujourd’hui',
  },

  pro: {
    upgradeTitle: 'Passe à Quorum PRO',
    upgradeCta: 'Passer en PRO',
    alreadyHaveKey: 'Déjà une clé OpenRouter ?',
    brand: 'Quorum Pro',
    oneMoment: 'Un instant…',
    upgradeYearly: 'Passer en PRO — {{label}}',
    monthlyOption: 'ou {{label}}, sans engagement',
    byokNote:
      'Le mode BYOK débloque les modèles premium sans abonnement (tu paies tes propres appels).',
    freeAlwaysNote: 'Le partage et les modèles gratuits restent illimités, toujours.',
    copy: {
      quotaTitle: 'Tu as adoré ce verdict ?',
      quotaSub:
        'Tu as atteint tes questions du jour. Passe en PRO pour des modèles premium et des délibérations sans limite.',
      premiumTitle: 'Convoque les grands modèles',
      premiumSub:
        'GPT-5.1, Claude, Gemini 3… Des délégués plus fins pour des verdicts encore plus tranchés.',
      historyTitle: 'Garde toutes tes délibérations',
      historySub:
        'En gratuit, l’historique s’efface après 7 jours. PRO les conserve à vie, avec recherche.',
      exportTitle: 'Exporte en haute définition',
      exportSub:
        'Image HD, Markdown, PDF, lien permanent — pour partager et archiver tes verdicts.',
      councilsTitle: 'Compose plus d’assemblées',
      councilsSub: 'PRO débloque jusqu’à 10 councils sauvegardés et les modèles premium.',
      genericTitle: 'Passe à Quorum PRO',
      genericSub:
        'Modèles premium, historique illimité et export — sans casser ce que tu aimes du gratuit.',
    },
  },

  daily: {
    questionOf: 'Question du {{date}}',
    sameForEveryone: 'La même question pour tous, aujourd’hui.',
    intro:
      'La même question pour tous, aujourd’hui. Convoquez votre assemblée et comparez son verdict au consensus mondial.',
    convene: 'Convoquer l’assemblée',
    todaysVerdict: 'Verdict du jour',
    yourAssembly: 'Votre assemblée',
    globalConsensus: 'Consensus mondial du jour',
    streak_one: '{{count}} jour consécutif',
    streak_other: '{{count}} jours consécutifs',
    firstDay: 'Premier jour — ravi de vous voir.',
    remindDaily: 'Me le rappeler chaque jour',
    pastQuestions: 'Questions passées',
    archiveLink: 'archive',
    missingTitle: 'Pas de question ce jour-là',
    missingBody: 'La Question du Jour n’a pas encore été publiée pour cette date.',
    todayQuestion: 'Question d’aujourd’hui',
    seeArchive: 'Voir l’archive',
    participations: '{{n}} participations',
    worldConsensus: '{{n}}% de consensus mondial',
    restart: 'Recommencer',
    alreadyAnswered: 'Vous avez déjà répondu aujourd’hui — vous pouvez recommencer.',
    archiveDay: 'Question d’archive · {{date}}',
    errorFallback: 'Question du jour indisponible.',
  },

  notFound: {
    eyebrow: 'Erreur 404',
    title: 'L’assemblée ne siège pas ici.',
    body: 'Cette page n’existe pas — ou la délibération s’est déjà dissoute.',
    back: 'Revenir à l’assemblée',
  },

  errorBoundary: {
    chunkEyebrow: 'Mise à jour disponible',
    crashEyebrow: 'Imprévu',
    chunkTitle: 'Une nouvelle version est en ligne.',
    crashTitle: 'L’assemblée a été interrompue.',
    chunkBody: 'Rechargez la page pour reprendre — vos données ne sont pas perdues.',
    crashBody: 'Une erreur inattendue est survenue. Rechargez pour repartir d’une base saine.',
    reload: 'Recharger la page',
  },

  share: {
    shareVerdict: 'Partager le verdict',
    share: 'Partager',
    title: 'Partager cette délibération',
    subtitle: 'Une page publique propre, gratuite et illimitée.',
    percentConsensus: '% de consensus',
    errorMessage: 'Impossible de créer le lien. Réessayer ?',
    shareText: 'Texte de partage',
    copied: 'Copié',
    copy: 'Copier',
    shareOnX: 'Partager sur X',
    textCopied: 'Texte copié',
    copyText: 'Copier le texte',
    more: 'Plus…',
    preparing: 'Préparation du lien public…',
  },

  councilComposer: {
    editTitle: 'Modifier le council',
    createTitle: 'Composer un council',
    subtitle: 'Quatre délégués délibèrent, un Chairman tranche.',
    nameLabel: 'Nom',
    namePlaceholder: 'ex. « Les Stratèges »',
    intentionLabel: 'Intention',
    optional: '(optionnelle)',
    intentionPlaceholder: 'Quel tempérament pour cette assemblée ?',
    delegates: 'Délégués',
    delegateModelLabel: 'Modèle du délégué {{slot}}',
    chairmanHint: '— la synthèse finale',
    chairmanModelLabel: 'Modèle Chairman',
    premiumNote:
      'Les modèles premium sont réservés au plan PRO. En gratuit, compose avec les modèles ouverts —',
    discoverPro: 'découvrir PRO',
    signInRequired: 'Connexion requise',
    save: 'Enregistrer',
    create: 'Créer le council',
    saveFailed: 'Enregistrement impossible.',
    copySuffix: ' (copie)',
  },
}

export default fr
