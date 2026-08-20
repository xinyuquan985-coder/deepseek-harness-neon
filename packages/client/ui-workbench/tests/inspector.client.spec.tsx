// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ConversationSnapshot, SessionId, SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  WorkbenchInspector,
  type WorkbenchInspectorProps,
} from '../src/client/WorkbenchInspector.tsx'
import { zh } from '../src/client/locales.ts'

const SID = 'workbench-session' as SessionId

afterEach(cleanup)

function props(options: {
  activeView?: string
  snapshot?: Partial<ConversationSnapshot>
  list?: Partial<SessionListState>
  projections?: Record<string, unknown>
  openChild?: (address: unknown) => void
  interruptChild?: (address: unknown) => void
  openFile?: (path: string) => void
} = {}): WorkbenchInspectorProps {
  const snapshot = {
    queue: [],
    pending: [],
    running: false,
    chat: {
      order: [],
      nodes: { get: () => undefined, values: () => [] },
      locations: { getTurn: () => [], getStep: () => [] },
      timeline: { turnOrder: [], turns: new Map() },
      legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls: [] },
    },
    ...options.snapshot,
  } as unknown as ConversationSnapshot
  const list = {
    subagentsByParent: {},
    jobsBySession: {},
    ...options.list,
  } as unknown as SessionListState
  return {
    activeView: options.activeView ?? 'chat',
    sessionId: SID,
    useSession: selector => selector(snapshot),
    useSessions: selector => selector(list),
    useWorkspaces: (() => undefined) as WorkbenchInspectorProps['useWorkspaces'],
    useProjection: ((key: string, selector?: (value: unknown) => unknown) => {
      const value = options.projections?.[key]
      return selector === undefined ? value : selector(value)
    }) as WorkbenchInspectorProps['useProjection'],
    useInput: (() => { throw new Error('unused') }) as WorkbenchInspectorProps['useInput'],
    inputActions: {
      setDraft: () => {},
      addImages: () => true,
      removeImage: () => {},
      pruneImages: () => {},
      submit: () => {},
    },
    t: ((key: string, params?: Record<string, unknown>) => {
      let value = (zh as Record<string, string>)[key] ?? key
      for (const [name, replacement] of Object.entries(params ?? {})) {
        value = value.replaceAll(`{${name}}`, String(replacement))
      }
      return value
    }) as WorkbenchInspectorProps['t'],
    openChild: options.openChild ?? (() => {}),
    interruptChild: options.interruptChild ?? (() => {}),
    openFile: options.openFile ?? (() => {}),
  } as WorkbenchInspectorProps
}

