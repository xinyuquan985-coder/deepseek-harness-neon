/**
 * Browser half of the persona plugin: register the three keyed entries of the
 * `conversation.chat.persona` seat (user / steering / assistant-step) with
 * the original character skins, and provide the persona nameplate
 * dictionaries. The seat is declared by the chat view; ui-persona only fills
 * keys, so uninstalling the plugin leaves the chat rows untouched.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the slots module for the LocaleNamespaceMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the conversation plugin's persona seat declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { AssistantPersonaRow, SteeringPersonaRow, UserPersonaRow } from './PersonaAvatar.tsx'
import { en, zh, type PersonaKey } from './locales.ts'

/** Locale namespace owning this feature's nameplate copy. */
export const PERSONA_NS = 'persona'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The character-skin nameplates. */
    persona: PersonaKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: provide the nameplate dictionaries and fill the
 * persona seat keys the skin owns.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(PERSONA_NS, { zh, en }), 'ui-persona: nameplate dictionaries')
  ctx.slots.inject('conversation.chat.persona', () => ctx.slots.register(
    { name: 'conversation.chat.persona', key: 'user', locale: PERSONA_NS }, UserPersonaRow))
  ctx.slots.inject('conversation.chat.persona', () => ctx.slots.register(
    { name: 'conversation.chat.persona', key: 'steering', locale: PERSONA_NS }, SteeringPersonaRow))
  ctx.slots.inject('conversation.chat.persona', () => ctx.slots.register(
    { name: 'conversation.chat.persona', key: 'assistant-step', locale: PERSONA_NS }, AssistantPersonaRow))
}
