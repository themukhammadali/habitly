import { useEffect } from 'react'
import { create } from 'zustand'

interface ToastState {
  toast: { id: number; message: string; action?: { label: string; run: () => void } } | null
  show: (message: string, action?: { label: string; run: () => void }) => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (message, action) => set({ toast: { id: Date.now(), message, action } }),
  hide: () => set({ toast: null }),
}))

export default function Toast() {
  const toast = useToast((s) => s.toast)
  const hide = useToast((s) => s.hide)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(hide, 5000)
    return () => clearTimeout(t)
  }, [toast, hide])

  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex max-w-md justify-center px-4 pb-safe">
      <div
        key={toast.id}
        role="status"
        className="pointer-events-auto flex w-full animate-toast-in items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
      >
        <span className="flex-1">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.run()
              hide()
            }}
            className="font-semibold text-emerald-400 dark:text-emerald-600"
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
