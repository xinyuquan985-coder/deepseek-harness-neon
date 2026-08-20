// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ConversationNode, ConversationSnapshot, PartialAssistant, PendingInteraction, SessionId, SessionListState,
  SubagentCatalogSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import { apply } from '../src/client/index.ts'
import { DebateVSView, type DebateVSViewProps } from '../src/client/DebateVSView.tsx'
import type { SideTranscript } from '../src/client/debate-transcript.ts'

afterEach(() => { cleanup() })

const SCOREBOARD_1 = '# ⚔️ 第 1 回合：立论\n\n| | 正方 🟦 | 反方 🟥 |\n| --- | --- | --- |\n| 核心论点 | 证据 A | 证据 B |'
const VERDICT = '## 判决牌\n\n获胜方：正方'
const HOST_REPLY = '收到，反方开始质询。'

function snapshot(
  nodes: readonly ConversationNode[],
  partial: PartialAssistant | null,
  pending: readonly PendingInteraction[] = [],
): ConversationSnapshot {
  return {
    sessionId: 's1',
    nodes,
    partial,
    runningCalls: [],
    running: false,
    removed: false,
    composerPhase: 'active',
    blank: false,
    pending,
  } as unknown as ConversationSnapshot
}

function listState(catalog: SubagentCatalogSnapshot | undefined): SessionListState {
  return {
    ids: ['s1'],
    byId: {},
    current: 's1',
    phase: 'ready',
    state: 'idle',
    error: null,
    subagentsByParent: catalog === undefined ? {} : { s1: catalog },
    jobsBySession: {},
  } as unknown as SessionListState
}

function catalog(): SubagentCatalogSnapshot {
  return {
    entries: [
      { kind: 'child', id: 'aff' as SessionId, activity: 'running', hasChildren: false, mode: 'continuable', label: '派出正方辩手' },
      { kind: 'child', id: 'neg' as SessionId, activity: 'inactive', hasChildren: false, mode: 'continuable', label: '派出反方辩手' },
      { kind: 'child', id: 'judge' as SessionId, activity: 'inactive', hasChildren: false, mode: 'continuable', label: '派出裁判' },
    ],
    parentAvailable: true,
    state: 'ready',
    error: null,
  }
}

function props(
  live: ConversationSnapshot,
  list: SessionListState,
  interruptSide: (childId: SessionId) => void = () => {},
  transcripts: Readonly<Record<string, SideTranscript>> = {},
  projections: Record<string, unknown> = {},
): DebateVSViewProps {
  return {
    sessionId: 's1' as SessionId,
    useSession: (selector: (value: ConversationSnapshot) => unknown) => selector(live),
    useSessions: (selector: (value: SessionListState) => unknown) => selector(list),
    useSideTranscripts: (selector: (value: Readonly<Record<string, SideTranscript>>) => unknown) => selector(transcripts),
    useProjection: (key: string, selector?: (value: unknown) => unknown) =>
      selector === undefined ? projections[key] : selector(projections[key]),
    interruptSide,
    refreshSideTranscripts: () => {},
  } as unknown as DebateVSViewProps
}

const questionGate = (): PendingInteraction => ({ kind: 'question', id: 'q1' } as unknown as PendingInteraction)

