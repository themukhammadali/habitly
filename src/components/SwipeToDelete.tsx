import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { tapFeedback } from '../lib/haptics'

const ACTION_WIDTH = 88
/** How far the row slides open: the button plus a small gap. */
const REVEAL = ACTION_WIDTH + 8
/** Movement before we decide whether the gesture is a swipe or a scroll. */
const SLOP = 8

/**
 * Swipe the row left to reveal a Delete button behind it. Vertical drags still
 * scroll the page; a tap outside the open row closes it.
 */
export default function SwipeToDelete({
  onDelete,
  label,
  children,
}: {
  onDelete: () => void
  label: string
  children: React.ReactNode
}) {
  const [offset, setOffsetState] = useState(0)
  // Pointer events can arrive faster than renders, so read the latest offset from a ref.
  const offsetRef = useRef(0)
  const setOffset = (v: number) => {
    offsetRef.current = v
    setOffsetState(v)
  }
  const [dragging, setDragging] = useState(false)
  const row = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; start: number; mode: 'undecided' | 'swipe' | 'scroll' } | null>(null)
  const swiped = useRef(false)
  const open = offset <= -REVEAL

  // Close when tapping anywhere outside the open row.
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!row.current?.contains(e.target as Node)) setOffset(0)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    gesture.current = { x: e.clientX, y: e.clientY, start: offsetRef.current, mode: 'undecided' }
    swiped.current = false
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (g.mode === 'undecided') {
      if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy)) {
        g.mode = 'swipe'
        setDragging(true)
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } else if (Math.abs(dy) > SLOP) {
        g.mode = 'scroll'
      }
    }
    if (g.mode !== 'swipe') return
    swiped.current = true
    let next = Math.min(0, g.start + dx)
    // Resist past the button's width.
    if (next < -REVEAL) next = -REVEAL + (next + REVEAL) / 3
    if ((next <= -REVEAL / 2) !== (offsetRef.current <= -REVEAL / 2)) tapFeedback()
    setOffset(next)
  }

  function onPointerEnd() {
    const g = gesture.current
    gesture.current = null
    setDragging(false)
    if (g?.mode === 'swipe') setOffset(offsetRef.current <= -REVEAL / 2 ? -REVEAL : 0)
  }

  return (
    <div ref={row} className="relative">
      <button
        type="button"
        onClick={() => {
          setOffset(0)
          onDelete()
        }}
        aria-label={`Delete ${label}`}
        tabIndex={open ? 0 : -1}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-500 text-xs font-semibold text-white transition-opacity"
        style={{ width: ACTION_WIDTH, opacity: offset < 0 ? 1 : 0 }}
      >
        <Trash2 className="h-5 w-5" />
        Delete
      </button>
      <div
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // A swipe ends with a click; don't let it open the habit or tick it off.
          if (swiped.current || open) {
            e.stopPropagation()
            e.preventDefault()
            swiped.current = false
            if (open) setOffset(0)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
