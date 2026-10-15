import { useEffect, useRef } from 'react'
import { PALETTE } from '../lib/palette'

/** How long the burst lasts; the parent unmounts this after. */
export const CONFETTI_MS = 2600

const PIECES_PER_SIDE = 70
const GRAVITY = 1400 // px/s²
const DRAG = 0.985 // velocity kept per frame (60 fps)

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  spin: number
  /** Phase of the flutter (pieces flip as they fall). */
  flip: number
  round: boolean
}

/**
 * Two confetti cannons, one in each bottom corner, firing toward the top
 * center. Purely decorative; skipped when the user prefers reduced motion.
 */
export default function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    el.width = w * dpr
    el.height = h * dpr
    ctx.scale(dpr, dpr)

    const pieces: Piece[] = []
    for (const side of [0, 1]) {
      const x0 = side === 0 ? -10 : w + 10
      for (let i = 0; i < PIECES_PER_SIDE; i++) {
        // Aim at the top center, with some spread so the bursts fan out.
        const dx = w / 2 - x0
        const dy = -h * (0.85 + Math.random() * 0.25)
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.45
        const speed = Math.hypot(dx, dy) * (1.25 + Math.random() * 0.55)
        pieces.push({
          x: x0,
          y: h + 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 6 + Math.random() * 6,
          color: PALETTE[(i + side * 3) % PALETTE.length].hex,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 14,
          flip: Math.random() * Math.PI * 2,
          round: i % 4 === 0,
        })
      }
    }

    let last = performance.now()
    const start = last
    let frame = 0
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const elapsed = now - start
      const drag = Math.pow(DRAG, dt * 60)
      ctx.clearRect(0, 0, w, h)
      // Fade out over the last 600 ms.
      ctx.globalAlpha = Math.max(0, Math.min(1, (CONFETTI_MS - elapsed) / 600))
      for (const p of pieces) {
        p.vx *= drag
        p.vy = p.vy * drag + GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.spin * dt
        p.flip += dt * 9
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.scale(1, Math.cos(p.flip)) // flutter
        ctx.fillStyle = p.color
        if (p.round) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }
      if (elapsed < CONFETTI_MS) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" aria-hidden />
}
