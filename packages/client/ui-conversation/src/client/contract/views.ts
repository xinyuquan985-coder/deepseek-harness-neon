/** Shared conversation view, selection, and store-state contracts. */

/** Tool call identity as carried on the wire (branded upstream in connection). */
export type CallId = string

/** Selection target for the details linkage channel (toolcall is the step special case). */
export interface SelectionTarget { turnSeq: number; stepSeq?: number; callId?: CallId; toolName?: string }

/**
 * One conversation view tab, projected from a 'conversation.view' slot
 * entry's registration options (label falls back to the entry id).
 */
export interface ViewTab { id: string; label: string }

/** Stable default view id; null selections and unknown ids fall back here. */
export const DEFAULT_VIEW_ID = 'chat'

/**
 * Resolve the active view tab. A user-picked view (`viewPicked`) wins
 * unconditionally; otherwise an optional view-default resolver (a
 * provide-channel contribution, e.g. the debate view naming itself the
 * default for sessions of its agent preset) runs against the session's agent
 * preset id — so a persisted chat pick recorded before the default view
 * existed does not pin the session to chat. Any request that names no
 * registered tab falls back to the stable Chat view.
 * @param tabs - registered view tabs.
 * @param selectedId - persisted selection (null = never picked).
 * @param viewDefaultFor - optional resolver naming the default view id for a preset.
 * @param agentPreset - the session's agent preset id.
 * @param viewPicked - whether the user has picked a tab for this session.
 * @returns the active tab, or undefined when no tab is registered.
 */
export function resolveActiveView(
  tabs: readonly ViewTab[],
  selectedId: string | null,
  viewDefaultFor?: (agentPreset: string | undefined) => string | null,
  agentPreset?: string,
  viewPicked = false,
): ViewTab | undefined {
  const resolverDefault = viewDefaultFor?.(agentPreset) ?? null
  const requestedId = viewPicked && selectedId !== null
    ? selectedId
    : resolverDefault ?? selectedId ?? DEFAULT_VIEW_ID
  return tabs.find(view => view.id === requestedId) ?? tabs.find(view => view.id === DEFAULT_VIEW_ID)
}

/**
 * Per-session state shared by conversation, chat-view, and details slots.
 * Unknown persisted view ids fall back to the stable Chat view.
 */
export interface ChatStoreState {
  /** Details-linkage channel (conversation writes, details reads). */
  selection: SelectionTarget | null
  /** Composer draft (persisted; survives session switches and reloads). */
  draft: string
  /** Active conversation view id ('conversation.view' entry id); null falls back to Chat. */
  view: string | null
  /**
   * Set the moment the user picks a tab. Until then a preset default view may
   * own the session (a persisted chat pick recorded before the default view
   * existed does not count as a pick). Read with `?? false` — persisted
   * snapshots from before this field rehydrate without it.
   */
  viewPicked: boolean
  /**
   * One-shot inspect handoff: chat writes the call to reveal, the trajectory
   * view consumes it and acknowledges by clearing. Read with `?? null` —
   * persisted snapshots from before this field rehydrate without it.
   */
  inspect: { callId: CallId } | null
}
