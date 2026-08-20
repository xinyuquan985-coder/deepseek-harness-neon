/** State-derived mission control for the active conversation workbench. */
import { useEffect, useState, type ReactNode } from 'react'
import type {
  AssistantMessageNode, ConversationSnapshot, JobView, RequestView,
  SubagentAddress, SubagentCatalogSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Projection/turn-data declarations are type-only capability edges. The
// component still reads every value through the framework's standard hooks.
import type {} from '@deepseek-ai/dsh-goal/client'
import type {} from '@deepseek-ai/dsh-tool-todo/client'
import type {} from '@deepseek-ai/dsh-client-ui-deliverables/client'
import {
  currentTurnFileChanges, currentTurnToolActivity, deriveWorkbenchKind, hasCodeActivity,
  type WorkbenchFileChange, type WorkbenchKind,
} from './workbench-model.ts'
import type { WorkbenchKey } from './locales.ts'
import css from './WorkbenchInspector.module.css'
import strategistPortrait from './assets/strategist-night-city-v2.png'
import researcherPortrait from './assets/researcher-night-city-v2.png'
import coderPortrait from './assets/coder-night-city-v2.png'
import reviewerPortrait from './assets/reviewer-night-city-v2.png'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Three-workbench overview copy. */
    workbench: WorkbenchKey
  }
}

/** Existing product actions bound by the package registration. */
export interface WorkbenchInspectorInjected {
  /** Navigate through the authoritative direct-parent subagent address. */
  openChild: (address: SubagentAddress) => void
  /** Interrupt a running continuable child through the existing Host API. */
  interruptChild: (address: Extract<SubagentAddress, { mode: 'continuable' }>) => void
  /** Open one produced path through the Host workspace service. */
  openFile: (path: string) => void
}

/** Framework, action and locale shares for the overview slot entry. */
export type WorkbenchInspectorProps =
  PropsRuntime<'conversation.details.overview'> & WorkbenchInspectorInjected & PropsLocale<'workbench'>

const KIND_KEYS: Record<WorkbenchKind, WorkbenchKey> = {
  conversation: 'kind.conversation',
  code: 'kind.code',
  trajectory: 'kind.trajectory',
}

type Translator = WorkbenchInspectorProps['t']
type ChildEntry = Extract<SubagentCatalogSnapshot['entries'][number], { kind: 'child' }>

const COLLABORATION_PORTRAITS = [
  { id: 'strategist', src: strategistPortrait, role: 'subagent.role.strategy' },
  { id: 'researcher', src: researcherPortrait, role: 'subagent.role.research' },
  { id: 'coder', src: coderPortrait, role: 'subagent.role.coder' },
  { id: 'reviewer', src: reviewerPortrait, role: 'subagent.role.review' },
] as const

const DEBATE_PORTRAITS = [
  { id: 'debate-affirmative', src: strategistPortrait, role: 'subagent.role.affirmative' },
  { id: 'debate-negative', src: coderPortrait, role: 'subagent.role.negative' },
  { id: 'debate-judge', src: reviewerPortrait, role: 'subagent.role.judge' },
] as const

type AgentPresentation = 'compact' | 'trajectory' | 'debate'

function collaborationProfile(label: string, index: number) {
  const normalized = label.toUpperCase()
  if (normalized.includes('RESEARCH')) return COLLABORATION_PORTRAITS[1]
  if (normalized.includes('CODER') || normalized.includes('CODE')) return COLLABORATION_PORTRAITS[2]
  if (normalized.includes('REVIEW') || normalized.includes('AUDIT')) return COLLABORATION_PORTRAITS[3]
  return COLLABORATION_PORTRAITS[index % COLLABORATION_PORTRAITS.length]
}

function debateProfile(label: string, index: number) {
  if (label.includes('正方') || /affirmative/i.test(label)) return DEBATE_PORTRAITS[0]
  if (label.includes('反方') || /negative/i.test(label)) return DEBATE_PORTRAITS[1]
  if (label.includes('裁判') || /judge/i.test(label)) return DEBATE_PORTRAITS[2]
  return DEBATE_PORTRAITS[index % DEBATE_PORTRAITS.length]
}

