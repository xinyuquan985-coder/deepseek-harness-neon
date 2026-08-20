// @vitest-environment jsdom
// OffpeakControls: the toggle writes through the injected setEnabled face and
// reads the injected offpeak source; the dock line names the phase only while
// the mode is on.
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OffpeakDock, OffpeakToggle } from '../src/client/OffpeakControls.tsx'

const t = (key: string): string => key

function useOffpeakOf(enabled: boolean): never {
  return ((selector: (value: boolean) => unknown) => selector(enabled)) as never
}

function renderToggle(enabled: boolean, setEnabled: (v: boolean) => void) {
  const props = { t, useOffpeak: useOffpeakOf(enabled), setEnabled } as unknown as ComponentProps<typeof OffpeakToggle>
  return render(<OffpeakToggle {...props} />)
}

function renderDock(enabled: boolean) {
  const props = { t, useOffpeak: useOffpeakOf(enabled) } as unknown as ComponentProps<typeof OffpeakDock>
  return render(<OffpeakDock {...props} />)
}

const beijing = (h: number, m: number): number => Date.UTC(2026, 0, 1, (h + 24 - 8) % 24, m)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('OffpeakToggle', () => {
  it('renders the toggle and writes the flipped setting through the injected face', () => {
    const setEnabled = vi.fn()
    const view = renderToggle(false, setEnabled)
    const button = view.getByRole('button', { name: 'offpeak.aria' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(setEnabled).toHaveBeenCalledWith(true)
  })

  it('marks the pressed state with the paused/running phase class', () => {
    vi.setSystemTime(beijing(10, 0))
    const view = renderToggle(true, vi.fn())
    expect(view.container.firstElementChild?.className).toContain('paused')
    cleanup()
    vi.setSystemTime(beijing(12, 0))
    const running = renderToggle(true, vi.fn())
    expect(running.container.firstElementChild?.className).toContain('running')
  })
})

describe('OffpeakDock', () => {
  it('renders nothing while the mode is off', () => {
    const view = renderDock(false)
    expect(view.container.innerHTML).toBe('')
  })

  it('names the exact resume time during peak and the running phase outside it', () => {
    vi.setSystemTime(beijing(10, 0))
    const paused = renderDock(true)
    expect(paused.getByText('offpeak.dock.pausedUntil12')).not.toBeNull()
    expect(paused.container.firstElementChild?.getAttribute('data-offpeak-phase')).toBe('paused')
    cleanup()
    vi.setSystemTime(beijing(15, 0))
    const afternoon = renderDock(true)
    expect(afternoon.getByText('offpeak.dock.pausedUntil18')).not.toBeNull()
    cleanup()
    vi.setSystemTime(beijing(18, 0))
    const running = renderDock(true)
    expect(running.getByText('offpeak.dock.running')).not.toBeNull()
    expect(running.container.firstElementChild?.getAttribute('data-offpeak-phase')).toBe('running')
  })

  it('re-resolves exactly at the schedule boundary even when mounted mid-minute', () => {
    vi.useFakeTimers()
    vi.setSystemTime(beijing(11, 59) + 30_000)
    const view = renderDock(true)
    expect(view.container.firstElementChild?.getAttribute('data-offpeak-phase')).toBe('paused')
    act(() => { vi.advanceTimersByTime(30_005) })
    expect(view.container.firstElementChild?.getAttribute('data-offpeak-phase')).toBe('running')
  })
})