describe('WorkbenchInspector', () => {
  it('renders conversation counts from real session and list projections', () => {
    render(<WorkbenchInspector {...props({
      snapshot: {
        queue: [{ id: 'q1', messageId: 'm1', placement: 'queued', content: [], preview: 'queued', text: 'queued' }] as never,
      },
      list: {
        jobsBySession: { [SID]: [
          { id: 'j1', kind: 'bash', label: 'one', status: 'running', startedAt: 1 },
          { id: 'j2', kind: 'bash', label: 'two', status: 'completed', startedAt: 1, finishedAt: 2 },
        ] } as never,
        subagentsByParent: { [SID]: {
          state: 'ready', error: null, parentAvailable: true, entries: [
            { kind: 'child', id: 'c1', activity: 'running', hasChildren: false, mode: 'continuable', label: 'one' },
            { kind: 'child', id: 'c2', activity: 'inactive', hasChildren: false, mode: 'one-shot', label: 'two' },
          ],
        } } as never,
      },
    })} />)

    const root = screen.getByTestId('workbench-inspector')
    expect(root.getAttribute('data-workbench-kind')).toBe('conversation')
    expect(document.body.dataset.workbenchKind).toBe('conversation')
    expect(screen.getByText('任务控制栏')).toBeTruthy()
    expect(within(screen.getByTestId('workbench-section-queue')).getByText('1')).toBeTruthy()
    expect(within(screen.getByTestId('workbench-section-jobs')).getByText('2')).toBeTruthy()
    expect(within(screen.getByTestId('workbench-section-subagents')).getByText('2')).toBeTruthy()
  })

  it('collapses sections with no real rows', () => {
    render(<WorkbenchInspector {...props()} />)
    expect(screen.queryByText('队列')).toBeNull()
    expect(screen.queryByText('后台任务')).toBeNull()
    expect(screen.queryByText('子代理')).toBeNull()
    expect(screen.queryByText('待处理交互')).toBeNull()
  })

  it('renders A mission control from goal, todo, job, subagent and deliverable facts', () => {
    const turn = {
      turn: 1,
      steps: [],
      status: 'closed',
      data: new Map([['deliverables', { produced: [
        { seq: 4, path: 'src/console.tsx' },
        { seq: 5, path: 'docs/console.md' },
      ] }]]),
    }
    const openChild = vi.fn()
    const interruptChild = vi.fn()
    const openFile = vi.fn()
    render(<WorkbenchInspector {...props({
      projections: {
        goal: {
          goal: {
            id: 'goal-1', revision: 1, objective: '完成赛博朋克三工作台',
            phase: 'active', maxGoalRounds: 16,
          },
          roundsStarted: 3, createdAt: 1, updatedAt: 2,
        },
        todos: [
          { content: '搭建任务控制栏', status: 'completed' },
          { content: '校准会话工作台', status: 'in_progress' },
          { content: '完成响应式验收', status: 'pending' },
        ],
      },
      snapshot: {
        chat: {
          order: [],
          nodes: { get: () => undefined, values: () => [] },
          locations: { getTurn: () => [], getStep: () => [] },
          timeline: { turnOrder: [1], turns: new Map([[1, turn]]) },
          legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls: [] },
        } as never,
      },
      list: {
        jobsBySession: { [SID]: [
          { id: 'bash-1', kind: 'bash', label: '运行组件测试', status: 'running', startedAt: 1 },
          { id: 'bash-2', kind: 'bash', label: '构建 Web 前端', status: 'completed', startedAt: 1, finishedAt: 2 },
        ] } as never,
        subagentsByParent: { [SID]: {
          state: 'ready', error: null, parentAvailable: true, entries: [
            { kind: 'child', id: 'child-1', activity: 'running', hasChildren: false, mode: 'continuable', label: '界面校准' },
            { kind: 'child', id: 'child-2', activity: 'inactive', hasChildren: false, mode: 'one-shot', label: '规范核对' },
          ],
        } } as never,
      },
      openChild,
      interruptChild,
      openFile,
    })} />)

    const goal = screen.getByTestId('workbench-section-goal')
    expect(within(goal).getByText('完成赛博朋克三工作台')).toBeTruthy()
    expect(within(goal).getByText('执行中')).toBeTruthy()

    const todos = screen.getByTestId('workbench-section-todos')
    expect(todos.getAttribute('data-count')).toBe('3')
    expect(within(todos).getByText('1 / 3 已完成')).toBeTruthy()
    expect(within(todos).getByText('正在处理')).toBeTruthy()

    const jobs = screen.getByTestId('workbench-section-jobs')
    expect(jobs.getAttribute('data-count')).toBe('2')
    expect(within(jobs).getByText('运行组件测试')).toBeTruthy()
    expect(within(jobs).getByText('运行中')).toBeTruthy()
    expect(within(jobs).getByText('已完成')).toBeTruthy()

    const subagents = screen.getByTestId('workbench-section-subagents')
    expect(subagents.getAttribute('data-count')).toBe('2')
    expect(within(subagents).getByText('界面校准')).toBeTruthy()
    expect(within(subagents).getByText('活跃')).toBeTruthy()
    expect(within(subagents).getByText('空闲')).toBeTruthy()
    fireEvent.click(within(subagents).getByRole('button', { name: '打开 界面校准' }))
    expect(openChild).toHaveBeenCalledWith(expect.objectContaining({ childSessionId: 'child-1' }))
    fireEvent.click(within(subagents).getByRole('button', { name: '停止 界面校准' }))
    expect(interruptChild).toHaveBeenCalledWith(expect.objectContaining({ childSessionId: 'child-1' }))

    const deliverables = screen.getByTestId('workbench-section-deliverables')
    expect(deliverables.getAttribute('data-count')).toBe('2')
    fireEvent.click(within(deliverables).getByRole('button', { name: '打开文件 src/console.tsx' }))
    expect(openFile).toHaveBeenCalledWith('src/console.tsx')
  })

  it('renders debate-side subagents as affirmative, negative and judge portrait cards', () => {
    render(<WorkbenchInspector {...props({
      activeView: 'debate-vs',
      list: {
        subagentsByParent: { [SID]: {
          state: 'ready', error: null, parentAvailable: true, entries: [
            { kind: 'child', id: 'affirmative', activity: 'inactive', hasChildren: false, mode: 'continuable', label: '派出正方辩手立论' },
            { kind: 'child', id: 'negative', activity: 'inactive', hasChildren: false, mode: 'continuable', label: '派出反方辩手立论' },
            { kind: 'child', id: 'judge', activity: 'inactive', hasChildren: false, mode: 'continuable', label: '派出裁判待命' },
          ],
        } } as never,
      },
    })} />)

    const root = screen.getByTestId('workbench-inspector')
    expect(root.getAttribute('data-workbench-view')).toBe('debate-vs')
    const subagents = screen.getByTestId('workbench-section-subagents')
    expect(subagents.querySelectorAll('[data-collaboration-agent-frame]')).toHaveLength(3)
    expect([...subagents.querySelectorAll('[data-collaboration-agent-portrait]')]
      .map(node => node.getAttribute('data-collaboration-agent-portrait')))
      .toEqual(['debate-affirmative', 'debate-negative', 'debate-judge'])
    expect(within(subagents).getByText('正方辩手')).toBeTruthy()
    expect(within(subagents).getByText('反方辩手')).toBeTruthy()
    expect(within(subagents).getByText('裁判代理')).toBeTruthy()
  })

  it('keeps trajectory authoritative even when the current turn executes code', () => {
    const turn = { turn: 1, steps: [], status: 'open', data: { get: () => undefined } }
    const rootCall = {
      callId: 'call-1', name: 'bash', argsRaw: '{}', turn: 1, step: 1, time: 1,
      callView: { card: 'terminal', title: 'pnpm test' }, subCalls: [],
    }
    const node = {
      key: 'tool-call:call-1', kind: 'tool-call', id: 'call-1', target: 'chat', anchorSeq: 2,
      location: { kind: 'turn', turn }, visibility: 'visible', data: { root: rootCall },
    }
    render(<WorkbenchInspector {...props({
      activeView: 'trajectory',
      snapshot: {
        chat: {
          order: [node.key],
          nodes: { get: (key: string) => key === node.key ? node : undefined, values: () => [node] },
          locations: { getTurn: () => [node.key], getStep: () => [] },
          timeline: { turnOrder: [1], turns: new Map([[1, turn]]) },
          legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls: [] },
        } as never,
      },
    })} />)
    expect(screen.getByTestId('workbench-inspector').getAttribute('data-workbench-kind')).toBe('trajectory')
    expect(document.body.dataset.workbenchKind).toBe('trajectory')
  })

  it('renders B current-turn changes with only real All, Modified and Produced entries', () => {
    const turn = {
      turn: 2,
      steps: [],
      status: 'closed',
      data: new Map([['deliverables', { produced: [
        { seq: 4, path: 'src/shared.ts' },
        { seq: 5, path: 'dist/report.json' },
      ] }]]),
    }
    const rootCall = {
      kind: 'tool-result', seq: 4, time: 4, callId: 'edit-1',
      call: { name: 'edit', argsRaw: '{}' }, callTime: 2, content: [], isError: false,
      callView: { card: 'diff', title: 'Edit', diffs: [] },
      resultView: { card: 'diff', diffs: [
        { path: 'src/shared.ts', oldText: 'old', newText: 'new\nline' },
        { path: 'src/modified-only.ts', oldText: 'before', newText: 'after' },
      ] },
      subCalls: [],
    }
    const node = {
      key: 'tool-call:edit-1', kind: 'tool-call', id: 'edit-1', target: 'chat', anchorSeq: 4,
      location: { kind: 'turn', turn: 2 }, visibility: 'visible', data: { root: rootCall },
    }
    const openFile = vi.fn()
    render(<WorkbenchInspector {...props({
      snapshot: {
        chat: {
          order: [node.key],
          nodes: { get: (key: string) => key === node.key ? node : undefined, values: () => [node] },
          locations: { getTurn: () => [node.key], getStep: () => [node.key] },
          timeline: { turnOrder: [2], turns: new Map([[2, turn]]) },
          legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls: [] },
        } as never,
      },
      openFile,
    })} />)

    const ledger = screen.getByTestId('workbench-change-ledger')
    expect(document.body.dataset.workbenchKind).toBe('code')
    expect(screen.getByRole('heading', { name: '本轮变更' })).toBeTruthy()
    expect(ledger.getAttribute('data-filter')).toBe('all')
    expect(within(ledger).getAllByRole('button', { name: /src\/|dist\// })).toHaveLength(3)
    expect(within(ledger).getByLabelText('新增 2 行，删除 1 行')).toBeTruthy()

    fireEvent.click(ledger.querySelector('[data-change-filter="modified"]') as HTMLElement)
    expect(ledger.getAttribute('data-filter')).toBe('modified')
    expect(within(ledger).queryByTitle('dist/report.json')).toBeNull()
    expect(within(ledger).getAllByRole('button', { name: /src\// })).toHaveLength(2)

    fireEvent.click(ledger.querySelector('[data-change-filter="produced"]') as HTMLElement)
    expect(ledger.getAttribute('data-filter')).toBe('produced')
    expect(within(ledger).queryByTitle('src/modified-only.ts')).toBeNull()
    fireEvent.click(within(ledger).getByTitle('dist/report.json'))
    expect(openFile).toHaveBeenCalledWith('dist/report.json')
  })

  it('renders C from real collaboration, request, approval and current-turn file state', () => {
    const turn = {
      turn: 7,
      steps: [],
      status: 'open',
      data: new Map([['deliverables', { produced: [
        { seq: 21, path: 'reports/trajectory.json' },
      ] }]]),
    }
    render(<WorkbenchInspector {...props({
      activeView: 'trajectory',
      snapshot: {
        pending: [{}] as never,
        views: {
          get: (key: string) => key === 'trajectory'
            ? {
              requests: [{
                purpose: 'assistant', startSeq: 20, turn: 7, step: 3,
                status: 'running', startedAt: 100,
                provenance: { provider: 'deepseek', model: 'deepseek-chat' },
              }],
            }
            : undefined,
        } as never,
        chat: {
          order: [],
          nodes: { get: () => undefined, values: () => [] },
          locations: { getTurn: () => [], getStep: () => [] },
          timeline: { turnOrder: [7], turns: new Map([[7, turn]]) },
          legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls: [] },
        } as never,
      },
      list: {
        jobsBySession: { [SID]: [
          { id: 'job-running', kind: 'bash', label: 'run checks', status: 'running', startedAt: 1 },
          { id: 'job-done', kind: 'bash', label: 'index source', status: 'completed', startedAt: 1, finishedAt: 2 },
        ] } as never,
        subagentsByParent: { [SID]: {
          state: 'ready', error: null, parentAvailable: true, entries: [
            { kind: 'child', id: 'active', activity: 'running', hasChildren: false, mode: 'continuable', label: 'active-agent' },
            { kind: 'child', id: 'idle', activity: 'inactive', hasChildren: false, mode: 'one-shot', label: 'idle-agent' },
          ],
        } } as never,
      },
    })} />)

    const root = screen.getByTestId('workbench-inspector')
    expect(root.getAttribute('data-workbench-kind')).toBe('trajectory')
    const selection = screen.getByTestId('workbench-trajectory-selection')
    expect(selection.textContent).toContain('Turn 7')
    expect(selection.textContent).toContain('Step 3')
    expect(selection.textContent).toContain('deepseek-chat')
    expect(screen.getByTestId('workbench-section-jobs').getAttribute('data-count')).toBe('2')
    const subagents = screen.getByTestId('workbench-section-subagents')
    expect(subagents.getAttribute('data-count')).toBe('2')
    const portraits = subagents.querySelectorAll('[data-collaboration-agent-portrait]')
    expect(portraits).toHaveLength(2)
    expect(portraits[0]?.getAttribute('data-collaboration-agent-portrait')).toBe('strategist')
    expect(portraits[1]?.getAttribute('data-collaboration-agent-portrait')).toBe('researcher')
    expect(subagents.querySelectorAll('[data-collaboration-agent-frame]')).toHaveLength(2)
    expect(within(subagents).getByText('策划代理')).toBeTruthy()
    expect(within(subagents).getByText('研究代理')).toBeTruthy()
    const jobs = screen.getByTestId('workbench-section-jobs')
    expect(subagents.compareDocumentPosition(jobs) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(screen.getByTestId('workbench-section-deliverables').textContent)
      .toContain('trajectory.json')
    expect(screen.getByTestId('workbench-section-pending').getAttribute('data-count')).toBe('1')
    expect(root.querySelector('[data-approval-action]')).toBeNull()
    expect(screen.queryByRole('button', { name: /Allow|Reject|Approve|Deny/ })).toBeNull()
  })
})
