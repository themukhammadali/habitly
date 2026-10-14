import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const native = Capacitor.isNativePlatform()

export function tapFeedback() {
  if (native) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else navigator.vibrate?.(10)
}

export function successFeedback() {
  if (native) Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  else navigator.vibrate?.([20, 60, 30])
}
