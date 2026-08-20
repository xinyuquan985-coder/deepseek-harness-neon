/** Pure workbench routing and current-Turn Tool evidence derivation. */
import type {
  ConversationSnapshot, ToolCallBlock, ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolChatData } from '@deepseek-ai/dsh-client-ui-conversation/client'

/** The three state-derived workbench presentations. */
export type WorkbenchKind = 'conversation' | 'code' | 'trajectory'

/** One current-Turn Tool lifecycle reduced to routing evidence. */
export interface WorkbenchToolActivity {
  readonly name: string
  readonly status: 'running' | 'settled'
  readonly callView: ToolCallBlock['callView']
  readonly resultView: ToolResultNode['resultView'] | null
}

/** One unique file changed by a real Tool node in the current Turn. */
export interface WorkbenchFileChange {
  readonly path: string
  readonly status: 'running' | 'settled'
  /** Null when the Tool exposes a location but no structured diff. */
  readonly additions: number | null
  /** Null when the Tool exposes a location but no structured diff. */
  readonly deletions: number | null
}

const LEGACY_CODE_TOOLS = new Set([
  'apply_patch',
  'bash',
  'edit',
  'filesystem_write',
  'fs_write',
  'pwsh',
  'run_code',
  'str_replace_editor',
  'terminal',
  'terminal_execute',
  'write',
])

/**
 * Decide whether current-Turn Tool evidence represents code execution or a
 * filesystem mutation. Structured presentation intent wins; the exact-name
 * fallback covers older logs without presentation metadata. Unknown Tools stay
 * conservative and do not force the code workbench.
 * @param tools - current-Turn Tool lifecycles.
 * @returns whether the Turn contains code activity.
 */
export function hasCodeActivity(tools: readonly WorkbenchToolActivity[]): boolean {
  return tools.some((tool) => {
    if (tool.callView?.card === 'terminal' || tool.callView?.card === 'diff') return true
    if (tool.resultView?.card === 'terminal' || tool.resultView?.card === 'diff') return true
    if (tool.callView?.card === 'generic') {
      const kind = tool.callView.kind
      if (kind === 'edit' || kind === 'delete' || kind === 'move' || kind === 'execute') return true
    }
    return LEGACY_CODE_TOOLS.has(tool.name)
  })
}

/**
 * Derive the presentation kind from real UI state.
 * @param input - active view and current-Turn code evidence.
 * @returns the selected workbench kind.
 */
export function deriveWorkbenchKind(input: {
  activeView: string
  currentTurnHasCodeMutation: boolean
}): WorkbenchKind {
  if (input.activeView === 'trajectory') return 'trajectory'
  return input.currentTurnHasCodeMutation ? 'code' : 'conversation'
}

function activityFor(block: ToolCallBlock): WorkbenchToolActivity {
  if ('kind' in block) {
    return {
      name: block.call?.name ?? block.callId,
      status: 'settled',
      callView: block.callView,
      resultView: block.resultView,
    }
  }
  return {
    name: block.name,
    status: 'running',
    callView: block.callView,
    resultView: null,
  }
}

function currentTurnToolBlocks(snapshot: ConversationSnapshot): readonly ToolCallBlock[] {
  const latestTurn = snapshot.chat.timeline.turnOrder.at(-1)
  if (latestTurn === undefined) return []
  const output: ToolCallBlock[] = []
  const append = (block: ToolCallBlock): void => {
    output.push(block)
    for (const child of block.subCalls) append(child)
  }
  for (const key of snapshot.chat.locations.getTurn(latestTurn)) {
    const node = snapshot.chat.nodes.get(key)
    if (node?.kind !== 'tool-call') continue
    append((node.data as ToolChatData).root)
  }
  return output
}

/**
 * Reduce only the latest Turn's assembled Tool nodes to routing evidence.
 * @param snapshot - current Conversation snapshot.
 * @returns root and nested Tool evidence in dispatch order.
 */
export function currentTurnToolActivity(snapshot: ConversationSnapshot): readonly WorkbenchToolActivity[] {
  const output: WorkbenchToolActivity[] = []
  for (const block of currentTurnToolBlocks(snapshot)) output.push(activityFor(block))
  return output
}

function contentLineCount(text: string): number {
  if (text === '') return 0
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n').length
}

interface MutableFileChange {
  path: string
  status: WorkbenchFileChange['status']
  additions: number | null
  deletions: number | null
}

function diffChanges(
  diffs: unknown,
  status: WorkbenchFileChange['status'],
): readonly MutableFileChange[] {
  if (!Array.isArray(diffs)) return []
  const order: MutableFileChange[] = []
  const byPath = new Map<string, MutableFileChange>()
  for (const raw of diffs) {
    if (typeof raw !== 'object' || raw === null) continue
    const { path, oldText, newText } = raw as Record<string, unknown>
    if (typeof path !== 'string' || (oldText !== null && typeof oldText !== 'string') || typeof newText !== 'string') continue
    let change = byPath.get(path)
    if (change === undefined) {
      change = { path, status, additions: 0, deletions: 0 }
      byPath.set(path, change)
      order.push(change)
    }
    change.additions = (change.additions ?? 0) + contentLineCount(newText)
    change.deletions = (change.deletions ?? 0) + (oldText === null ? 0 : contentLineCount(oldText))
  }
  return order
}

function changesForBlock(block: ToolCallBlock): readonly MutableFileChange[] {
  const status: WorkbenchFileChange['status'] = 'kind' in block ? 'settled' : 'running'
  if ('kind' in block && block.isError) return []
  const appliedDiff = 'kind' in block && block.resultView?.card === 'diff'
    ? block.resultView
    : block.callView?.card === 'diff'
      ? block.callView
      : null
  if (appliedDiff !== null) return diffChanges(appliedDiff.diffs, status)
  const call = block.callView
  if (call?.card !== 'generic' || call.kind !== 'edit' || !Array.isArray(call.locations)) return []
  const seen = new Set<string>()
  return call.locations.flatMap((location) => {
    if (typeof location?.path !== 'string' || seen.has(location.path)) return []
    seen.add(location.path)
    return [{ path: location.path, status, additions: null, deletions: null }]
  })
}

/**
 * Derive the current Turn's unique file ledger from Tool render intents only.
 * Assistant prose and raw result text are deliberately never inspected.
 * @param snapshot - current Conversation snapshot.
 * @returns first-seen paths with latest lifecycle and accumulated diff counts.
 */
export function currentTurnFileChanges(snapshot: ConversationSnapshot): readonly WorkbenchFileChange[] {
  const order: MutableFileChange[] = []
  const byPath = new Map<string, MutableFileChange>()
  for (const block of currentTurnToolBlocks(snapshot)) {
    for (const incoming of changesForBlock(block)) {
      const current = byPath.get(incoming.path)
      if (current === undefined) {
        const copy = { ...incoming }
        byPath.set(copy.path, copy)
        order.push(copy)
        continue
      }
      current.status = incoming.status
      if (incoming.additions !== null) current.additions = (current.additions ?? 0) + incoming.additions
      if (incoming.deletions !== null) current.deletions = (current.deletions ?? 0) + incoming.deletions
    }
  }
  return order
}
