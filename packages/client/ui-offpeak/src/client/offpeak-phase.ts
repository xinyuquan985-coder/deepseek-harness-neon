import {
  DEFAULT_PEAK_WINDOWS, activePeakWindow, isOffPeakWindow, millisecondsUntilScheduleBoundary,
} from '../offpeak-settings.ts'

export { DEFAULT_PEAK_WINDOWS, millisecondsUntilScheduleBoundary }

/** UI phase distinguishes the two peak blocks so copy can name the exact resume time. */
export type OffpeakPhase = 'running' | 'paused-until-12' | 'paused-until-18'

/** Resolve the current Beijing-time phase. */
export function getOffpeakPhase(now: Date = new Date()): OffpeakPhase {
  const peak = activePeakWindow(now)
  if (!peak) return 'running'
  return peak.endMinutes === 12 * 60 ? 'paused-until-12' : 'paused-until-18'
}

/** Whether new work may run now under the default off-peak schedule. */
export function isOffPeak(now: Date = new Date()): boolean {
  return isOffPeakWindow(now)
}
