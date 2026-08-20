import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PEAK_WINDOWS, getOffpeakPhase, isOffPeak, millisecondsUntilScheduleBoundary,
} from '../src/client/offpeak-phase.ts'

const beijing = (h: number, m: number, s = 0): Date =>
  new Date(Date.UTC(2026, 0, 1, (h + 24 - 8) % 24, m, s))

describe('off-peak Beijing schedule', () => {
  it('pauses for every minute of both peak intervals and runs everywhere else', () => {
    expect(isOffPeak(beijing(8, 59))).toBe(true)
    expect(isOffPeak(beijing(9, 0))).toBe(false)
    expect(isOffPeak(beijing(11, 59, 59))).toBe(false)
    expect(isOffPeak(beijing(12, 0))).toBe(true)
    expect(isOffPeak(beijing(13, 59, 59))).toBe(true)
    expect(isOffPeak(beijing(14, 0))).toBe(false)
    expect(isOffPeak(beijing(17, 59, 59))).toBe(false)
    expect(isOffPeak(beijing(18, 0))).toBe(true)
    expect(isOffPeak(beijing(23, 59))).toBe(true)
    expect(isOffPeak(beijing(0, 0))).toBe(true)
  })

  it('names the exact resume boundary for each peak block', () => {
    expect(getOffpeakPhase(beijing(9, 0))).toBe('paused-until-12')
    expect(getOffpeakPhase(beijing(14, 0))).toBe('paused-until-18')
    expect(getOffpeakPhase(beijing(12, 0))).toBe('running')
  })

  it('wakes at the boundary rather than one minute after the page mount time', () => {
    expect(millisecondsUntilScheduleBoundary(beijing(11, 59, 30))).toBe(30_000)
    expect(millisecondsUntilScheduleBoundary(beijing(17, 59, 59))).toBe(1_000)
  })

  it('publishes both configured peak windows', () => {
    expect(DEFAULT_PEAK_WINDOWS).toEqual([
      { startMinutes: 9 * 60, endMinutes: 12 * 60 },
      { startMinutes: 14 * 60, endMinutes: 18 * 60 },
    ])
  })

  it('defaults to the current wall clock', () => {
    expect(typeof isOffPeak()).toBe('boolean')
  })
})
