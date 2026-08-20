/**
 * Browser debate VS view plugin: contribute the VS 对决 tab to the
 * conversation view ring (registration shape follows the official
 * ui-trajectory template — slots.inject around slots.register, pure
 * consumer), make the tab the session default for debate-host sessions, and
 * keep the sides' live transcripts — each side column polls its child's
 * transcript through the subagents history API; the fold rides the reserved
 * inject `hooks` compartment so the component reads it as `useSideTranscripts`.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: the 'conversation.view' SlotMap row (declared by the slot's
// owning package) must be in the program for the register call to type.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: the ctx.sessions Context merge (the runtime's session service)
// and the connection handle type for the interrupt/history calls.
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ObservableSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import { DebateVSView } from './DebateVSView.tsx'
import { EMPTY_SIDE_TRANSCRIPT, foldSideTranscript, type SideTranscript } from './debate-transcript.ts'

/** Required services: the slot ledger, the session navigation owner, and the wire handle. */
export const inject = ['slots', 'sessions', 'connection']

/** Agent preset ids whose sessions open on this view by default (the debate host preset). */
const DEFAULT_FOR_AGENT_PRESETS: readonly string[] = ['debate']

/** The view's own id in the conversation view ring. */
const VIEW_ID = 'debate-vs'

/** Transcript page size per child poll. */
const TRANSCRIPT_PAGE_MESSAGES = 80

/** Business face injected by the plugin for one session scope. */
export interface DebateVSInjected {
  /** Interrupt a running continuable child's current turn. */
  interruptSide: (childId: SessionId) => void
  /**
   * Refresh the transcript cells for the given children (the component drives
   * a polling cadence; each fold replaces the child's cell).
   */
  refreshSideTranscripts: (children: readonly SessionId[]) => void
  /** Registrant hooks compartment: bound to `useSideTranscripts` by the renderer. */
  hooks: {
    /** Live per-child transcript fold (empty cell for undispatched children). */
    sideTranscripts: ObservableSnapshot<Readonly<Record<string, SideTranscript>>>
  }
}

/**
 * Client plugin body: provide the view-default resolver (names this view for
 * debate-host sessions) and register the VS view tab. Both contributions
 * ride effects, so plugin unload removes them together.
 * @param ctx - client root context carrying slots, sessions, and connection.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.sessions.provide({
    props: ['viewDefaultFor'],
    resolve: () => ({
      props: {
        viewDefaultFor: (agentPreset: string | undefined): string | null =>
          agentPreset !== undefined && DEFAULT_FOR_AGENT_PRESETS.includes(agentPreset) ? VIEW_ID : null,
      },
    }),
  }), 'ui-debate-vs: view-default provider')

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: VIEW_ID,
    order: 5,
    label: () => 'VS 对决',
    inject: (sessionId: SessionId): DebateVSInjected => {
      const connection = ctx.get('connection') as ConnectionHandle
      let transcripts: Readonly<Record<string, SideTranscript>> = {}
      const listeners = new Set<() => void>()
      const source: ObservableSnapshot<Readonly<Record<string, SideTranscript>>> = {
        getSnapshot: () => transcripts,
        subscribe: (fn) => {
          listeners.add(fn)
          return () => { listeners.delete(fn) }
        },
      }
      return {
        interruptSide: (childId) => {
          void connection.api.subagents.interrupt({
            parentSessionId: sessionId,
            childSessionId: childId,
            mode: 'continuable',
          }).then((response) => {
            if (response.result.ok) void ctx.sessions.refreshSubagents(sessionId)
          }).catch(() => {
            // Interrupt failures surface through the child session's own stop path; nothing to restore here.
          })
        },
        refreshSideTranscripts: (children) => {
          void Promise.all(children.map(async (childId): Promise<SideTranscript | null> => {
            try {
              const response = await connection.api.subagents.history({
                parentSessionId: sessionId,
                childSessionId: childId,
                mode: 'continuable',
                maxMessages: TRANSCRIPT_PAGE_MESSAGES,
              })
              return response.result.ok ? foldSideTranscript(response.result.value.events) : null
            } catch {
              return null
            }
          })).then((folds) => {
            const next: Record<string, SideTranscript> = {}
            children.forEach((childId, index) => {
              next[childId] = folds[index] ?? transcripts[childId] ?? EMPTY_SIDE_TRANSCRIPT
            })
            transcripts = next
            for (const listener of listeners) listener()
          })
        },
        hooks: { sideTranscripts: source },
      }
    },
  }, DebateVSView))
}
