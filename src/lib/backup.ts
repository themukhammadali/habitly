import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Habit, Settings } from '../types'
import { todayKey } from './dates'
import { normalizeHabit } from './migrate'

const FORMAT = 'habitly-backup'
// v2 (app 1.1): icon keys instead of emoji, schedules, reminders, completion times.
const VERSION = 2

export interface Backup {
  habits: Habit[]
  settings: Settings
}

export async function exportBackup(data: Backup): Promise<void> {
  const json = JSON.stringify(
    { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), ...data },
    null,
    2,
  )
  const filename = `habitly-backup-${todayKey()}.json`

  if (Capacitor.isNativePlatform()) {
    // WebView can't trigger downloads; write to cache and open the share sheet.
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: 'Habitly backup', files: [uri] })
    return
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Parses and validates a backup file. Throws with a readable message on bad input. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid Habitly backup.')
  }
  const obj = raw as Record<string, unknown>
  if (!obj || obj.format !== FORMAT || !Array.isArray(obj.habits)) {
    throw new Error('This file is not a valid Habitly backup.')
  }
  if (typeof obj.version !== 'number' || obj.version > VERSION) {
    throw new Error('This backup was made by a newer version of Habitly.')
  }

  const habits = obj.habits.map(normalizeHabit)

  const s = obj.settings as Partial<Settings> | undefined
  const theme = s?.theme === 'light' || s?.theme === 'dark' ? s.theme : 'system'
  return { habits, settings: { theme } }
}
