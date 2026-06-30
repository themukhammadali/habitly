import { useEffect } from 'react'

export default function Sheet({
  title,
  onClose,
  children,
  rightAction,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  rightAction?: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 animate-fade-in bg-black/40"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white pb-safe dark:bg-neutral-900 no-scrollbar">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-neutral-900/90">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] text-neutral-400"
          >
            Cancel
          </button>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
            {title}
          </h2>
          <div className="min-w-[48px] text-right">{rightAction}</div>
        </div>
        <div className="px-4 py-5">{children}</div>
      </div>
    </div>
  )
}
