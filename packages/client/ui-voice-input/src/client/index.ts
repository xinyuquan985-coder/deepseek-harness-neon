/**
 * Browser half of the voice-input plugin: register the mic toggle into the
 * session header action seat and provide its copy. The toggle feature-detects
 * SpeechRecognition and renders nothing where the API is absent; transcripts
 * land in the composer draft through the framework session kit.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the slots module for the LocaleNamespaceMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the conversation plugin's header-action seat declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { VoiceMicButton } from './VoiceMicButton.tsx'
import { en, zh, type VoiceKey } from './locales.ts'

/** Locale namespace owning the voice toggle's copy. */
export const VOICE_NS = 'voice'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The voice-input toggle. */
    voice: VoiceKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: provide the toggle dictionaries and register the mic
 * action into the session header.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(VOICE_NS, { zh, en }), 'ui-voice-input: toggle dictionaries')
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'voice',
    order: 50,
    locale: VOICE_NS,
  }, VoiceMicButton))
}
