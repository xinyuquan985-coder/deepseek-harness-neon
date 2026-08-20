/**
 * VS 对决 live board: topic and round masthead, the phase strip (the host's
 * round checklist — the debate rhythm), two equal speech columns (正方 /
 * 反方 — each side's own speeches stream into its column), a slim VS center,
 * the host's per-round 战报 with the host lane inside the 主持台 box, an
 * audience gate banner while the host waits for round confirmation, and the
 * judge seat (verdict). Pure presentation — every fact comes from the
 * framework hooks and the injected callbacks; the transcripts ride the
 * injected hooks compartment (`useSideTranscripts`) refreshed on a
 * component-driven poll.
 */
import { useEffect, useMemo } from 'react'
import clsx from 'clsx'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId, SubagentCatalogSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: the `todos` projection key merge (the host's round checklist).
import type {} from '@deepseek-ai/dsh-tool-todo/types'
import { deriveDebateFacts } from './debate-derive.ts'
import type { DebateVSInjected } from './index.ts'
import type { SideTranscript } from './debate-transcript.ts'
import css from './DebateVSView.module.css'

/** Side role labels this board recognizes (the debate-arena skill vocabulary). */
const AFFIRMATIVE = '正方'
const NEGATIVE = '反方'
const JUDGE = '裁判'

/** Live state of one debate child. */
export type DebatableState = '未派出' | '进行中' | '已结束'

/** One side slot (affirmative or negative) resolved from the child catalog. */
interface SideSlot {
  role: typeof AFFIRMATIVE | typeof NEGATIVE
  childId: SessionId | null
  state: DebatableState
  /** Continuable children accept interrupts; one-shot children do not. */
  mode: 'continuable' | 'one-shot' | null
}

/** One round/phase item folded from the host's `todos` projection. */
interface PhaseItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

/** Narrow the wire-unknown `todos` projection value to phase items. */
function narrowPhaseItems(value: unknown): readonly PhaseItem[] {
  if (!Array.isArray(value)) return []
  const items: PhaseItem[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const candidate = item as { content?: unknown; status?: unknown }
    if (typeof candidate.content !== 'string') continue
    const status = candidate.status === 'in_progress' || candidate.status === 'completed'
      ? candidate.status
      : 'pending'
    items.push({ content: candidate.content, status })
  }
  return items
}

/**
 * Whether one catalog label names the role. The debate preset dispatches
 * children with task labels such as "派出正方辩手"; older runs may use plain
 * role-prefixed notes or persona-style titles embedding the role in 「」.
 * @param label - catalog row label.
 * @param role - the slot role.
 * @returns whether the label names the role.
 */
function labelNamesRole(label: string, role: typeof AFFIRMATIVE | typeof NEGATIVE | typeof JUDGE): boolean {
  return label.startsWith(role)
    || label.startsWith(`派出${role}`)
    || label.includes(`「${role}」`)
}

/** Narrow one catalog row to a healthy child whose label names the role. */
function isRoleChild(
  candidate: unknown,
  role: typeof AFFIRMATIVE | typeof NEGATIVE | typeof JUDGE,
): candidate is { id: SessionId; activity: 'running' | 'inactive'; mode: 'continuable' | 'one-shot' } {
  const entry = candidate as { kind?: unknown; label?: unknown; id?: unknown; activity?: unknown; mode?: unknown }
  return entry.kind === 'child'
    && typeof entry.label === 'string'
    && labelNamesRole(entry.label, role)
    && typeof entry.id === 'string'
    && (entry.activity === 'running' || entry.activity === 'inactive')
    && (entry.mode === 'continuable' || entry.mode === 'one-shot')
}

/** Resolve one catalog label to its slot. */
function slotOf(catalog: SubagentCatalogSnapshot | undefined, role: typeof AFFIRMATIVE | typeof NEGATIVE | typeof JUDGE): {
  childId: SessionId | null
  state: DebatableState
  mode: 'continuable' | 'one-shot' | null
} {
  const entry = catalog?.entries.find(candidate => isRoleChild(candidate, role))
  if (entry === undefined) return { childId: null, state: '未派出', mode: null }
  return {
    childId: entry.id,
    state: entry.activity === 'running' ? '进行中' : '已结束',
    mode: entry.mode,
  }
}

/** The board: two side slots plus the judge seat, folded from the catalog. */
interface Roster {
  sides: [SideSlot, SideSlot]
  judge: { childId: SessionId | null; state: DebatableState }
}

function rosterOf(catalog: SubagentCatalogSnapshot | undefined): Roster {
  return {
    sides: [
      { role: AFFIRMATIVE, ...slotOf(catalog, AFFIRMATIVE) },
      { role: NEGATIVE, ...slotOf(catalog, NEGATIVE) },
    ],
    judge: slotOf(catalog, JUDGE),
  }
}

/** Full component props: the view-ring framework kit plus the bound injected face. */
export type DebateVSViewProps = ConvViewProps & InjectFace<DebateVSInjected>

/** Transcript polling cadence for the side columns (live-feel while running). */
const POLL_MS = 1200

/**
 * Render the live debate board.
 * @param props - framework hooks, session id, and the interrupt/transcript callbacks.
 * @returns the arena: masthead, phase strip, equal speech columns, 主持台 box, judge seat.
 */
export function DebateVSView({
  sessionId, useSession, useSessions, useProjection, interruptSide,
  useSideTranscripts, refreshSideTranscripts,
}: DebateVSViewProps) {
  const nodes = useSession(s => s.nodes)
  const partial = useSession(s => s.partial)
  const pending = useSession(s => s.pending) ?? []
  const catalog = useSessions(s => s.subagentsByParent[sessionId])
  const facts = useMemo(() => deriveDebateFacts(nodes, partial), [nodes, partial])
  const roster = useMemo(() => rosterOf(catalog), [catalog])
  const verdictLanded = facts.verdict !== null
  const transcripts = useSideTranscripts(s => s)
  const phases = useProjection('todos', narrowPhaseItems) as readonly PhaseItem[]
  const gateQuestion = pending.find(interaction => interaction.kind === 'question')
  const anyRunning = roster.sides.some(side => side.state === '进行中') || roster.judge.state === '进行中'

  const childIds = useMemo(
    () => roster.sides.map(side => side.childId).filter((id): id is SessionId => id !== null),
    [roster],
  )
  useEffect(() => {
    if (childIds.length === 0) return
    void refreshSideTranscripts(childIds)
    const timer = setInterval(() => { void refreshSideTranscripts(childIds) }, POLL_MS)
    return () => { clearInterval(timer) }
  }, [childIds, refreshSideTranscripts])

  const sideCard = (side: SideSlot) => {
    const childId = side.childId
    const transcript: SideTranscript | undefined = childId === null ? undefined : transcripts[childId]
    const lines = transcript?.lines ?? []
    return (
      <div
        key={side.role}
        className={clsx(css.sideCard, side.role === AFFIRMATIVE ? css.affirmative : css.negative)}
        data-running={side.state === '进行中' || undefined}
      >
        <div className={css.sideHead}>
          <span className={css.sideRole}>{side.role}</span>
          <span className={css.sideState} data-state={side.state}>{side.state}</span>
          {side.state === '进行中' && side.mode === 'continuable' && childId !== null && (
            <button
              type="button"
              className={css.sideStop}
              onClick={() => { interruptSide(childId) }}
            >
              终止
            </button>
          )}
        </div>
        <div className={css.sideLines}>
          {lines.length === 0 && (
            <p className={css.sideEmpty}>
              {childId === null ? '主持人尚未派出' : side.state === '进行中' ? '正在组织发言…' : '等待发言…'}
            </p>
          )}
          {lines.map((line, index) => (
            <div key={index} className={css.sideLine}>
              <MarkdownText text={line.text} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={css.arena} data-session-id={sessionId} data-running={anyRunning || undefined}>
      <header className={css.masthead}>
        <h1 className={css.topic}>{facts.topic ?? '辩题待定'}</h1>
        <span className={css.roundBadge}>
          {verdictLanded ? '已裁决' : `第 ${facts.round} 回合`}
        </span>
      </header>

      {phases.length > 0 && (
        <ol className={css.phaseStrip}>
          {phases.map((phase, index) => (
            <li key={index} className={css.phaseItem} data-status={phase.status}>
              <span className={css.phaseDot} />
              <span className={css.phaseText}>{phase.content}</span>
            </li>
          ))}
        </ol>
      )}

      {gateQuestion !== undefined && !verdictLanded && (
        <div className={css.gateBanner} role="status">
          第 {facts.round} 回合已收官——战报见下方主持台。观众确认后开启下一回合。
        </div>
      )}

      <div className={css.board}>
        {sideCard(roster.sides[0])}
        <div className={css.center}>
          <div className={css.vs}>VS</div>
          <div className={css.centerRound}>{verdictLanded ? '已裁决' : `第 ${facts.round} 回合`}</div>
        </div>
        {sideCard(roster.sides[1])}
      </div>

      <section className={css.hostSeat}>
        <div className={css.hostSeatHead}>
          <span className={css.hostSeatRole}>主持台 · 回合战报</span>
        </div>
        {facts.scoreboards.length === 0 && facts.host.length === 0 && (
          <p className={css.idle}>等待开赛：主持人派出辩手后，双方的发言会实时出现在上方两栏，每回合的 VS 战报会出现在这里。</p>
        )}
        {[...facts.scoreboards].reverse().map((card, index) => (
          <article key={`${card.round}-${index}`} className={css.scoreboard} data-streaming={card.streaming || undefined}>
            <h2 className={css.scoreboardHeading}>
              ⚔️ 第 {card.round} 回合{card.title !== null ? `：${card.title}` : ''}
            </h2>
            <MarkdownText text={card.text} streaming={card.streaming} />
          </article>
        ))}
        {facts.host.length > 0 && (
          <div className={css.hostLane}>
            <h2 className={css.hostLaneHeading}>主持人</h2>
            {facts.host.map((item, index) => (
              <div key={index} className={css.hostItem} data-streaming={item.streaming || undefined}>
                <MarkdownText text={item.text} streaming={item.streaming} />
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className={css.judgeSeat} data-state={roster.judge.state}>
        <div className={css.judgeHead}>
          <span className={css.judgeRole}>裁判席</span>
          <span className={css.judgeState}>{roster.judge.state}</span>
        </div>
        {facts.verdict !== null
          ? <div className={css.verdict}><MarkdownText text={facts.verdict} /></div>
          : <p className={css.pending}>待裁决</p>}
      </footer>
    </div>
  )
}