describe('apply', () => {
  it('provides the debate view default and registers the VS view tab with interrupt/transcript callbacks', async () => {
    const provide = vi.fn((_descriptor: object) => () => {})
    const refreshSubagents = vi.fn()
    const interrupt = vi.fn(() => Promise.resolve({ result: { ok: true } }))
    const history = vi.fn(() => Promise.resolve({
      result: {
        ok: true,
        value: {
          events: [
            { event: { type: 'user/message', data: { content: [{ type: 'text', text: '正方，请立论。' }] } } },
            { event: { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: '我方立论：第一，…' }] } } } },
          ],
          hasMore: false,
        },
      },
    }))
    const register = vi.fn((_options: object, _component: unknown) => () => {})
    const inject = vi.fn((_name: string, contribute: () => void) => { contribute() })
    const connection = { api: { subagents: { interrupt, history } } }
    const ctx = {
      effect: (fn: () => (() => void) | undefined) => { const dispose = fn(); if (dispose !== undefined) dispose() },
      sessions: { provide, refreshSubagents },
      slots: { inject, register },
      get: (name: string) => (name === 'connection' ? connection : undefined),
    }
    apply(ctx as never)

    expect(provide).toHaveBeenCalledTimes(1)
    const descriptor = provide.mock.calls[0]?.[0] as {
      props: string[]
      resolve: () => { props: { viewDefaultFor: (agentPreset: string | undefined) => string | null } }
    }
    expect(descriptor.props).toEqual(['viewDefaultFor'])
    const { viewDefaultFor } = descriptor.resolve().props
    expect(viewDefaultFor('debate')).toBe('debate-vs')
    expect(viewDefaultFor('standard')).toBeNull()
    expect(viewDefaultFor(undefined)).toBeNull()

    expect(inject).toHaveBeenCalledWith('conversation.view', expect.any(Function))
    expect(register).toHaveBeenCalledTimes(1)
    const call = register.mock.calls[0]
    if (call === undefined) throw new Error('expected the VS view tab to be registered')
    const options = call[0] as {
      id: string
      label: () => string
      inject: (sessionId: SessionId) => {
        interruptSide: (childId: SessionId) => void
        refreshSideTranscripts: (children: readonly SessionId[]) => void
        hooks: { sideTranscripts: { getSnapshot: () => Readonly<Record<string, SideTranscript>> } }
      }
    }
    expect(options.id).toBe('debate-vs')
    expect(options.label()).toBe('VS 对决')
    const face = options.inject('s1' as SessionId)
    face.interruptSide('aff' as SessionId)
    expect(interrupt).toHaveBeenCalledWith({
      parentSessionId: 's1', childSessionId: 'aff', mode: 'continuable',
    })
    await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
    expect(refreshSubagents).toHaveBeenCalledWith('s1')

    expect(face.hooks.sideTranscripts.getSnapshot()).toEqual({})
    face.refreshSideTranscripts(['aff' as SessionId])
    await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
    expect(history).toHaveBeenCalledWith({
      parentSessionId: 's1', childSessionId: 'aff', mode: 'continuable', maxMessages: 80,
    })
    // Instructions are plumbing: the fold keeps only the child's speeches.
    expect(face.hooks.sideTranscripts.getSnapshot()['aff']?.lines).toEqual([
      { text: '我方立论：第一，…' },
    ])
  })
})

