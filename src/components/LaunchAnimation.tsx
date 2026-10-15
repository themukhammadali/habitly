import { useEffect, useState } from 'react'
import Logo from './Logo'

/** Total time the opening animation covers the app. */
const DURATION_MS = 900

/**
 * Opening animation on each cold start: the logo pops in on the page color,
 * then the cover fades away while the screen underneath rises into place.
 * Skipped when the user prefers reduced motion.
 */
export default function LaunchAnimation({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }
    const leave = setTimeout(() => setLeaving(true), DURATION_MS - 280)
    const done = setTimeout(onDone, DURATION_MS)
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-surface ${leaving ? 'animate-launch-out' : ''}`}
    >
      <Logo className="h-24 w-24 animate-launch-logo" />
    </div>
  )
}
