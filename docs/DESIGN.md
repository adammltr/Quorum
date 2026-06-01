# Quorum — Design System

> Référence non négociable. Tout écart doit être justifié et approuvé.

---

## 1. Identité & ton

**Marque** : Quorum

**Mots d'ambiance** : *Délibératif. Lumineux. Dense.*

**Ton de la marque** : éditorial, calme, premium, intelligent, légèrement magique.
Pas corporate-froid. Pas startup-générique. Pense *The Atlantic* croisé avec *Teenage Engineering* : de la substance, de la précision, une touche d'inattendu.

**Ce qu'on NE fait jamais** :
- Dégradé violet-sur-blanc avec un logo robot (AI slop #1).
- Boutons arrondis bleu-primaire Bootstrap/Material sans caractère.
- Polices `Inter`, `Roboto`, `Arial`, `system-ui` sans justification.
- Cartes génériques avec shadow-md et border-radius-lg copiées de shadcn par défaut.
- Animations qui bougent pour bouger (bounce, pulse non intentionnel).
- Text sombre sur fond sombre avec contraste insuffisant (WCAG fail).
- Layouts centrés à 800px sur desktop sans utiliser l'espace disponible.

---

## 2. Typographie

### Familles

| Rôle | Famille | Usage |
|---|---|---|
| Display | `Instrument Serif` | Titres H1, le verdict Chairman, les "grands moments" |
| UI / Corps | `Geist Sans` | Navigation, labels, corps de texte, boutons |
| Technique | `Geist Mono` | Noms de modèles, scores, timestamps, code |

Toutes chargées **localement** via `@font-face` dans `/public/fonts/` — zéro FOUT, zéro flash.
Utiliser uniquement les **variable fonts** (`.woff2` avec `font-display: swap` et `font-display: block` pour les fontes critiques above-the-fold).

### Échelle typographique (modular scale × 1.25 — Major Third)

```css
--text-xs:   0.64rem;   /* 10.24px  — metadata, timestamps */
--text-sm:   0.8rem;    /* 12.8px   — captions, badges */
--text-base: 1rem;      /* 16px     — corps de texte */
--text-lg:   1.25rem;   /* 20px     — sous-titres, lead */
--text-xl:   1.563rem;  /* 25px     — h3 */
--text-2xl:  1.953rem;  /* 31.25px  — h2 */
--text-3xl:  2.441rem;  /* 39.06px  — h1 page */
--text-4xl:  3.052rem;  /* 48.83px  — verdict Chairman, héros */
--text-5xl:  3.815rem;  /* 61.04px  — landing, très grand titre */
```

### Graisses

- `Instrument Serif` : 400 (regular), 400 italic — la sérialité éditoriale vient du roman/italic.
- `Geist Sans` : 400, 500, 600 — pas de 700+ sauf exception assumée.
- `Geist Mono` : 400, 500.

### Line-height & tracking

```css
--leading-tight:  1.2;   /* display, gros titres */
--leading-snug:   1.35;  /* sous-titres */
--leading-normal: 1.5;   /* corps de texte */
--leading-relaxed:1.65;  /* texte long, réponses des modèles */

--tracking-tight: -0.02em;  /* display */
--tracking-normal: 0;
--tracking-wide:  0.04em;   /* labels, badges en caps */
--tracking-wider: 0.08em;   /* small caps */
```

---

## 3. Couleurs (OKLCH)

### Principes

- Toutes les couleurs sont définies en **OKLCH** : perceptuellement uniforme, accessible.
- **Mode sombre par défaut** (`class="dark"` sur `<html>` ou `prefers-color-scheme: dark`).
- **Mode clair "papier"** : blanc cassé chaud, encre chaude — pas de blanc pur #ffffff.
- **Accent signature = ambre/or** : réservé au verdict final et aux moments de haute valeur. Il doit "briller" sur fond sombre parce qu'il est rare.

### Tokens CSS

```css
:root {
  /* ─── SOMBRE (défaut) ─────────────────────────────────── */

  /* Surfaces */
  --color-background:     oklch(12% 0.008 60);   /* encre/graphite chaud profond */
  --color-surface:        oklch(16% 0.010 60);   /* cartes, panneaux */
  --color-surface-raised: oklch(20% 0.012 60);   /* modales, dropdowns */
  --color-surface-glass:  oklch(18% 0.010 60 / 0.72); /* glassmorphism base */

  /* Bordures */
  --color-border:         oklch(30% 0.010 60);   /* séparateurs subtils */
  --color-border-bright:  oklch(55% 0.015 60);   /* bordure carte active, focus */

  /* Texte */
  --color-text:           oklch(93% 0.005 60);   /* texte principal — blanc cassé chaud */
  --color-text-muted:     oklch(58% 0.008 60);   /* labels, metadata */
  --color-text-subtle:    oklch(40% 0.006 60);   /* placeholders, désactivé */

  /* Accent signature — ambre/or */
  --color-accent:         oklch(82% 0.155 72);   /* ambre vif — verdict, moments de valeur */
  --color-accent-muted:   oklch(65% 0.100 72);   /* ambre plus calme — hover, bordure */
  --color-accent-dim:     oklch(45% 0.060 72 / 0.30); /* lueur ambre, fonds subtils */

  /* Sémantique du vote */
  --color-consensus:      oklch(68% 0.100 155);  /* vert calme — accord fort */
  --color-consensus-dim:  oklch(68% 0.100 155 / 0.20);
  --color-partial:        oklch(75% 0.110 72);   /* ambre — accord partiel */
  --color-partial-dim:    oklch(75% 0.110 72 / 0.20);
  --color-dissent:        oklch(60% 0.100 30);   /* rouille — désaccord */
  --color-dissent-dim:    oklch(60% 0.100 30 / 0.20);

  /* Système */
  --color-success:        var(--color-consensus);
  --color-warning:        var(--color-partial);
  --color-danger:         oklch(58% 0.140 22);   /* rouge rouille sombre */
  --color-info:           oklch(68% 0.100 220);  /* bleu acier */
}

.light {
  /* ─── CLAIR "papier" ────────────────────────────────────── */

  --color-background:     oklch(97% 0.006 72);   /* blanc cassé chaud — papier ivoire */
  --color-surface:        oklch(94% 0.008 72);   /* légèrement plus foncé */
  --color-surface-raised: oklch(91% 0.010 72);
  --color-surface-glass:  oklch(96% 0.008 72 / 0.82);

  --color-border:         oklch(82% 0.012 72);
  --color-border-bright:  oklch(55% 0.020 72);

  --color-text:           oklch(16% 0.012 60);   /* encre chaude — pas noir pur */
  --color-text-muted:     oklch(42% 0.010 60);
  --color-text-subtle:    oklch(60% 0.008 60);

  --color-accent:         oklch(62% 0.170 60);   /* ambre plus soutenu sur fond clair */
  --color-accent-muted:   oklch(55% 0.130 60);
  --color-accent-dim:     oklch(62% 0.100 60 / 0.15);

  --color-consensus:      oklch(42% 0.110 155);
  --color-consensus-dim:  oklch(42% 0.110 155 / 0.15);
  --color-partial:        oklch(52% 0.120 65);
  --color-partial-dim:    oklch(52% 0.120 65 / 0.15);
  --color-dissent:        oklch(48% 0.110 30);
  --color-dissent-dim:    oklch(48% 0.110 30 / 0.15);

  --color-danger:         oklch(46% 0.150 22);
  --color-info:           oklch(48% 0.110 220);
}
```

---

## 4. Glassmorphism — Recette CSS sûre cross-browser

Les 4 cartes de modèles et les panneaux flottants utilisent ce style de verre.

**INTERDICTION** : SVG `feColorMatrix` / `feDisplacementMap` pour la réfraction façon Apple — cassé hors Chromium, inutilisable en prod.

### Recette validée

```css
.glass-card {
  /* Fallback couleur opaque si backdrop-filter non supporté */
  background: var(--color-surface);

  /* Glassmorphism */
  background: var(--color-surface-glass);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
          backdrop-filter: blur(16px) saturate(1.4);

  /* Bordure lumineuse */
  border: 1px solid oklch(100% 0 0 / 0.10);
  /* Mode clair : */
  /* border: 1px solid oklch(0% 0 0 / 0.08); */

  /* Ombre douce */
  box-shadow:
    0 1px 0 0 oklch(100% 0 0 / 0.06) inset,  /* liseret supérieur */
    0 4px 24px -4px oklch(0% 0 0 / 0.30),
    0 1px 4px -1px oklch(0% 0 0 / 0.20);

  /* Rayon */
  border-radius: var(--radius-xl);
}

/* Désactive le backdrop-filter si motion réduit (peut causer des glitches GPU) */
@media (prefers-reduced-motion: reduce) {
  .glass-card {
    -webkit-backdrop-filter: none;
            backdrop-filter: none;
    background: var(--color-surface);
  }
}
```

### Détection support

```css
@supports not (backdrop-filter: blur(1px)) {
  .glass-card {
    background: var(--color-surface-raised);
  }
}
```

---

## 5. Rayons & espacement

### Espacement (base 4px)

```css
--space-1:  0.25rem;  /* 4px  */
--space-2:  0.5rem;   /* 8px  */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-5:  1.25rem;  /* 20px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Rayons

```css
--radius-sm:  0.375rem;  /* 6px  — badges, tags */
--radius-md:  0.625rem;  /* 10px — boutons, inputs */
--radius-lg:  0.875rem;  /* 14px — cartes compactes */
--radius-xl:  1.25rem;   /* 20px — cartes de modèles, panneaux */
--radius-2xl: 1.75rem;   /* 28px — modales, grandes surfaces */
--radius-full: 9999px;   /* pilules */
```

---

## 6. Motion & animation

### Philosophie

Un seul **load orchestré** à l'arrivée. Des transitions douces sur les états. Zéro micro-animation qui distrait.

### Paramètres Motion (spring physics)

```ts
// Ressort par défaut — naturel, pas de rebond excessif
export const spring = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
} as const

