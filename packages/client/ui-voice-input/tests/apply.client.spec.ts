/** ui-voice-input apply wiring: one header action entry lands behind the seat
 * declaration and rolls back with the fiber. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject, VOICE_NS } from '../src/client/index.ts'
import { VoiceMicButton } from '../src/client/VoiceMicButton.tsx'

const SLOT = 'conversation.input.right'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.provide('locale', new LocaleRuntime(ctx))
  const slots = ctx.get('slots') as SlotRegistry
  slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'list', scope: 'session' } } } as never,
    () => null,
  )
  return { ctx, slots }
}

describe('ui-voice-input client apply', () => {
  it('declares its service dependencies', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the mic toggle into the composer tool-row seat and tears it down', async () => {
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entries = slots.entries(SLOT)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.options.id).toBe('voice')
    expect(entries[0]!.component).toBe(VoiceMicButton)
    expect(entries[0]!.locale).toBe(VOICE_NS)
    await fiber.dispose()
    expect(slots.entries(SLOT)).toHaveLength(0)
  })

  it('provides the toggle dictionaries', async () => {
    const { ctx } = await bench()
    const locale = ctx.get('locale') as LocaleRuntime
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(locale.bind(VOICE_NS)('voice.aria')).toBe('语音输入')
    await fiber.dispose()
  })
})