function SectionFrame({
  id, label, count, children,
}: {
  id: string
  label: string
  count: number
  children: ReactNode
}) {
  if (count === 0) return null
  return (
    <section className={css.section} data-testid={`workbench-section-${id}`} data-count={count}>
      <header className={css.sectionHeader}>
        <span className={css.sectionLabel}>{label}</span>
        <span className={css.count}>{count}</span>
      </header>
      {children}
    </section>
  )
}

function CountSection({ id, label, count }: { id: string; label: string; count: number }) {
  return (
    <SectionFrame id={id} label={label} count={count}>
      <span className={css.srOnly}>{label}: {count}</span>
    </SectionFrame>
  )
}

function goalStatus(phase: 'active' | 'paused' | 'blocked' | 'complete', t: Translator): string {
  switch (phase) {
    case 'active': return t('goal.active')
    case 'paused': return t('goal.paused')
    case 'blocked': return t('goal.blocked')
    case 'complete': return t('goal.complete')
  }
}

function todoStatus(status: 'pending' | 'in_progress' | 'completed', t: Translator): string {
  switch (status) {
    case 'pending': return t('todo.pending')
    case 'in_progress': return t('todo.inProgress')
    case 'completed': return t('todo.completed')
  }
}

function jobStatus(status: JobView['status'], t: Translator): string {
  switch (status) {
    case 'running': return t('job.running')
    case 'stopping': return t('job.stopping')
    case 'completed': return t('job.completed')
    case 'killed': return t('job.killed')
    case 'failed': return t('job.failed')
  }
}

function sessionDeliverables(
  snapshot: ConversationSnapshot,
  scope: 'current' | 'all',
): readonly string[] {
  const turnOrder = snapshot.chat.timeline.turnOrder
  const turnIds = scope === 'current' ? turnOrder.slice(-1) : turnOrder
  const paths: string[] = []
  const seen = new Set<string>()
  for (const turnId of turnIds) {
    const data = snapshot.chat.timeline.turns.get(turnId)?.data.get('deliverables')
    if (data === undefined) continue
    for (const item of data.produced) {
      if (seen.has(item.path)) continue
      seen.add(item.path)
      paths.push(item.path)
    }
  }
  return paths
}

function basename(path: string): string {
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return separator === -1 ? path : path.slice(separator + 1)
}

interface TrajectoryRequestSummary {
  readonly turn: number | null
  readonly step: number
  readonly status: RequestView['status']
  readonly model?: string
}

function currentTrajectoryRequest(snapshot: ConversationSnapshot): TrajectoryRequestSummary | null {
  const views = snapshot.views as unknown as
    | { get(key: string): unknown }
    | undefined
  const trajectory = views?.get('trajectory') as
    | {
      readonly requests?: readonly RequestView[]
      readonly eventNodes?: readonly ConversationSnapshot['nodes'][number][]
    }
    | undefined
  const requests = trajectory?.requests ?? []
  for (let index = requests.length - 1; index >= 0; index--) {
    const request = requests[index]
    if (request?.status === 'running') {
      const model = request.provenance?.model ?? request.requestConfig?.model
      return {
        turn: request.turn,
        step: request.step,
        status: request.status,
        ...(model === undefined ? {} : { model }),
      }
    }
  }
  const request = requests.at(-1)
  if (request !== undefined) {
    const model = request.provenance?.model ?? request.requestConfig?.model
    return {
      turn: request.turn,
      step: request.step,
      status: request.status,
      ...(model === undefined ? {} : { model }),
    }
  }
  const assistant = [...(trajectory?.eventNodes ?? [])].reverse().find(
    (node): node is AssistantMessageNode => node.kind === 'assistant' && node.step > 0,
  )
  if (assistant === undefined) return null
  return {
    turn: assistant.turn,
    step: assistant.step,
    status: assistant.timing?.completedTime === null ? 'running' : 'complete',
    ...(assistant.provenance?.model === undefined ? {} : { model: assistant.provenance.model }),
  }
}

