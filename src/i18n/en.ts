/**
 * English strings — default language (fallback).
 *
 * Proper nouns kept identical across languages: Quorum, Chairman, Borda, and the
 * French council preset names (Les Sceptiques, Le Comité Créatif, Le Tribunal…).
 * Interpolation uses i18next `{{var}}` syntax; pluralization uses `_one`/`_other`.
 */
const en = {
  common: {
    retry: 'Retry',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    loading: 'Loading…',
    updating: 'Updating…',
  },

  lang: {
    en: 'EN',
    fr: 'FR',
    switch: 'Change language',
  },

  nav: {
    newQuestion: 'New question',
    questionOfDay: 'Question of the Day',
    history: 'History',
    collections: 'Collections',
    councils: 'Councils',
    myCouncils: 'My councils',
    signIn: 'Sign in',
    signOut: 'Sign out',
    upgradePro: 'Upgrade to PRO',
    account: 'My account',
    accountMenu: 'Account menu',
    freePlan: 'Free plan',
    pro: 'Pro',
    designSystem: 'design system',
    mainNav: 'Main navigation',
    accountSpaces: 'Account spaces',
    lockedHint: 'Sign in to access your history',
  },

  home: {
    tagline: 'The consensus of intelligences',
    title: 'Convene the assembly.',
    subtitle: '4 AIs answer, evaluate each other blindly, then decide.',
    orAnswerDaily: 'Or answer today’s Question of the Day',
  },

  composer: {
    label: 'Your question to the assembly',
    placeholder: 'Ask the assembly a question…',
    convene: 'Convene',
    orExplore: 'Or explore:',
  },

  trust: {
    free: 'Free',
    noSignup: 'No signup',
    keysPrivate: 'Your keys stay private',
    openSource: 'Open source',
    legalNav: 'Legal links',
  },

  footer: {
    privacy: 'Privacy',
    terms: 'Terms',
  },

  council: {
    stepAnswers: 'Answers',
    stepEvaluation: 'Evaluation',
    stepVerdict: 'Verdict',
    newQuestion: 'New question',
    assemblyBadge: 'Assembly:',
    removeCouncil: 'Remove selected council',
    sharePublicNote: 'A clean public page — free and unlimited, even without an account.',
    status: {
      done: 'Deliberation complete',
      error: 'Deliberation interrupted',
      answers: 'Parallel answers',
      crossEval: 'Cross-evaluation',
      chairmanSynthesis: 'Chairman synthesis',
    },
    errorRetry: 'Retry',
  },

  tier: {
    consensus: 'Strong agreement',
    partial: 'Partial agreement',
    dissent: 'Point of divergence',
  },

  stage2: {
    eyebrow: '02 — Cross-evaluation',
    title: 'The assembly judges blindly',
    votedCount: '{{n}}/{{total}} voted',
    aggregating: 'Aggregating votes (Borda)…',
    modelFallback: 'Model {{slot}}',
    ballotSentence: '{{reviewer}} ranked {{ranking}}.',
    howScored: 'How this score is computed',
    bordaFinal:
      'Final Borda score: {{label}} {{score}}/{{max}} pts (1st = 3 pts, 2nd = 2 pts, 3rd = 1 pt).',
    explainer:
      'The more votes an answer gathers, the stronger the agreement. The last one marks the <0>point of divergence</0> — not a fault, but the precise spot where the intelligences stop agreeing.',
  },

  stage3: {
    eyebrow: '03 — Chairman’s verdict',
    title: 'The assembly’s synthesis',
    consensusScore: 'Consensus score',
    deliberating: 'The Chairman deliberates',
    disagreements: 'Owned disagreements — where the assembly diverges',
    tierBroad: 'Broad agreement',
    tierNuanced: 'Nuanced agreement',
    tierStrongDivergence: 'Strong divergence',
    disclaimer:
      '⚠ The Quorum consensus does not validate facts — it synthesizes perspectives. Never base a medical, legal, or financial decision on this verdict.',
  },

  modelCard: {
    unavailable: 'Model unavailable',
  },

  auth: {
    title: 'Save this assembly',
    reasonDefault: 'Create your account to find your deliberations, everywhere.',
    continueGoogle: 'Continue with Google',
    or: 'or',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    getCode: 'Get the code',
    sending: 'Sending…',
    noPassword: 'No password. We’ll send you a 6-digit code.',
    demoUnavailable: 'Authentication unavailable: Supabase backend not configured (demo mode).',
    otpTitle: 'Enter the code from your email',
    codeSentTo: 'Code sent to',
    validate: 'Validate',
    verifying: 'Verifying…',
    changeEmail: 'Change email',
    resendCode: 'Resend code',
    resendQ: 'Resend?',
    codeInvalid: 'Incorrect or expired code.',
    sendFailed: 'Couldn’t send. Try again.',
    resendFailed: 'Couldn’t resend. Try again.',
    otpGroupLabel: '{{n}}-digit code',
    digitLabel: 'Digit {{n}}',
  },

  sidebar: {
    newQuestion: 'New question',
    pinned: 'Pinned',
    recent: 'Recent',
    noDeliberations: 'No deliberations yet.',
    unpin: 'Unpin',
    pin: 'Pin',
    shareCopy: 'Share (copy)',
    delete: 'Delete',
    actions: 'Actions',
    historyWaiting: 'Your history and collections are waiting',
    createAccountCta: 'Create a free account to find all your deliberations.',
    signInToSee: 'Sign in to see your history.',
  },

  councils: {
    subtitle:
      'Compose your ideal assembly, name it, reuse it. Start from a preset or from scratch.',
    compose: 'Compose',
    mine: 'My councils',
    readyMade: 'Ready-to-use assemblies',
    premium: 'Premium assemblies',
    premiumNote: 'Premium models — available with Quorum PRO',
    preset: 'Preset',
    convene: 'Convene',
    duplicate: 'Duplicate',
    edit: 'Edit',
    deleteCouncil: 'Delete council',
    unlockPro: 'Unlock with PRO',
    emptyMine: 'No personal council. Duplicate a preset below or compose your own.',
    atLimit: 'You’ve reached your limit of {{count}} personal council.',
    atLimit_other: 'You’ve reached your limit of {{count}} personal councils.',
    upgradeForMore: 'Upgrade to PRO',
    upgradeForMoreSuffix: ' to compose up to 10.',
    signInToCompose: 'Sign in to compose and save your assemblies',
  },

  account: {
    historyTitle: 'History',
    historyDescPro: 'All your deliberations, kept without limit and searchable.',
    historyDescFree:
      'Your deliberations from the last 7 days. Upgrade to PRO to keep them without limit.',
    searchPlaceholder: 'Search your questions…',
    searchAria: 'Search history',
    anonRetentionNote:
      'This history lives on this device and is erased after 7 days. Create an account to keep it everywhere.',
    historyEmptyTitle: 'No deliberations yet',
    historyNoResults: 'No results',
    historyEmptyHint: 'Convene an assembly to get started.',
    historyNoResultsHint: 'Try other keywords.',
    askQuestion: 'Ask a question',
    collectionsTitle: 'Collections',
    collectionsSubtitle:
      'Organize your deliberations into named folders. Private by default, shareable.',
    newCollection: 'New collection',
    collectionsAtLimit: 'Free plan: 2 collections maximum.',
    collectionsUpgrade: 'Upgrade to PRO',
    collectionsUpgradeSuffix: ' for unlimited.',
    collectionsEmptyTitle: 'No collection',
    collectionsEmptyHint: 'Create your first collection to organize your verdicts.',
    collectionDetailFallback: 'Collection',
    allCollections: 'All collections',
    collectionEmptyTitle: 'Empty collection',
    collectionEmptyHint: 'Pin a deliberation from your history to file it here.',
    public: 'Public',
    private: 'Private',
    newCollectionTitle: 'New collection',
    collectionNamePlaceholder: 'Name (e.g. “Product decisions”)',
    collectionDescPlaceholder: 'Description (optional)',
    createCollection: 'Create collection',
    createFailed: 'Couldn’t create.',
    deleteCollection: 'Delete collection',
    itemCount_one: '{{count}} deliberation',
    itemCount_other: '{{count}} deliberations',
  },

  historyCard: {
    openAria: 'Open the deliberation: {{question}}',
    consensusAria: 'Consensus {{score}} out of 100',
    expiresSoon: 'expires soon',
    expiresIn: 'expires in {{n}}d',
    expiresTooltip: 'Free history: 7 days. Upgrade to PRO to keep it.',
    pin: 'Pin',
    deleteAria: 'Delete this deliberation',
  },

  accountPopover: {
    settings: 'Settings',
    github: 'GitHub',
    proShort: 'Pro',
    freeShort: 'Free',
  },

  quota: {
    title: 'Daily quota reached',
    body: 'You’ve used your free questions for today. The counter resets at midnight.',
    resetIn: 'Resets in',
    resetAria: 'Time until reset',
    remaining_one: '{{remaining}}/{{limit}} question left today',
    remaining_other: '{{remaining}}/{{limit}} questions left today',
    goByok: 'Use BYOK',
    comeBackTomorrow: 'Come back tomorrow',
    counter_one: '{{remaining}} question left today',
    counter_other: '{{remaining}} questions left today',
  },

  pro: {
    upgradeTitle: 'Upgrade to Quorum PRO',
    upgradeCta: 'Upgrade to PRO',
    alreadyHaveKey: 'Already have an OpenRouter key?',
    brand: 'Quorum Pro',
    oneMoment: 'One moment…',
    upgradeYearly: 'Upgrade to PRO — {{label}}',
    monthlyOption: 'or {{label}}, no commitment',
    byokNote:
      'BYOK mode unlocks premium models without a subscription (you pay for your own calls).',
    freeAlwaysNote: 'Sharing and free models stay unlimited, always.',
    copy: {
      quotaTitle: 'Loved that verdict?',
      quotaSub:
        'You’ve reached your questions for today. Upgrade to PRO for premium models and unlimited deliberations.',
      premiumTitle: 'Convene the great models',
      premiumSub:
        'GPT-5.1, Claude, Gemini 3… Sharper delegates for even more decisive verdicts.',
      historyTitle: 'Keep all your deliberations',
      historySub:
        'On the free plan, history is erased after 7 days. PRO keeps them for life, with search.',
      exportTitle: 'Export in high definition',
      exportSub: 'HD image, Markdown, PDF, permalink — to share and archive your verdicts.',
      councilsTitle: 'Compose more assemblies',
      councilsSub: 'PRO unlocks up to 10 saved councils and premium models.',
      genericTitle: 'Upgrade to Quorum PRO',
      genericSub:
        'Premium models, unlimited history, and export — without breaking what you love about the free plan.',
    },
  },

  daily: {
    questionOf: 'Question of {{date}}',
    sameForEveryone: 'The same question for everyone, today.',
    intro:
      'The same question for everyone, today. Convene your assembly and compare its verdict to the global consensus.',
    convene: 'Convene the assembly',
    todaysVerdict: 'Today’s verdict',
    yourAssembly: 'Your assembly',
    globalConsensus: 'Today’s global consensus',
    streak_one: '{{count}} consecutive day',
    streak_other: '{{count}} consecutive days',
    firstDay: 'First day — glad to have you.',
    remindDaily: 'Remind me every day',
    pastQuestions: 'Past questions',
    archiveLink: 'archive',
    missingTitle: 'No question that day',
    missingBody: 'The Question of the Day hasn’t been published for this date yet.',
    todayQuestion: 'Today’s question',
    seeArchive: 'See the archive',
    participations: '{{n}} participations',
    worldConsensus: '{{n}}% global consensus',
    restart: 'Restart',
    alreadyAnswered: 'You’ve already answered today — you can start over.',
    archiveDay: 'Archive question · {{date}}',
    errorFallback: 'Question of the day unavailable.',
  },
}

export default en
