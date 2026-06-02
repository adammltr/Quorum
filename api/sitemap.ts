/**
 * Sitemap dynamique (fonction serverless Vercel) — SEO de la boucle de partage.
 *
 * Rewrite : /sitemap.xml → /api/sitemap (voir vercel.json).
 *
 * Liste l'accueil + chaque page publique de partage active. Les partages actifs
 * sont lisibles publiquement (RLS `shares_select_public_or_own`), donc une
 * lecture REST avec la clé anon suffit — aucune donnée privée n'est exposée.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

function appOrigin(req: VercelRequest): string {
  const configured = process.env.VITE_APP_URL
  if (configured && configured.length > 0) return configured.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  return `${proto}://${host}`
}

async function fetchActiveShares(): Promise<{ slug: string; created_at: string }[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/shares?select=slug,created_at&is_active=eq.true&order=created_at.desc&limit=5000`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      },
    )
    if (!res.ok) return []
    return (await res.json()) as { slug: string; created_at: string }[]
  } catch {
    return []
  }
}

async function fetchDailyDays(): Promise<{ day: string; updated_at: string }[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_question?select=day,updated_at&published=eq.true&order=day.desc&limit=1000`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      },
    )
    if (!res.ok) return []
    return (await res.json()) as { day: string; updated_at: string }[]
  } catch {
    return []
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const origin = appOrigin(req)
  const [shares, days] = await Promise.all([fetchActiveShares(), fetchDailyDays()])

  const urls = [
    `  <url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${origin}/jour</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${origin}/jour/archive</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ...days.map(
      (d) =>
        `  <url><loc>${origin}/jour/${d.day}</loc><lastmod>${new Date(
          d.updated_at,
        ).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    ),
    ...shares.map(
      (s) =>
        `  <url><loc>${origin}/q/${s.slug}</loc><lastmod>${new Date(
          s.created_at,
        ).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    ),
  ].join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