function TrajectorySelection({ request, t }: { request: TrajectoryRequestSummary; t: Translator }) {
  const location = request.turn === null
    ? t('trajectory.betweenTurns')
    : `${t('trajectory.turn')} ${request.turn} · ${t('trajectory.step')} ${request.step}`
  return (
    <SectionFrame id="trajectory-selection" label={t('section.selection')} count={1}>
      <div
        className={css.trajectorySelection}
        data-testid="workbench-trajectory-selection"
        data-request-status={request.status}
      >
        <span className={css.trajectoryLocation}>{location}</span>
        {request.model !== undefined && (
          <span className={css.trajectoryModel}>{request.model}</span>
        )}
        <span className={css.trajectoryStatus}>{request.status}</span>
      </div>
    </SectionFrame>
  )
}

type ChangeFilter = 'all' | 'modified' | 'produced'

interface ChangeLedgerEntry extends WorkbenchFileChange {
  readonly produced: boolean
}

function mergeChangeEntries(
  modified: readonly WorkbenchFileChange[],
  producedPaths: readonly string[],
): {
  all: readonly ChangeLedgerEntry[]
  modified: readonly ChangeLedgerEntry[]
  produced: readonly ChangeLedgerEntry[]
} {
  const all = modified.map(change => ({ ...change, produced: producedPaths.includes(change.path) }))
  const byPath = new Map(all.map(entry => [entry.path, entry]))
  for (const path of producedPaths) {
    if (byPath.has(path)) continue
    const entry: ChangeLedgerEntry = {
      path, status: 'settled', additions: null, deletions: null, produced: true,
    }
    byPath.set(path, entry)
    all.push(entry)
  }
  return {
    all,
    modified: all.filter(entry => modified.some(change => change.path === entry.path)),
    produced: producedPaths.flatMap((path) => {
      const entry = byPath.get(path)
      return entry === undefined ? [] : [entry]
    }),
  }
}

