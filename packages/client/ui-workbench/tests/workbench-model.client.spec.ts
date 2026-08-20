import { describe, expect, it } from 'vitest'
import type { ConversationSnapshot, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import {
  currentTurnFileChanges,
  deriveWorkbenchKind,
  hasCodeActivity,
  type WorkbenchToolActivity,
} from '../src/client/workbench-model.ts'

const activity = (
  name: string,
  options: Partial<WorkbenchToolActivity> = {},
): WorkbenchToolActivity => ({
  name,
  status: 'settled',
  callView: null,
  resultView: null,
  ...options,
})

describe('deriveWorkbenchKind', () => {
  it('gives trajectory precedence over code activity', () => {
    expect(deriveWorkbenchKind({
      activeView: 'trajectory',
      currentTurnHasCodeMutation: true,
    })).toBe('trajectory')
  })

  it('selects code only for current-turn code activity', () => {
    expect(deriveWorkbenchKind({ activeView: 'chat', currentTurnHasCodeMutation: true })).toBe('code')
    expect(deriveWorkbenchKind({ activeView: 'chat', currentTurnHasCodeMutation: false })).toBe('conversation')
  })
})

describe('hasCodeActivity', () => {
  it('recognizes diff, terminal, edit, and execute presentation intents', () => {
    expect(hasCodeActivity([
      activity('write', { callView: { card: 'diff', title: 'Write x', diffs: [] } }),
    ])).toBe(true)
    expect(hasCodeActivity([
      activity('bash', { resultView: { card: 'terminal', output: 'ok' } }),
    ])).toBe(true)
    expect(hasCodeActivity([
      activity('editor', { callView: { card: 'generic', title: 'Edit x', kind: 'edit' } }),
    ])).toBe(true)
    expect(hasCodeActivity([
      activity('runtime', { callView: { card: 'generic', title: 'Run code', kind: 'execute' } }),
    ])).toBe(true)
  })

  it('recognizes a running terminal or code-runtime call', () => {
    expect(hasCodeActivity([
      activity('bash', { status: 'running', callView: { card: 'terminal', title: 'pnpm test' } }),
    ])).toBe(true)
    expect(hasCodeActivity([activity('run_code', { status: 'running' })])).toBe(true)
  })

  it('keeps read and search activity in conversation', () => {
    expect(hasCodeActivity([
      activity('read', { resultView: { card: 'read', path: 'a.ts', offset: 1, lines: [], totalLines: 0 } }),
      activity('search', { resultView: { card: 'search', shape: 'paths', paths: [], truncated: false, total: 0 } }),
    ])).toBe(false)
  })

  it('keeps unknown tools and an empty current turn in conversation', () => {
    expect(hasCodeActivity([activity('future_unknown_tool')])).toBe(false)
    expect(hasCodeActivity([])).toBe(false)
  })
})

function snapshotWithTools(...roots: readonly ToolCallBlock[]): ConversationSnapshot {
  const turn = { turn: 7, steps: [], status: 'open', data: new Map() }
  const nodes = roots.map((root, index) => ({
    key: `tool-call:${root.callId}`,
    kind: 'tool-call',
    id: root.callId,
    target: 'chat',
    anchorSeq: index + 1,
    location: { kind: 'turn', turn: 7 },
    visibility: 'visible',
    data: { root },
  }))
  return {
    chat: {
      order: nodes.map(node => node.key),
      nodes: {
        get: (key: string) => nodes.find(node => node.key === key),
        values: () => nodes,
      },
      locations: {
        getTurn: () => nodes.map(node => node.key),
        getStep: () => nodes.map(node => node.key),
      },
      timeline: { turnOrder: [7], turns: new Map([[7, turn]]) },
      legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls: [] },
    },
  } as unknown as ConversationSnapshot
}

describe('currentTurnFileChanges', () => {
  it('derives unique paths, lifecycle and available +/- counts from actual tool nodes', () => {
    const running: ToolCallBlock = {
      callId: 'running', name: 'write', argsRaw: '{}', turn: 7, step: 1, time: 1,
      callView: {
        card: 'diff', title: 'Write running.ts',
        diffs: [{ path: 'src/running.ts', oldText: 'old', newText: 'new\nline' }],
      },
      subCalls: [],
    }
    const settled: ToolCallBlock = {
      kind: 'tool-result', seq: 4, time: 4, callId: 'settled',
      call: { name: 'edit', argsRaw: '{}' }, callTime: 2, content: [], isError: false,
      callView: { card: 'diff', title: 'Edit done.ts', diffs: [] },
      resultView: {
        card: 'diff', diffs: [
          { path: 'src/done.ts', oldText: 'a\nb', newText: 'c' },
          { path: 'src/done.ts', oldText: 'd', newText: 'e\nf' },
        ],
      },
      subCalls: [],
    }
    const locationOnly: ToolCallBlock = {
      kind: 'tool-result', seq: 5, time: 5, callId: 'location',
      call: { name: 'editor', argsRaw: '{}' }, callTime: 3, content: [], isError: false,
      callView: {
        card: 'generic', title: 'Edit config', kind: 'edit',
        locations: [{ path: 'src/config.ts' }, { path: 'src/config.ts' }],
      },
      resultView: { card: 'generic' },
      subCalls: [],
    }

    expect(currentTurnFileChanges(snapshotWithTools(running, settled, locationOnly))).toEqual([
      { path: 'src/running.ts', status: 'running', additions: 2, deletions: 1 },
      { path: 'src/done.ts', status: 'settled', additions: 3, deletions: 3 },
      { path: 'src/config.ts', status: 'settled', additions: null, deletions: null },
    ])
  })

  it('ignores reads, searches and failed mutations instead of parsing their prose', () => {
    const read: ToolCallBlock = {
      kind: 'tool-result', seq: 1, time: 1, callId: 'read',
      call: { name: 'read', argsRaw: '{}' }, callTime: 1, content: [{ type: 'text', text: 'edited fake.ts' }], isError: false,
      callView: { card: 'generic', title: 'Read', kind: 'read', locations: [{ path: 'src/read.ts' }] },
      resultView: { card: 'read', path: 'src/read.ts', offset: 1, lines: [], totalLines: 0 },
      subCalls: [],
    }
    const failed: ToolCallBlock = {
      kind: 'tool-result', seq: 2, time: 2, callId: 'failed',
      call: { name: 'write', argsRaw: '{}' }, callTime: 1, content: [{ type: 'text', text: 'failed.ts' }], isError: true,
      callView: {
        card: 'diff', title: 'Write failed.ts',
        diffs: [{ path: 'src/failed.ts', oldText: null, newText: 'nope' }],
      },
      resultView: { card: 'generic' },
      subCalls: [],
    }
    expect(currentTurnFileChanges(snapshotWithTools(read, failed))).toEqual([])
  })
})
