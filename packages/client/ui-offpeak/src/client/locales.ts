/** `offpeak` namespace dictionaries (off-peak mode copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'offpeak.aria': '错峰模式',
  'offpeak.dock.pausedUntil12': '⏸ 当前高峰时段：09:00–12:00，新步骤暂停，12:00 自动续上',
  'offpeak.dock.pausedUntil18': '⏸ 当前高峰时段：14:00–18:00，新步骤暂停，18:00 自动续上',
  'offpeak.dock.running': '✅ 错峰模式运行中（高峰 09:00–12:00、14:00–18:00）',
} satisfies Record<string, string>

/** The offpeak namespace key union. */
export type OffpeakKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'offpeak.aria': 'Off-peak mode',
  'offpeak.dock.pausedUntil12': '⏸ Current peak period: 09:00–12:00; new steps pause and resume at 12:00',
  'offpeak.dock.pausedUntil18': '⏸ Current peak period: 14:00–18:00; new steps pause and resume at 18:00',
  'offpeak.dock.running': '✅ Off-peak mode active (peak hours: 09:00–12:00, 14:00–18:00)',
} satisfies Record<OffpeakKey, string>
