/** Host loader entry for the browser-only off-peak mode plugin. */

/** Provides no host-side behavior. */
export function apply(): void {}

export {
  DEFAULT_PEAK_WINDOWS, OFFPEAK_ENABLED_FIELD, OFFPEAK_SETTINGS_NAMESPACE,
  OffpeakSettingsSchema, PeakWindowSchema, activePeakWindow, beijingMinuteOfDay,
  isOffPeakWindow, isPeakWindow, millisecondsUntilScheduleBoundary,
  type OffpeakSettings, type PeakWindow,
} from './offpeak-settings.ts'
