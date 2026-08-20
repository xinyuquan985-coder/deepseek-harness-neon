/**
 * Pure derivation of the debate board from one conversation snapshot: the
 * topic line, the host's per-round VS 战报 stream, the host reply lane, the
 * judge's verdict, and the current round number. No subscription machinery —
 * a pure fold over the snapshot plus the streaming partial, memoized by the
 * component.
 */
import type {
  AssistantMessageNode, ConversationNode, PartialAssistant, UserMessageNode,
} from '@deepseek-ai/dsh-client-runtime/client'

/** One extracted VS scoreboard (the host's per-round 战报). */
export interface ScoreboardCard {
  /** Round number parsed from the 战报 heading. */
  round: number
  /** Heading text after the round number (回合名); null when the heading is bare. */
  title: string | null
  /** Complete markdown text (the scoreboard body). */
  text: string
  /** Whether this card renders the still-streaming partial. */
  streaming: boolean
}

/** One host reply that is not a scoreboard (chronological). */
export interface HostLaneItem {
  /** Complete markdown text. */
  text: string
  /** Whether this item renders the still-streaming partial. */
  streaming: boolean
}

/** Complete derived board state for one snapshot + partial. */
export interface DebateBoardFacts {
  /** First line of the first user message (辩题); null before any user message. */
  topic: string | null
  /** Scoreboards in chronological order (the board renders latest first). */
  scoreboards: readonly ScoreboardCard[]
  /** Non-scoreboard host replies in chronological order. */
  host: readonly HostLaneItem[]
  /** Latest verdict text (终局判决牌); null while 待裁决. */
  verdict: string | null
  /** Current round: the latest scoreboard round, else 1. */
  round: number
}

/** Scoreboard heading line, e.g. `# ⚔️ 第 2 回合：质询 A`. */
const SCOREBOARD_HEADING = /^#\s*⚔️\s*第\s*(\d+)\s*回合\s*(?:[:：]\s*)?(.*)$/m

/** Text marking the 终局 verdict (判决牌 with 获胜方 and the three scores). */
const VERDICT_MARK = /判决牌|获胜方/

/** Extract the round number and title from one scoreboard heading line. */
export function extractScoreboardHeading(text: string): { round: number; title: string | null } | null {
  const match = SCOREBOARD_HEADING.exec(text)
  if (match === null) return null
  const raw = match[2]?.trim()
  const title = raw === undefined || raw === '' ? null : raw
  return { round: Number(match[1]), title }
}

/** Concatenate the text blocks of a user message (wire-tolerant narrow). */
function contentText(content: readonly unknown[]): string {
  let text = ''
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const candidate = block as { type?: unknown; text?: unknown }
    if (candidate.type === 'text' && typeof candidate.text === 'string') text += candidate.text
  }
  return text
}

/** Concatenate the text blocks of one finalized assistant message. */
function assistantText(node: AssistantMessageNode): string {
  let text = ''
  for (const block of node.blocks) {
    if (block.kind === 'text') text += block.text
  }
  return text
}

/** Concatenate the text blocks of the still-streaming partial. */
function partialText(partial: PartialAssistant | null): string {
  if (partial === null) return ''
  let text = ''
  for (const block of partial.blocks) {
    if (block.kind === 'text') text += block.text
  }
  return text
}

/** First non-empty trimmed line of a text (the topic occupies one line). */
function topicLine(text: string): string | null {
  const line = text.split('\n').map(part => part.trim()).find(part => part !== '')
  return line ?? null
}

/** Strip a leading scoreboard heading line so the styled card heading is the only one rendered. */
function scoreboardBody(text: string): string {
  return text.replace(/^#\s*⚔️\s*第\s*\d+\s*回合[^\n]*\n/, '')
}

/**
 * Fold one conversation snapshot plus its streaming partial into the board
 * facts. Scoreboard and verdict recognition ride the host's published 战报
 * vocabulary (the debate-arena skill protocol); everything else the host
 * says lands in the host lane.
 * @param nodes - the session's finalized conversation nodes.
 * @param partial - the still-streaming assistant output, if any.
 * @returns the derived board state.
 */
export function deriveDebateFacts(
  nodes: readonly ConversationNode[],
  partial: PartialAssistant | null,
): DebateBoardFacts {
  let topic: string | null = null
  let verdict: string | null = null
  let round = 1
  let lastAssistantText: string | null = null
  const scoreboards: ScoreboardCard[] = []
  const host: HostLaneItem[] = []

  const foldText = (text: string, streaming: boolean): void => {
    const heading = extractScoreboardHeading(text)
    if (heading !== null) {
      round = Math.max(round, heading.round)
      scoreboards.push({ ...heading, text: scoreboardBody(text), streaming })
      return
    }
    if (VERDICT_MARK.test(text)) {
      verdict = text
      return
    }
    host.push({ text, streaming })
  }

  for (const node of nodes) {
    if (node.kind === 'user') {
      if (topic === null) topic = topicLine(contentText((node as UserMessageNode).content))
      continue
    }
    if (node.kind !== 'assistant') continue
    const text = assistantText(node)
    if (text !== '') {
      lastAssistantText = text
      foldText(text, false)
    }
  }

  const streamingText = partialText(partial)
  // Finalize has already landed this exact text as a node (the brief
  // partial/finalize overlap window): folding it again would duplicate the card.
  if (streamingText !== '' && streamingText !== lastAssistantText) foldText(streamingText, true)

  return { topic, scoreboards, host, verdict, round }
}
