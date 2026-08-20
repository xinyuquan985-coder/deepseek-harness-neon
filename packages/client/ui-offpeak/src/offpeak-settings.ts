/**
 * Shared off-peak contracts for both halves of the plugin: the durable
 * settings namespace/schema (the browser toggle writes it; the host gate
 * reads it) and the Beijing-time peak schedule used by both surfaces.
 */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owning the durable off-peak toggle. */
export const OFFPEAK_SETTINGS_NAMESPACE = 'ui-offpeak'
/** Settings field carrying the toggle value. */
export const OFFPEAK_ENABLED_FIELD = 'enabled'

/** One Beijing-time interval, expressed as minutes since midnight. */
export interface PeakWindow {
  /** Inclusive interval start (0-1439). */
  startMinutes: number
  /** Exclusive interval end (1-1440). */
  endMinutes: number
}

/** Default service peak windows: 09:00-12:00 and 14:00-18:00 Beijing time. */
export const DEFAULT_PEAK_WINDOWS: readonly PeakWindow[] = Object.freeze([
  Object.freeze({ startMinutes: 9 * 60, endMinutes: 12 * 60 }),
  Object.freeze({ startMinutes: 14 * 60, endMinutes: 18 * 60 }),
])

/** Validated shape used by the host plugin's configurable peak schedule. */
export const PeakWindowSchema: z<PeakWindow> = z.object({
  startMinutes: z.number().step(1).min(0).max(1439),
  endMinutes: z.number().step(1).min(1).max(1440),
})

/** Durable off-peak section shared by the Host schema and the browser scope. */
export interface OffpeakSettings {
  /** Whether the user wants new steps held through peak hours. */
  enabled: boolean
}

/** Durable schema; also the wire envelope the browser scope validates against. */
export const OffpeakSettingsSchema: z<OffpeakSettings> = z.object({
  [OFFPEAK_ENABLED_FIELD]: z.boolean().default(false),
})

const BEIJING_OFFSET_MINUTES = 8 * 60
const MINUTES_PER_DAY = 24 * 60
const MILLISECONDS_PER_MINUTE = 60_000
const MILLISECONDS_PER_DAY = MINUTES_PER_DAY * MILLISECONDS_PER_MINUTE

/** Resolve one instant to its Beijing minute of day. */
export function beijingMinuteOfDay(now: Date): number {
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + BEIJING_OFFSET_MINUTES) % MINUTES_PER_DAY
}

/** Resolve the active peak interval, if any. Window ends are exclusive. */
export function activePeakWindow(
  now: Date,
  windows: readonly PeakWindow[] = DEFAULT_PEAK_WINDOWS,
): PeakWindow | undefined {
  const minute = beijingMinuteOfDay(now)
  return windows.find(({ startMinutes, endMinutes }) => {
    if (startMinutes < endMinutes) return minute >= startMinutes && minute < endMinutes
    if (startMinutes > endMinutes) return minute >= startMinutes || minute < endMinutes
    return false
  })
}

/** Whether one instant is in any configured Beijing-time peak interval. */
export function isPeakWindow(
  now: Date,
  windows: readonly PeakWindow[] = DEFAULT_PEAK_WINDOWS,
): boolean {
  return activePeakWindow(now, windows) !== undefined
}

/** Whether new work may run now under the off-peak policy. */
export function isOffPeakWindow(
  now: Date,
  windows: readonly PeakWindow[] = DEFAULT_PEAK_WINDOWS,
): boolean {
  return !isPeakWindow(now, windows)
}

/**
 * Milliseconds until the next configured start/end boundary. This lets the
 * UI and host gate wake exactly at 12:00/18:00 even when mounted mid-minute.
 */
export function millisecondsUntilScheduleBoundary(
  now: Date,
  windows: readonly PeakWindow[] = DEFAULT_PEAK_WINDOWS,
): number {
  if (windows.length === 0) return MILLISECONDS_PER_DAY
  const currentMinute = beijingMinuteOfDay(now)
  const elapsedInMinute = now.getUTCSeconds() * 1_000 + now.getUTCMilliseconds()
  let closest = MILLISECONDS_PER_DAY
  for (const { startMinutes, endMinutes } of windows) {
    for (const rawBoundary of [startMinutes, endMinutes]) {
      const boundary = rawBoundary % MINUTES_PER_DAY
      const minuteDelta = (boundary - currentMinute + MINUTES_PER_DAY) % MINUTES_PER_DAY
      let delay = minuteDelta * MILLISECONDS_PER_MINUTE - elapsedInMinute
      if (delay <= 0) delay += MILLISECONDS_PER_DAY
      closest = Math.min(closest, delay)
    }
  }
  return closest
}
