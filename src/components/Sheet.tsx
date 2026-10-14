import { useCallback, useEffect, useState } from 'react'
import { useBackHandler } from '../hooks/useBackHandler'

const CLOSE_MS = 200

export default function Sheet({
  title,
  onClose,
  children,
  rightAction,
}: {
  title: string
  onClose: () => void
  /** A function child gets `close`, which plays the closing animation first. */
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
  rightAction?: React.ReactNode
}) {
  const [closing, setClosing] = useState(false)
  const close = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  useBackHandler(close)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white pb-safe dark:bg-neutral-900 no-scrollbar ${
          closing ? 'animate-sheet-down' : 'animate-sheet-up'
        }`}
      >
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-neutral-900/90">
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/5">
            <button type="button" onClick={close} className="min-w-[56px] text-left text-[15px] text-neutral-400">
              Cancel
            </button>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
            <div className="min-w-[56px] text-right">{rightAction}</div>
          </div>
        </div>
        <div className="px-4 py-5">{typeof children === 'function' ? children(close) : children}</div>
      </div>
    </div>
  )
}
