import { useMemo } from 'react'
import { PALETTE } from '../lib/palette'

/** A short burst of confetti from the top of the screen. Purely decorative. */
export default function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: 50 + (Math.random() - 0.5) * 30,
        dx: (Math.random() - 0.5) * 320,
        dy: 260 + Math.random() * 360,
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 120,
        color: PALETTE[i % PALETTE.length].hex,
        round: i % 3 === 0,
      })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-[18%] h-2.5 w-1.5"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              borderRadius: p.round ? '9999px' : '2px',
              animationDelay: `${p.delay}ms`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
