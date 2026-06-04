import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * Fond atmosphérique signature de Quorum : 4 orbes ambrées qui dérivent
 * lentement comme les 4 délégués de l'assemblée. Elles convergent doucement
 * vers le centre (la délibération), se dispersent, recommencent — et sont
 * légèrement attirées par le curseur.
 *
 * `isRunning` (question en cours) : mouvement accéléré, orbes plus grandes et
 * plus lumineuses, convergence soutenue.
 *
 * Canvas + requestAnimationFrame, zéro dépendance. `prefers-reduced-motion` :
 * canvas masqué, repli sur une lueur statique (tokens du design system).
 *
 * Contrainte design : alpha plafonné à 0.15 — des braises, pas un projecteur.
 */

interface AssemblyAuraProps {
  /** Une délibération est en cours : les orbes s'animent et convergent. */
  isRunning?: boolean
}

interface Orb {
  /** Ancrage en quadrant (fraction de la viewport). */
  qx: number
  qy: number
  /** Fréquences sinusoïdales propres → mouvement organique. */
  freqX: number
  freqY: number
  /** Amplitudes de dérive (px). */
  ampX: number
  ampY: number
  /** Déphasages initiaux. */
  phaseX: number
  phaseY: number
  /** Rayon du dégradé (blur visuel) en px. */
  radius: number
  /** Alpha de base. */
  alpha: number
  /** Décalage souris courant (lerpé). */
  mx: number
  my: number
}

/** oklch(82% 0.155 72) converti en sRGB — l'ambre signature. */
const ORB_COLOR = '255, 178, 61'
const MAX_ALPHA = 0.15
const MOUSE_MAX = 30
const MOUSE_LERP = 0.02
const CYCLE_MS = 12_000
const CONVERGE_MS = 3_000

function makeOrbs(): Orb[] {
  const quads: ReadonlyArray<readonly [number, number]> = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ]
  return quads.map(([qx, qy], i) => ({
    qx,
    qy,
    freqX: 0.0003 + i * 0.00008,
    freqY: 0.00035 + (3 - i) * 0.00007,
    ampX: 60 + i * 12,
    ampY: 70 + (3 - i) * 9,
    phaseX: i * 1.7,
    phaseY: i * 2.3,
    radius: 180 + i * 25, // 180 → 255px
    alpha: 0.06 + i * 0.02, // 0.06 → 0.12
    mx: 0,
    my: 0,
  }))
}

export function AssemblyAura({ isRunning = false }: AssemblyAuraProps): ReactNode {
  const reduced = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const runningRef = useRef(isRunning)

  useEffect(() => {
    runningRef.current = isRunning
  }, [isRunning])

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const orbs = makeOrbs()
    const mouse = { x: -9999, y: -9999, active: false }
    let raf = 0
    let last = performance.now()
    let animTime = 0

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onPointerMove = (e: PointerEvent): void => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    const onPointerLeave = (): void => {
      mouse.active = false
    }

    const render = (now: number): void => {
      const dt = Math.min(now - last, 64) // borne le pas si onglet en arrière-plan
      last = now
      const running = runningRef.current
      animTime += dt * (running ? 2.5 : 1)

      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w / 2
      const cy = h / 2
      const radiusMul = running ? 1.3 : 1
      const alphaMul = running ? 1.4 : 1

      // Pulsation de convergence : montée/descente en sinus sur CONVERGE_MS.
      const p = animTime % CYCLE_MS
      let conv = p < CONVERGE_MS ? Math.sin((p / CONVERGE_MS) * Math.PI) * 0.45 : 0
      if (running) conv = Math.min(0.7, conv + 0.3)

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      for (const orb of orbs) {
        const baseX = orb.qx * w + Math.sin(animTime * orb.freqX + orb.phaseX) * orb.ampX
        const baseY = orb.qy * h + Math.sin(animTime * orb.freqY + orb.phaseY) * orb.ampY

        // Attraction souris : vecteur borné à MOUSE_MAX, easing lerp.
        let tx = 0
        let ty = 0
        if (mouse.active) {
          const dx = mouse.x - baseX
          const dy = mouse.y - baseY
          const dist = Math.hypot(dx, dy) || 1
          const mag = Math.min(dist, MOUSE_MAX)
          tx = (dx / dist) * mag
          ty = (dy / dist) * mag
        }
        orb.mx += (tx - orb.mx) * MOUSE_LERP
        orb.my += (ty - orb.my) * MOUSE_LERP

        let x = baseX + orb.mx
        let y = baseY + orb.my
        // Convergence vers le centre.
        x += (cx - x) * conv
        y += (cy - y) * conv

        const r = orb.radius * radiusMul
        const a = Math.min(MAX_ALPHA, orb.alpha * alphaMul)
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(${ORB_COLOR}, ${a})`)
        grad.addColorStop(1, `rgba(${ORB_COLOR}, 0)`)
        ctx.fillStyle = grad
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
      }

      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reduced])

  // Repli motion réduit : lueur statique, mêmes tons ambre.
  if (reduced) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60vw 55vh at 25% 25%, rgba(255,178,61,0.08), transparent 70%),' +
            'radial-gradient(55vw 50vh at 75% 75%, rgba(255,178,61,0.06), transparent 70%)',
        }}
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 w-full"
      // height: 100vh + GPU layer (translateZ) — évite sur iOS la « ligne » de
      // séparation entre l'aura ambre et le fond noir (rastérisation à part).
      style={{ height: '100vh', transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
    />
  )
}
