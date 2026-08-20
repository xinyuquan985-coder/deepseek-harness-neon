/** Browser entry: fill the conversation details overview with the state-derived workbench. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import {
  resolveWorkspacePath, type ClientContext, type SessionId, type SubagentAddress,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import {
  WorkbenchInspector, type WorkbenchInspectorInjected,
} from './WorkbenchInspector.tsx'
import { en, zh } from './locales.ts'

const NS = 'workbench'

/** Required services: slot/locale plus the existing navigation and Host action faces. */
export const inject = ['slots', 'locale', 'sessions', 'workspaces', 'connection', 'layout']

/**
 * Register the workbench locale and overview entry.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workbench: dictionaries')
  // The A/B/C mission-control rail is part of the installed workbench shell,
  // so its initial preference is open. The ordinary close action remains
  // authoritative afterward; this initialization runs only at plugin mount.
  ctx.layout.openDetails()
  const sessions = ctx.sessions
  const workspaces = ctx.workspaces
  const connection = ctx.get('connection') as ConnectionHandle
  const actions = (sessionId: SessionId): WorkbenchInspectorInjected => ({
    openChild(address: SubagentAddress) {
      sessions.openSubagent(address)
    },
    interruptChild(address: Extract<SubagentAddress, { mode: 'continuable' }>) {
      void connection.api.subagents.interrupt(address).then((response) => {
        if (response.result.ok) void sessions.refreshSubagents(address.parentSessionId)
      }).catch(() => {
        // The row remains driven by the Host catalog; a failed interrupt does
        // not synthesize a local lifecycle transition.
      })
    },
    openFile(path: string) {
      const cwd = sessions.list.getSnapshot().byId[sessionId]?.cwd
      void workspaces.openPath(resolveWorkspacePath(cwd, path)).catch(() => {
        // Native opener failures surface at the Host boundary.
      })
    },
  })
  ctx.slots.inject('conversation.details.overview', () => ctx.slots.register({
    name: 'conversation.details.overview',
    locale: NS,
    inject: actions,
  }, WorkbenchInspector))
}
