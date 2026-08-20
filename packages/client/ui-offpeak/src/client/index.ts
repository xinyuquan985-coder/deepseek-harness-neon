/**
 * Browser half of the off-peak plugin: the composer tool-row toggle, the
 * composer-dock status line, and the durable `ui-offpeak.enabled` setting.
 * The enabled value mirrors the settings scope through an injected bare
 * source (bound by the renderer as `useOffpeak`); the host-side gate
 * (dsh-offpeak-gate) reads the same setting namespace.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the slots module for the LocaleNamespaceMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the conversation plugin's tool-row and dock declarations.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings plugin's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { OffpeakDock, OffpeakToggle, type OffpeakInjected } from './OffpeakControls.tsx'
import { en, zh, type OffpeakKey } from './locales.ts'
import {
  OFFPEAK_ENABLED_FIELD, OFFPEAK_SETTINGS_NAMESPACE,
  type OffpeakSettings,
} from '../offpeak-settings.ts'

export { OFFPEAK_ENABLED_FIELD, OFFPEAK_SETTINGS_NAMESPACE, type OffpeakSettings } from '../offpeak-settings.ts'

/** Locale namespace owning the off-peak copy. */
export const OFFPEAK_NS = 'offpeak'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The off-peak toggle and dock copy. */
    offpeak: OffpeakKey
  }
}

/** Required services: slots, locale, and the settings scope. */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Client plugin body: bind the durable setting, mirror it through the
 * injected source, provide the copy, and mount the toggle + dock line on
 * their composer seats.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const host = ctx.settingsScope.bind<OffpeakSettings>({ namespace: OFFPEAK_SETTINGS_NAMESPACE })
  ctx.effect(() => ctx.locale.register(OFFPEAK_NS, { zh, en }), 'ui-offpeak: dictionaries')

  // Bare source mirrors the durable value; the renderer binds it as the
  // useOffpeak hook on every entry sharing this inject face.
  const enabledSource = createSnapshotStore<boolean>(false)
  const syncEnabled = (): void => {
    const snapshot = host.getSnapshot()
    enabledSource.set(snapshot.value?.enabled === true)
  }
  ctx.effect(() => host.subscribe(syncEnabled), 'ui-offpeak: settings adoption')
  syncEnabled()
  const injected = (): OffpeakInjected => ({
    hooks: { offpeak: enabledSource },
    setEnabled: (enabled) => { void host.set(OFFPEAK_ENABLED_FIELD, enabled) },
  })

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'offpeak',
    order: 40,
    locale: OFFPEAK_NS,
    inject: injected,
  }, OffpeakToggle))
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'offpeak',
    order: 0,
    locale: OFFPEAK_NS,
    inject: injected,
  }, OffpeakDock))
}
