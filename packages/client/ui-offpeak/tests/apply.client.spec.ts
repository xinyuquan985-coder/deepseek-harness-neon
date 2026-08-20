/** ui-offpeak apply wiring: the settings binding, two seat entries, the
 * injected source/face, and fiber teardown. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { stubSettingsScope, type StubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject, OFFPEAK_NS } from '../src/client/index.ts'
import { OffpeakDock, OffpeakToggle, type OffpeakInjected } from '../src/client/OffpeakControls.tsx'

const RIGHT = 'conversation.input.right'
const DOCK = 'conversation.composer.dock'

async function bench(host: StubSettingsScope<{ enabled: boolean }> = stubSettingsScope()) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.provide('locale', new LocaleRuntime(ctx))
  ctx.provide('settingsScope', { bind: () => host.scope } as never)
  const slots = ctx.get('slots') as SlotRegistry
  slots.register({
    name: 'root',
    children: {
      [RIGHT]: { kind: 'list', scope: 'session' },
      [DOCK]: { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  return { ctx, slots, host }
}

describe('ui-offpeak client apply', () => {
  it('declares its service dependencies', () => {
    expect(inject).toEqual(['slots', 'locale', 'settingsScope'])
  })

  it('registers the toggle and dock line with the shared inject face', async () => {
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const right = slots.entries(RIGHT)
    expect(right.map(e => e.options.id)).toEqual(['offpeak'])
    expect(right[0]!.component).toBe(OffpeakToggle)
    const dock = slots.entries(DOCK)
    expect(dock.map(e => e.options.id)).toEqual(['offpeak'])
    expect(dock[0]!.component).toBe(OffpeakDock)
    expect(right[0]!.locale).toBe(OFFPEAK_NS)
    expect(right[0]!.inject).toBe(dock[0]!.inject)
    await fiber.dispose()
    expect(slots.entries(RIGHT)).toHaveLength(0)
    expect(slots.entries(DOCK)).toHaveLength(0)
  })

  it('mirrors the durable value through the injected source and writes flips', async () => {
    const host = stubSettingsScope<{ enabled: boolean }>()
    host.publish({ status: 'ready', value: { enabled: true }, revision: 1, writable: true })
    const { ctx, slots } = await bench(host)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = slots.entries(RIGHT)[0]!
    const face = (entry.inject as unknown as () => OffpeakInjected)()
    expect(face.hooks.offpeak.getSnapshot()).toBe(true)
    face.setEnabled(false)
    expect(host.set).toHaveBeenCalledWith('enabled', false)
    host.publish({ status: 'ready', value: { enabled: false }, revision: 2, writable: true })
    expect(face.hooks.offpeak.getSnapshot()).toBe(false)
    await fiber.dispose()
  })
})
