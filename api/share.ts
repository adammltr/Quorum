/**
 * SSR des balises OG/SEO pour la page publique /q/{slug} (fonction serverless Vercel).
 *
 * Rewrite : /q/:slug → /api/share?slug=:slug (voir vercel.json).
 *
 * Stratégie : on récupère le HTML statique buildé (index.html), on y injecte des
 * balises <title>/<meta>/OG/Twitter + JSON-LD dynamiques (rendues CÔTÉ SERVEUR
 * pour l'aperçu social et le SEO), puis on sert ce HTML. Le client hydrate
 * ensuite l'app et React Router affiche la page publique aux humains.
 *
 * Les métadonnées proviennent de la RPC `get_share_meta` (lecture sans incrément
 * de vue, pour ne pas gonfler view_count avec les hits de crawlers).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ShareMeta {
  slug: string
  question: string
  status: string
  created_at: string
  consensus_score: number | null
  borda_scores: Record<string, number>
  models: { slot: string; model_id: string; status: string }[]
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

function appOrigin(req: VercelRequest): string {
  const configured = process.env.VITE_APP_URL
  if (configured && configured.length > 0) return configured.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  return `${proto}://${host}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}

async function fetchMeta(slug: string): Promise<ShareMeta | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_share_meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_slug: slug }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ShareMeta | null
    return data && data.question ? data : null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const slug = String(req.query.slug ?? '')
  const origin = appOrigin(req)

  // Récupère le HTML buildé pour le réutiliser comme coquille à hydrater.
  let html = ''
  try {
    html = await fetch(`${origin}/index.html`).then((r) => r.text())
  } catch {
    res.status(500).send('Indisponible')
    return
  }

  const meta = slug ? await fetchMeta(slug) : null

  const url = `${origin}/q/${slug}`
  const title = meta
    ? `${truncate(meta.question, 70)} — Quorum`
    : 'Quorum — Le consensus des intelligences'
  const description = meta
    ? `Regardez comment ${meta.models.length || 4} IA ont délibéré${
        meta.consensus_score !== null ? ` (${meta.consensus_score}% de consensus)` : ''
      } sur : « ${truncate(meta.question, 120)} »`
    : 'Posez une question, regardez 4 intelligences délibérer, puis trancher.'
  // L'image OG est toujours rendue dynamiquement (carte par défaut si pas de meta).
  const ogImage = `${origin}/api/og?slug=${encodeURIComponent(slug)}`

  const jsonLd = meta
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'QAPage',
        mainEntity: {
          '@type': 'Question',
          name: meta.question,
          answerCount: meta.models.length,
          dateCreated: meta.created_at,
          url,
        },
      })
    : null

  const tags = [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Quorum" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  // Remplace le titre et la description statiques, puis injecte les balises OG.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace('</head>', `    ${tags}\n  </head>`)

  // Résumé minimal pour les crawlers sans JS (progressive enhancement SEO).
  if (meta) {
    const noscript = `<noscript><article><h1>${escapeHtml(meta.question)}</h1><p>${escapeHtml(
      description,
    )}</p></article></noscript>`
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${noscript}`)
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Cache CDN : partages immuables une fois rendus ; revalidation douce.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  res.status(200).send(html)
}
