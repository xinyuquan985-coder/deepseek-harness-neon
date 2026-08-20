/**
 * Off-peak pause gate, host half. While the durable `ui-offpeak.enabled`
 * setting is on and Beijing time is inside a configured peak interval, the
 * `agent/pre-step` waterfall defers `next()`. In-flight calls are untouched;
 * after the boundary, toggle-off, or abort, the original chain resumes with
 * the same context and model configuration.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  DEFAULT_PEAK_WINDOWS, OFFPEAK_SETTINGS_NAMESPACE, OffpeakSettingsSchema,
  PeakWindowSchema, isPeakWindow, millisecondsUntilScheduleBoundary,
  type OffpeakSettings, type PeakWindow,
} from '@deepseek-ai/dsh-client-ui-offpeak'

export const name = 'offpeak-gate'

export interface Config {
  /** Beijing-time peak intervals; starts are inclusive and ends exclusive. */
  peakWindows?: PeakWindow[]
  /** Maximum re-check interval for a toggle change (default 15s). */
  pollMs?: number
}

export const Config: z<Config> = z.object({
  peakWindows: z.array(PeakWindowSchema).default(DEFAULT_PEAK_WINDOWS.map(window => ({ ...window }))),
  pollMs: z.number().step(1).min(10).default(15_000),
})

const NAMESPACE = settingsNamespace(OFFPEAK_SETTINGS_NAMESPACE)

/** One bounded wait tick: resolves on abort or after the poll/boundary delay. */
function waitTick(signal: AbortSignal, milliseconds: number): Promise<'aborted' | 'tick'> {
  return new Promise((resolve) => {
    const finish = (outcome: 'aborted' | 'tick'): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(outcome)
    }
    const onAbort = (): void => { finish('aborted') }
    const timer = setTimeout(() => { finish('tick') }, milliseconds)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function apply(ctx: Context, config: Config): void {
  const peakWindows = config.peakWindows as PeakWindow[]
  const pollMs = config.pollMs as number
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(NAMESPACE, OffpeakSettingsSchema)
  })
  ctx.on('agent/pre-step', async ({ signal }, next): Promise<PreStepDecision> => {
    const settings = ctx.get('settings')
    for (;;) {
      const enabled = (settings?.get(NAMESPACE) as OffpeakSettings | undefined)?.enabled === true
      const now = new Date()
      if (!enabled || !isPeakWindow(now, peakWindows) || signal.aborted) break
      const delay = Math.min(pollMs, millisecondsUntilScheduleBoundary(now, peakWindows))
      const outcome = await waitTick(signal, delay)
      if (outcome === 'aborted') break
    }
    // No payload is recreated or mutated: the exact downstream decision resumes.
    return await next()
  })
}