function ChangeLedger({
  modified, producedPaths, openFile, t,
}: {
  modified: readonly WorkbenchFileChange[]
  producedPaths: readonly string[]
  openFile: WorkbenchInspectorInjected['openFile']
  t: Translator
}) {
  const entries = mergeChangeEntries(modified, producedPaths)
  const [selected, setSelected] = useState<ChangeFilter>('all')
  if (entries.all.length === 0) return null
  const available = (['all', 'modified', 'produced'] as const)
    .filter(filter => entries[filter].length > 0)
  const active = available.includes(selected) ? selected : 'all'
  const label: Record<ChangeFilter, WorkbenchKey> = {
    all: 'change.all',
    modified: 'change.modified',
    produced: 'change.produced',
  }
  return (
    <section
      className={`${css.section} ${css.changeLedger}`}
      data-testid="workbench-change-ledger"
      data-filter={active}
      data-count={entries.all.length}
    >
      <header className={css.sectionHeader}>
        <span className={css.sectionLabel}>{t('section.changes')}</span>
        <span className={css.count}>{entries.all.length}</span>
      </header>
      <div className={css.changeFilters} role="group" aria-label={t('change.filters')}>
        {available.map(filter => (
          <button
            key={filter}
            type="button"
            className={css.changeFilter}
            data-change-filter={filter}
            aria-pressed={active === filter}
            onClick={() => { setSelected(filter) }}
          >
            {t(label[filter])}
            <span>{entries[filter].length}</span>
          </button>
        ))}
      </div>
      <ul className={css.changeRows}>
        {entries[active].map(entry => (
          <li key={entry.path} className={css.changeRow} data-change-status={entry.status}>
            <span className={css.changeState} aria-hidden="true" />
            <button
              type="button"
              className={css.changePath}
              title={entry.path}
              aria-label={t('change.open', { path: entry.path })}
              onClick={() => { openFile(entry.path) }}
            >
              <span>{basename(entry.path)}</span>
              <span>{entry.path}</span>
            </button>
            {entry.additions !== null && entry.deletions !== null && (
              <span className={css.changeStats} aria-label={t('change.stats', {
                additions: entry.additions,
                deletions: entry.deletions,
              })}>
                <span>+{entry.additions}</span>
                <span>-{entry.deletions}</span>
              </span>
            )}
            <span className={css.changeStatus}>
              {entry.status === 'running' ? t('change.running') : t('change.settled')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function JobRows({ jobs, t }: { jobs: readonly JobView[]; t: Translator }) {
  return (
    <ul className={css.rows}>
      {jobs.map(job => (
        <li key={job.id} className={css.row} data-state={job.status}>
          <span className={css.stateDot} aria-hidden="true" />
          <span className={css.rowBody}>
            <span className={css.rowTitle}>{job.label}</span>
            <span className={css.rowMeta}>{job.kind}</span>
          </span>
          <span className={css.status}>{jobStatus(job.status, t)}</span>
        </li>
      ))}
    </ul>
  )
}

function SubagentRows({
  parentSessionId, entries, presentation, openChild, interruptChild, t,
}: {
  parentSessionId: WorkbenchInspectorProps['sessionId']
  entries: readonly ChildEntry[]
  presentation: AgentPresentation
  openChild: WorkbenchInspectorInjected['openChild']
  interruptChild: WorkbenchInspectorInjected['interruptChild']
  t: Translator
}) {
  return (
    <ul className={css.rows}>
      {entries.map((entry, index) => {
        const label = entry.label ?? entry.id
        const portrait = presentation === 'debate'
          ? debateProfile(label, index)
          : collaborationProfile(label, index)
        const showsPortrait = presentation !== 'compact'
        const address: SubagentAddress = {
          parentSessionId,
          childSessionId: entry.id,
          mode: entry.mode,
        }
        return (
          <li
            key={entry.id}
            className={showsPortrait ? `${css.row} ${css.agentRow}` : css.row}
            data-state={entry.activity}
            data-agent-presentation={presentation}
            data-agent-role={showsPortrait ? portrait?.id : undefined}
          >
            {showsPortrait && portrait !== undefined && (
              <span className={css.agentFrame} data-collaboration-agent-frame="" aria-hidden="true">
                <span className={css.agentViewport}>
                  <img
                    className={css.agentPortrait}
                    src={portrait.src}
                    alt=""
                    data-collaboration-agent-portrait={portrait.id}
                  />
                </span>
              </span>
            )}
            <span className={css.stateDot} aria-hidden="true" />
            <button
              type="button"
              className={css.rowAction}
              aria-label={t('subagent.open', { name: label })}
              onClick={() => { openChild(address) }}
            >
              {showsPortrait && portrait !== undefined && (
                <span className={css.agentRole}>{t(portrait.role)}</span>
              )}
              <span className={css.rowTitle}>{label}</span>
              <span className={css.rowMeta}>{entry.mode === 'continuable' ? t('subagent.continuable') : t('subagent.oneShot')}</span>
            </button>
            <span className={css.status}>{entry.activity === 'running' ? t('subagent.running') : t('subagent.inactive')}</span>
            {entry.mode === 'continuable' && entry.activity === 'running' && (
              <button
                type="button"
                className={css.stopAction}
                aria-label={t('subagent.stop', { name: label })}
                onClick={() => {
                  interruptChild({
                    parentSessionId,
                    childSessionId: entry.id,
                    mode: 'continuable',
                  })
                }}
              >
                {t('action.stop')}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Render the current workbench kind and only non-empty real-data sections.
 * @param props - standard hooks, bound product actions, active view and locale seat.
 * @returns the state-derived workbench overview.
 */
export function WorkbenchInspector({
  activeView, sessionId, useSession, useSessions, useProjection,
  openChild, interruptChild, openFile, t,
}: WorkbenchInspectorProps) {
  const snapshot = useSession(value => value)
  const jobs = useSessions(state => state.jobsBySession[sessionId] ?? [])
  const catalog = useSessions(state => state.subagentsByParent[sessionId])
  const subagents = (catalog?.entries ?? []).filter((entry): entry is ChildEntry => entry.kind === 'child')
  const goal = useProjection('goal')
  const todos = useProjection('todos') ?? []
  const tools = currentTurnToolActivity(snapshot)
  const fileChanges = currentTurnFileChanges(snapshot)
  const trajectoryRequest = currentTrajectoryRequest(snapshot)
  const kind = deriveWorkbenchKind({
    activeView,
    currentTurnHasCodeMutation: hasCodeActivity(tools),
  })
  const debateView = activeView === 'debate-vs'
  const deliverables = sessionDeliverables(snapshot, kind === 'conversation' ? 'all' : 'current')
  const completedTodos = todos.filter(todo => todo.status === 'completed').length

  useEffect(() => {
    document.body.dataset.workbenchKind = kind
    return () => {
      if (document.body.dataset.workbenchKind === kind) delete document.body.dataset.workbenchKind
    }
  }, [kind])

  return (
    <div
      className={css.root}
      data-testid="workbench-inspector"
      data-workbench-kind={kind}
      data-workbench-view={activeView}
      data-code-activity-count={tools.length}
    >
      <div className={css.identity}>
        <span className={css.eyebrow}>{t('status.live')}</span>
        <h2 className={css.title}>
          {t(KIND_KEYS[kind])}
          <span className={css.suggested} aria-hidden="true">{t('badge.suggested')}</span>
        </h2>
      </div>
      <div className={css.sections}>
        {kind === 'trajectory' && trajectoryRequest !== null && (
          <TrajectorySelection request={trajectoryRequest} t={t} />
        )}
        {kind === 'conversation' && (
          <>
            {goal !== undefined && goal !== null && (
              <SectionFrame id="goal" label={t('section.goal')} count={1}>
                <div className={css.goalRow}>
                  <p className={css.goalObjective}>{goal.goal.objective}</p>
                  <span className={css.goalStatus} data-state={goal.goal.phase}>{goalStatus(goal.goal.phase, t)}</span>
                </div>
              </SectionFrame>
            )}
            <SectionFrame id="todos" label={t('section.todos')} count={todos.length}>
              <div className={css.progressSummary}>{t('todo.progress', { done: completedTodos, total: todos.length })}</div>
              <div className={css.progressTrack} aria-hidden="true">
                <span style={{ width: `${String(todos.length === 0 ? 0 : (completedTodos / todos.length) * 100)}%` }} />
              </div>
              <ul className={css.todoRows}>
                {todos.map((todo, index) => (
                  <li key={`${todo.content}:${String(index)}`} className={css.todoRow} data-state={todo.status}>
                    <span className={css.todoMark} aria-hidden="true" />
                    <span className={css.todoContent}>{todo.content}</span>
                    <span className={css.status}>{todoStatus(todo.status, t)}</span>
                  </li>
                ))}
              </ul>
            </SectionFrame>
            <CountSection id="queue" label={t('section.queue')} count={snapshot.queue.length} />
          </>
        )}
        {kind === 'conversation' && (
          <>
            <SectionFrame id="jobs" label={t('section.jobs')} count={jobs.length}>
              <JobRows jobs={jobs} t={t} />
            </SectionFrame>
            <SectionFrame id="subagents" label={t('section.subagents')} count={subagents.length}>
              <SubagentRows
                parentSessionId={sessionId}
                entries={subagents}
                presentation={debateView ? 'debate' : 'compact'}
                openChild={openChild}
                interruptChild={interruptChild}
                t={t}
              />
            </SectionFrame>
          </>
        )}
        {kind === 'trajectory' && (
          <>
            <SectionFrame id="subagents" label={t('section.subagents')} count={subagents.length}>
              <SubagentRows
                parentSessionId={sessionId}
                entries={subagents}
                presentation="trajectory"
                openChild={openChild}
                interruptChild={interruptChild}
                t={t}
              />
            </SectionFrame>
            <SectionFrame id="jobs" label={t('section.jobs')} count={jobs.length}>
              <JobRows jobs={jobs} t={t} />
            </SectionFrame>
          </>
        )}
        {kind === 'code' ? (
          <ChangeLedger modified={fileChanges} producedPaths={deliverables} openFile={openFile} t={t} />
        ) : (
          <SectionFrame id="deliverables" label={t('section.deliverables')} count={deliverables.length}>
            <ul className={css.fileRows}>
              {deliverables.map(path => (
                <li key={path}>
                  <button
                    type="button"
                    className={css.fileAction}
                    title={path}
                    aria-label={t('deliverable.open', { path })}
                    onClick={() => { openFile(path) }}
                  >
                    <span className={css.fileGlyph} aria-hidden="true">⌁</span>
                    <span>{basename(path)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </SectionFrame>
        )}
        {kind === 'trajectory' && (
          <CountSection id="pending" label={t('section.pending')} count={snapshot.pending.length} />
        )}
      </div>
    </div>
  )
}