describe('DebateVSView', () => {
  it('renders the live board: topic, sides, round, scoreboard, host lane, and verdict', () => {
    const live = snapshot([
      { kind: 'user', seq: 1, time: 1, content: [{ type: 'text', text: '辩题：该不该用 DeepSeek Harness？' }], source: null },
      { kind: 'assistant', seq: 2, time: 2, turn: 1, step: 1, blocks: [{ kind: 'text', text: SCOREBOARD_1 }] },
      { kind: 'assistant', seq: 3, time: 3, turn: 1, step: 1, blocks: [{ kind: 'text', text: HOST_REPLY }] },
      { kind: 'assistant', seq: 4, time: 4, turn: 1, step: 1, blocks: [{ kind: 'text', text: VERDICT }] },
    ] as unknown as ConversationNode[], null)
    render(<DebateVSView {...props(live, listState(catalog()))} />)

    expect(screen.getByText('辩题：该不该用 DeepSeek Harness？')).toBeTruthy()
    expect(screen.getAllByText('已裁决').length).toBeGreaterThan(0)
    expect(screen.getByText('正方')).toBeTruthy()
    expect(screen.getByText('反方')).toBeTruthy()
    expect(screen.getByText('裁判席')).toBeTruthy()
    expect(screen.getByText('进行中')).toBeTruthy()
    expect(screen.getAllByText('已结束')).toHaveLength(2)
    expect(screen.getByText('⚔️ 第 1 回合：立论')).toBeTruthy()
    expect(screen.getByText(HOST_REPLY)).toBeTruthy()
    // All host output lives INSIDE the 主持台 box, never floating below it.
    const hostSeat = [...document.querySelectorAll('[data-session-id] div, [data-session-id] section')]
      .find(el => (el.className ?? '').toString().includes('hostSeat'))
    expect(hostSeat?.textContent).toContain('⚔️ 第 1 回合：立论')
    expect(hostSeat?.textContent).toContain(HOST_REPLY)
    expect(screen.getByText('获胜方：正方')).toBeTruthy()
  })

  it('shows each side as a speech column: debate content only, never instructions', () => {
    const live = snapshot([], null)
    const transcripts: Record<string, SideTranscript> = {
      aff: { lines: [{ text: '我方立论：第一，…' }] },
      neg: { lines: [{ text: '反方反驳：证据 A 无效。' }] },
    }
    render(<DebateVSView {...props(live, listState(catalog()), () => {}, transcripts)} />)

    expect(screen.getByText('我方立论：第一，…')).toBeTruthy()
    expect(screen.getByText('反方反驳：证据 A 无效。')).toBeTruthy()
    expect(screen.queryByText('主持人指令')).toBeNull()
    // Each speech renders INSIDE its own column, never in the other one.
    const columns = [...document.querySelectorAll('[data-session-id] div')]
      .filter(el => (el.className ?? '').toString().includes('sideCard'))
    expect(columns[0]?.textContent).toContain('我方立论：第一，…')
    expect(columns[0]?.textContent).not.toContain('反方反驳')
    expect(columns[1]?.textContent).toContain('反方反驳：证据 A 无效。')
    expect(columns[1]?.textContent).not.toContain('我方立论')
  })

  it('renders the host round checklist as the phase strip with the current phase highlighted', () => {
    const live = snapshot([], null)
    const phases = [
      { content: '第 1 回合：立论（正方反方各发言，各 ≥3 论点）', status: 'completed' },
      { content: '第 2 回合：质询 A（反方质询正方）', status: 'in_progress' },
      { content: '第 3 回合：质询 B（正方质询反方）', status: 'pending' },
    ]
    render(<DebateVSView {...props(live, listState(catalog()), () => {}, {}, { todos: phases })} />)

    expect(screen.getByText(/第 1 回合：立论/)).toBeTruthy()
    const current = screen.getByText(/第 2 回合：质询 A/).closest('li')
    expect(current?.getAttribute('data-status')).toBe('in_progress')
    expect(screen.getByText(/第 3 回合：质询 B/).closest('li')?.getAttribute('data-status')).toBe('pending')
  })

  it('shows the audience gate banner while the host waits for round confirmation', () => {
    const live = snapshot([], null, [questionGate()])
    render(<DebateVSView {...props(live, listState(catalog()))} />)

    expect(screen.getByRole('status').textContent).toContain('观众确认后开启下一回合')
  })

  it('shows the idle state and 待裁决 before the debate starts', () => {
    const live = snapshot([], null)
    render(<DebateVSView {...props(live, listState(undefined))} />)

    expect(screen.getByText('辩题待定')).toBeTruthy()
    expect(screen.getAllByText('第 1 回合').length).toBeGreaterThan(0)
    expect(screen.getByText(/等待开赛/)).toBeTruthy()
    expect(screen.getByText('待裁决')).toBeTruthy()
    expect(screen.getAllByText('未派出')).toHaveLength(3)
    expect(screen.getAllByText('主持人尚未派出')).toHaveLength(2)
  })

  it('offers 终止 on a running continuable side and interrupts only that side', () => {
    const interruptSide = vi.fn()
    const live = snapshot([], null)
    render(<DebateVSView {...props(live, listState(catalog()), interruptSide)} />)

    const interrupt = screen.getByRole('button', { name: '终止' })
    fireEvent.click(interrupt)
    expect(interruptSide).toHaveBeenCalledWith('aff')
    expect(screen.getAllByRole('button', { name: '终止' })).toHaveLength(1)
  })

  it('offers no 终止 for settled or undispatched sides', () => {
    const live = snapshot([], null)
    const rosters = catalog()
    rosters.entries = rosters.entries.map(entry =>
      entry.kind === 'child' ? { ...entry, activity: 'inactive' } : entry)
    render(<DebateVSView {...props(live, listState(rosters))} />)

    expect(screen.queryByRole('button', { name: '终止' })).toBeNull()
  })

  it('folds the streaming partial as the newest scoreboard', () => {
    const live = snapshot([
      { kind: 'user', seq: 1, time: 1, content: [{ type: 'text', text: '辩题' }], source: null },
      { kind: 'assistant', seq: 2, time: 2, turn: 1, step: 1, blocks: [{ kind: 'text', text: SCOREBOARD_1 }] },
    ] as unknown as ConversationNode[], {
      turn: 2,
      step: 1,
      blocks: [{ kind: 'text', text: '# ⚔️ 第 2 回合：质询 A\n反方质询正方一个关于证据 A 的问题。' }],
    })
    render(<DebateVSView {...props(live, listState(catalog()))} />)

    expect(screen.getAllByText('第 2 回合').length).toBeGreaterThan(0)
    expect(screen.getAllByText('⚔️ 第 2 回合：质询 A').length).toBeGreaterThan(0)
  })
})