// Ressort léger pour éléments petits (badges, tooltips)
export const springLight = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 0.5,
} as const

// Transition douce (ease) pour couleurs, opacités
export const ease = {
  type: 'tween',
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
} as const

export const easeMedium = {
  type: 'tween',
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1],
} as const
```

### Stagger d'entrée — 4 colonnes

```ts
export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const cardVariant = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring,
  },
}
```

### Verdict Chairman — entrée distincte

```ts
export const verdictVariant = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...ease, duration: 0.5, delay: 0.2 },
  },
}
```

### prefers-reduced-motion

```ts
import { useReducedMotion } from 'motion/react'

function useMotionSafe<T extends object>(variants: T): T | Record<string, object> {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) {
    // Retourne des variants sans transform ni opacity animée
    return Object.fromEntries(
      Object.entries(variants).map(([k]) => [k, {}])
    )
  }
  return variants
}
```

### Layout animations

- Utiliser `layout` prop de Motion sur les éléments qui changent de position (votes, classement).
- `layoutId` pour les éléments partagés entre états (ex. : la carte d'un modèle qui passe de "en cours" à "terminé").

### Ce qu'on ne fait jamais

- Pas de `animation: pulse 1s infinite` sur des éléments non-chargement.
- Pas de `transition: all` (trop large, performances dégradées).
- Pas de durée > 600 ms sauf exception justifiée (splash screen, verdict final).
- Pas d'animation déclenchée par scroll sauf si elle apporte du sens (pas de "wow scroll" gratuit).

---

## 7. Layout & composition

### Grille principale

- Desktop : 4 colonnes égales pour les cartes de modèles, avec gap `--space-4`.
- Tablet (< 1024px) : 2 colonnes.
- Mobile (< 640px) : 1 colonne, scroll vertical.
- Max-width du contenu principal : `1440px` centré, padding horizontal `--space-6` à `--space-16`.

### Composition intentionnelle

- La zone question est **plein-largeur**, centrée, avec une typographie généreuse (≥ `text-xl`).
- Les 4 cartes forment une **assemblée** : légère asymétrie acceptable, pas de grille parfaitement rigide.
- Le verdict Chairman occupe **toute la largeur** sous les cartes, avec une mise en page éditoriale (Instrument Serif, accent ambre, hiérarchie visuelle claire).
- Score de consensus : grand nombre (`text-4xl` Geist Mono), coloré par la sémantique (vert / ambre / rouille).

---

## 8. Composants shadcn/ui — personnalisation

Tous les composants shadcn (style `new-york`) sont étendus avec les tokens du design system.
**Ne pas utiliser les valeurs par défaut shadcn sans les mapper** sur les variables OKLCH ci-dessus.

Fichier de mapping : `src/styles/tokens.css` (à créer lors du scaffold).
