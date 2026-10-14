import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Open sheets and screens register here, newest last. The Android back button
// closes the newest one instead of leaving the app.
const stack: { current: () => void }[] = []

if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', () => {
    const top = stack[stack.length - 1]
    if (top) top.current()
    else App.minimizeApp()
  })
}

export function useBackHandler(onBack: () => void) {
  const ref = useRef(onBack)
  ref.current = onBack
  useEffect(() => {
    const entry = ref
    stack.push(entry)
    return () => {
      const i = stack.lastIndexOf(entry)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [])
}
