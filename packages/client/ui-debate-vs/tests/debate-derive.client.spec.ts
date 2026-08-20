import { describe, expect, it } from 'vitest'
import type {
  AssistantMessageNode, ConversationNode, PartialAssistant, UserMessageNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import { deriveDebateFacts, extractScoreboardHeading } from '../src/client/debate-derive.ts'

const user = (text: string): UserMessageNode => ({
  kind: 'user',
  seq: 1,
  time: 1,
  content: [{ type: 'text', text }],
  source: null,
})

const assistant = (text: string, seq: number): AssistantMessageNode => ({
  kind: 'assistant',
  seq,
  time: seq,
  turn: 1,
  step: 1,
  blocks: [{ kind: 'text', text }],
})

const SCOREBOARD_1 = '# ⚔️ 第 1 回合：立论\n\n| | 正方 🟦 | 反方 🟥 |\n| --- | --- | --- |\n| 核心论点 | 证据 A | 证据 B |'
const SCOREBOARD_2 = '# ⚔️ 第 2 回合：质询 A\n\n反方质询正方一个关于证据 A 的问题。'
const VERDICT = '## 判决牌\n\n获胜方：正方\n\n| 维度 | 得分 |\n| --- | --- |\n| 证据质量 | 8 |'
const HOST_REPLY = '收到，反方开始质询。'

describe('extractScoreboardHeading', () => {
  it('parses the round number and title from a 战报 heading', () => {
    expect(extractScoreboardHeading(SCOREBOARD_1)).toEqual({ round: 1, title: '立论' })
    expect(extractScoreboardHeading('# ⚔️ 第 12 回合')).toEqual({ round: 12, title: null })
    expect(extractScoreboardHeading('# ⚔️ 第3回合:自由辩')).toEqual({ round: 3, title: '自由辩' })
  })

  it('rejects non-scoreboard text', () => {
    expect(extractScoreboardHeading(HOST_REPLY)).toBeNull()
    expect(extractScoreboardHeading('第 2 回合快到了')).toBeNull()
  })
})

describe('deriveDebateFacts', () => {
  it('derives topic, scoreboards, round, host lane, and verdict from the nodes', () => {
    const nodes: readonly ConversationNode[] = [
      user('辩题：AI 自媒体该不该重度使用 DeepSeek Harness？\n开场，打满 5 回合。'),
      assistant(SCOREBOARD_1, 2),
      assistant(HOST_REPLY, 3),
      assistant(SCOREBOARD_2, 4),
      assistant(VERDICT, 5),
    ]
    const facts = deriveDebateFacts(nodes, null)
    expect(facts.topic).toBe('辩题：AI 自媒体该不该重度使用 DeepSeek Harness？')
    expect(facts.round).toBe(2)
    expect(facts.scoreboards).toHaveLength(2)
    expect(facts.scoreboards.map(card => card.round)).toEqual([1, 2])
    expect(facts.scoreboards[0]?.title).toBe('立论')
    expect(facts.host).toEqual([{ text: HOST_REPLY, streaming: false }])
    expect(facts.verdict).toBe(VERDICT)
  })

  it('folds the streaming partial as an in-progress card', () => {
    const nodes: readonly ConversationNode[] = [user('辩题'), assistant(SCOREBOARD_1, 2)]
    const partial: PartialAssistant = {
      turn: 2,
      step: 1,
      blocks: [{ kind: 'text', text: '# ⚔️ 第 2 回合：质询 A\n反方正在质询' }],
    }
    const facts = deriveDebateFacts(nodes, partial)
    expect(facts.round).toBe(2)
    expect(facts.scoreboards).toHaveLength(2)
    expect(facts.scoreboards[1]).toMatchObject({ round: 2, streaming: true })
  })

  it('does not duplicate a card for a partial the finalize already landed', () => {
    const nodes: readonly ConversationNode[] = [
      user('辩题'),
      assistant(SCOREBOARD_1, 2),
      assistant(SCOREBOARD_2, 3),
    ]
    const partial: PartialAssistant = {
      turn: 2,
      step: 1,
      blocks: [{ kind: 'text', text: SCOREBOARD_2 }],
    }
    const facts = deriveDebateFacts(nodes, partial)
    expect(facts.scoreboards).toHaveLength(2)
    expect(facts.scoreboards.every(card => !card.streaming)).toBe(true)
  })

  it('starts at round 1 with an empty topic before any message', () => {
    const facts = deriveDebateFacts([], null)
    expect(facts).toEqual({
      topic: null,
      scoreboards: [],
      host: [],
      verdict: null,
      round: 1,
    })
  })

  it('ignores text-free assistant messages and keeps the first user line only', () => {
    const nodes: readonly ConversationNode[] = [
      user('辩题\n第二行不算'),
      assistant('', 2),
      assistant(HOST_REPLY, 3),
    ]
    const facts = deriveDebateFacts(nodes, null)
    expect(facts.topic).toBe('辩题')
    expect(facts.host).toEqual([{ text: HOST_REPLY, streaming: false }])
  })
})
