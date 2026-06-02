/**
 * Image OG dynamique de la page publique — l'objet qui se partage sur X/LinkedIn
 * et ramène du trafic (fonction edge Vercel, @vercel/og + Satori).
 *
 * Accès : /api/og?slug=<slug>. Design cohérent DESIGN.md : encre chaude profonde,
 * accent ambre réservé au score, Instrument Serif pour la question, Geist pour
 * l'UI, les 4 modèles et le score de consensus, logo Quorum.
 *
 * Les données viennent de la RPC `get_share_meta` (sans incrément de vue).
 */

import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

interface ShareMeta {
  slug: string
  question: string
  consensus_score: number | null
  borda_scores: Record<string, number>
  models: { slot: string; model_id: string; status: string }[]
}

// Palette (DESIGN.md transposé en sRGB — Satori ne gère pas OKLCH).
const INK = '#15120d'
const SURFACE = '#1d1a14'
const TEXT = '#ece7df'
const MUTED = '#8c857a'
const AMBER = '#f5b544'
const GREEN = '#5fbf8f'
const PARTIAL = '#e6b455'
const DISSENT = '#d2825a'
const SLOT_DOT: Record<string, string> = {
  A: '#6fbf95',
  B: '#6aa8d6',
  C: '#d7b67a',
  D: '#b58fd1',
}

async function loadGoogleFont(font: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)
  if (resource && resource[1]) {
    const res = await fetch(resource[1])
    if (res.status === 200) return await res.arrayBuffer()
  }
  throw new Error('font load failed')
}

async function fetchMeta(slug: string): Promise<ShareMeta | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
  const KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
  if (!SUPABASE_URL || !KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_share_meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
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

function tierColor(slot: string, borda: Record<string, number>): string {
  const ranked = Object.entries(borda)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
  const total = ranked.length
  const rank = ranked.indexOf(slot)
  if (total <= 1 || rank === -1) return MUTED
  if (rank === 0) return GREEN
  if (rank === total - 1) return DISSENT
  return PARTIAL
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}

export default async function handler(req: Request): Promise<Response> {
  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  const meta = slug ? await fetchMeta(slug) : null

  const question = meta ? truncate(meta.question, 150) : 'Posez une question à l’assemblée'
  const score = meta?.consensus_score ?? null
  const models = meta?.models ?? [
    { slot: 'A', model_id: '', status: 'complete' },
    { slot: 'B', model_id: '', status: 'complete' },
    { slot: 'C', model_id: '', status: 'complete' },
    { slot: 'D', model_id: '', status: 'complete' },
  ]
  const borda = meta?.borda_scores ?? {}

  // Sous-ensemble de glyphes à charger (perf des polices Google).
  const serifText = question
  const uiText =
    'QUORUM Le consensus des intelligences ABCD Modèle de consensus Regardez comment 4 IA ont voté %0123456789'

  const [serif, sans, sansMedium] = await Promise.all([
    loadGoogleFont('Instrument+Serif', serifText),
    loadGoogleFont('Geist', uiText),
    loadGoogleFont('Geist:wght@500', uiText),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '64px 72px',
          background: `radial-gradient(120% 80% at 80% -10%, rgba(245,181,68,0.16), ${INK} 55%)`,
          fontFamily: 'Geist',
          justifyContent: 'space-between',
        }}
      >
        {/* En-tête : logo + tagline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ fontFamily: 'Instrument Serif', fontSize: 44, color: TEXT }}>Quorum</span>
            <span style={{ fontSize: 18, color: MUTED, letterSpacing: 1 }}>
              LE CONSENSUS DES INTELLIGENCES
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {models.map((m) => (
              <div
                key={m.slot}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: SLOT_DOT[m.slot] ?? MUTED,
                }}
              />
            ))}
          </div>
        </div>

        {/* Question — le cœur, en serif éditorial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 22, color: AMBER, letterSpacing: 2 }}>
            REGARDEZ COMMENT {models.length} IA ONT DÉLIBÉRÉ
          </span>
          <span
            style={{
              fontFamily: 'Instrument Serif',
              fontSize: 64,
              lineHeight: 1.12,
              color: TEXT,
              maxWidth: 1000,
            }}
          >
            {question}
          </span>
        </div>

        {/* Pied : score de consensus + grille des modèles */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {models.map((m) => (
              <div
                key={m.slot}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  borderRadius: 14,
                  background: SURFACE,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: tierColor(m.slot, borda),
                  }}
                />
                <span style={{ fontSize: 22, color: TEXT }}>Modèle {m.slot}</span>
              </div>
            ))}
          </div>

          {score !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 96, color: AMBER, fontFamily: 'Geist', fontWeight: 500 }}>
                {score}
                <span style={{ fontSize: 40, color: MUTED }}>%</span>
              </span>
              <span style={{ fontSize: 22, color: MUTED, letterSpacing: 1 }}>CONSENSUS</span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Instrument Serif', data: serif, weight: 400, style: 'normal' },
        { name: 'Geist', data: sans, weight: 400, style: 'normal' },
        { name: 'Geist', data: sansMedium, weight: 500, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, immutable, no-transform, s-maxage=86400, max-age=86400',
      },
    },
  )
}
