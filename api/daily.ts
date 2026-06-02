/**
 * SSR des balises OG/SEO pour la Question du Jour (fonction serverless Vercel).
 *
 * Rewrites (voir vercel.json) :
 *   /jour            → /api/daily
 *   /jour/archive    → /api/daily?view=archive
 *   /jour/:day       → /api/daily?day=:day
 *
 * Comme api/share.ts : on récupère l'index.html buildé, on y injecte titre /
 * description / OG / JSON-LD rendus côté serveur, puis le client hydrate l'app.
 * Les métadonnées viennent des RPC publiques get_daily_question / un résumé
 * d'archive — données déjà publiques (QdJ publiées), aucune fuite.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface DailyMeta {
  id: string
  day: string
  question: string
  aggregate_consensus: number | null
  participant_count: number
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDayFr(day: string): string {
  if (!DAY_RE.test(day)) return day
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

async function fetchDaily(day: string): Promise<DailyMeta | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_daily_question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_day: day }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as DailyMeta | null
    return data && data.question ? data : null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const origin = appOrigin(req)
  const isArchive = String(req.query.view ?? '') === 'archive'
  const rawDay = String(req.query.day ?? '')
  const day = DAY_RE.test(rawDay) ? rawDay : todayUtc()

  let html = ''
  try {
    html = await fetch(`${origin}/index.html`).then((r) => r.text())
  } catch {
    res.status(500).send('Indisponible')
    return
  }

  let url: string
  let title: string
  let description: string
  let jsonLd: string | null = null
  let noscript: string | null = null

  if (isArchive) {
    url = `${origin}/jour/archive`
    title = 'Questions du Jour — Quorum'
    description =
      'Chaque jour, une question soumise à l’assemblée de 4 IA. Parcourez les délibérations passées et leur consensus mondial.'
  } else {
    url = `${origin}/jour/${day}`
    const meta = await fetchDaily(day)
    if (meta) {
      title = `${truncate(meta.question, 64)} — Question du Jour, Quorum`
      description = `Question du ${formatDayFr(meta.day)} : « ${truncate(meta.question, 120)} »${
        meta.aggregate_consensus !== null
          ? ` — ${meta.aggregate_consensus}% de consensus mondial`
          : ''
      }. Convoquez votre assemblée.`
      jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'QAPage',
        mainEntity: {
          '@type': 'Question',
          name: meta.question,
          dateCreated: `${meta.day}T00:00:00Z`,
          url,
        },
      })
      noscript = `<noscript><article><h1>${escapeHtml(meta.question)}</h1><p>${escapeHtml(
        description,
      )}</p></article></noscript>`
    } else {
      title = 'Question du Jour — Quorum'
      description =
        'La question du jour, la même pour tous : convoquez votre assemblée et comparez son verdict au consensus mondial.'
    }
  }

  const ogImage = `${origin}/api/og`

  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Quorum" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace('</head>', `    ${tags}\n  </head>`)

  if (noscript) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${noscript}`)
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  res.status(200).send(html)
}
