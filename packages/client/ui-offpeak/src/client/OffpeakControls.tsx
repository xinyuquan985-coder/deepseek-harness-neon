// OffpeakControls: the composer tool-row toggle and the composer-dock status
// line. Both read the injected offpeak source (the durable ui-offpeak.enabled
// mirror bound by the renderer as useOffpeak) and derive the phase from the
// wall clock on a one-minute tick, so the two surfaces always agree about
// peak vs off-peak.

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { IconOffpeak16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { getOffpeakPhase, millisecondsUntilScheduleBoundary, type OffpeakPhase } from './offpeak-phase.ts'
import css from './OffpeakControls.module.css'

/** Registration-side business face: the settings mirror plus the durable write. */
export interface OffpeakInjected {
  hooks: {
    /** The durable ui-offpeak.enabled mirror, bound by the renderer as useOffpeak. */
    offpeak: SnapshotStore<boolean>
  }
  /** Persist one toggle flip. */
  setEnabled: (enabled: boolean) => void
}

type OffpeakToggleProps =
  PropsRuntime<'conversation.input.right'> & PropsLocale<'offpeak'> & InjectFace<OffpeakInjected>

/** Subscribe to the schedule clock and wake exactly at its next boundary. */
function usePhase(): OffpeakPhase {
  const [phase, setPhase] = useState(() => getOffpeakPhase())
  useEffect(() => {
    let timer = 0
    const schedule = (): void => {
      const now = new Date()
      timer = window.setTimeout(() => {
        setPhase(getOffpeakPhase())
        schedule()
      }, millisecondsUntilScheduleBoundary(now) + 5)
    }
    schedule()
    return () => { window.clearTimeout(timer) }
  }, [])
  return phase
}

/**
 * The composer tool-row toggle: on while the user wants tasks held through
 * peak hours; amber in the paused (peak) phase, green while off-peak runs.
 * @param props - locale seat, the injected enabled mirror, and the settings write.
 * @returns the toggle element tree.
 */
export function OffpeakToggle({ t, useOffpeak, setEnabled }: OffpeakToggleProps) {
  const enabled = useOffpeak(value => value)
  const running = usePhase() === 'running'
  const label = t('offpeak.aria')
  return (
    <button
      type="button"
      className={clsx(css.toggle, enabled && (running ? css.running : css.paused))}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      onClick={() => { setEnabled(!enabled) }}
    >
      <IconOffpeak16 />
    </button>
  )
}

type OffpeakDockProps =
  PropsRuntime<'conversation.composer.dock'> & PropsLocale<'offpeak'> & InjectFace<OffpeakInjected>

/**
 * The composer-dock status line: visible only while the mode is on, telling
 * the user whether tasks are held (peak) or running (off-peak window).
 * @param props - locale seat and the injected enabled mirror.
 * @returns the status line, or null while the mode is off.
 */
export function OffpeakDock({ t, useOffpeak }: OffpeakDockProps) {
  const enabled = useOffpeak(value => value)
  const phase = usePhase()
  if (!enabled) return null
  const running = phase === 'running'
  const copyKey = running
    ? 'offpeak.dock.running'
    : phase === 'paused-until-12'
      ? 'offpeak.dock.pausedUntil12'
      : 'offpeak.dock.pausedUntil18'
  return (
    <div className={clsx(css.dock, running ? css.running : css.paused)} data-offpeak-phase={running ? 'running' : 'paused'}>
      {t(copyKey)}
    </div>
  )
}
