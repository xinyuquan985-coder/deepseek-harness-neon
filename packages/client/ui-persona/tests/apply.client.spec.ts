/** ui-persona apply wiring: three keyed seat entries land behind the persona
 * slot declaration and roll back with the fiber. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject, PERSONA_NS } from '../src/client/index.ts'
import { AssistantPersonaRow, SteeringPersonaRow, UserPersonaRow } from '../src/client/PersonaAvatar.tsx'

const SLOT = 'conversation.chat.persona'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.provide('locale', new LocaleRuntime(ctx))
  const slots = ctx.get('slots') as SlotRegistry
  // Stand in for the chat view: declare the persona seat from a stub root.
  slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'keyed', scope: 'session' } } } as never,
    () => null,
  )
  return { ctx, slots }
}

describe('ui-persona client apply', () => {
  it('declares its service dependencies', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('fills the three persona seat keys with their row components', async () => {
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entries = slots.entries(SLOT)
    expect(entries.map(e => e.options.key)).toEqual(['user', 'steering', 'assistant-step'])
    expect(entries.map(e => e.component)).toEqual([UserPersonaRow, SteeringPersonaRow, AssistantPersonaRow])
    expect(entries.every(e => e.locale === PERSONA_NS)).toBe(true)
    await fiber.dispose()
  })

  it('provides the nameplate dictionaries and tears everything down on dispose', async () => {
    const { ctx, slots } = await bench()
    const locale = ctx.get('locale') as LocaleRuntime
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(locale.bind(PERSONA_NS)('persona.user')).toBe('网络行者')
    expect(locale.bind(PERSONA_NS)('persona.assistant')).toBe('Blackwall_AI')
    await fiber.dispose()
    expect(slots.entries(SLOT)).toHaveLength(0)
    expect(locale.bind(PERSONA_NS)('persona.user')).toBe('persona.user')
  })
})
