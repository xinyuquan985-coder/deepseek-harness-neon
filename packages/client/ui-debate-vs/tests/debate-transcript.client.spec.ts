import { describe, expect, it } from 'vitest'
import { EMPTY_SIDE_TRANSCRIPT, foldSideTranscript, type TranscriptHistoryEntry } from '../src/client/debate-transcript.ts'

const entry = (type: string, text: string): TranscriptHistoryEntry => ({
  event: { type, data: { message: { role: 'assistant', content: [{ type: 'text', text }] } } },
})

const userEntry = (text: string): TranscriptHistoryEntry => ({
  event: { type: 'user/message', data: { content: [{ type: 'text', text }] } },
})

describe('foldSideTranscript', () => {
  it('keeps only the child speeches in log order (content nests under data.message)', () => {
    const transcript = foldSideTranscript([
      userEntry('正方，请立论。'),
      entry('assistant/message', '我方立论：第一，…'),
      userEntry('回应反方的质询。'),
      entry('assistant/message', '关于证据 A：…'),
    ])
    expect(transcript.lines).toEqual([
      { text: '我方立论：第一，…' },
      { text: '关于证据 A：…' },
    ])
  })

  it('drops instructions, tool events, reasoning, and empty or malformed messages', () => {
    const transcript = foldSideTranscript([
      { event: { type: 'turn/start', data: { turn: 1 } } },
      { event: { type: 'assistant/message', data: { message: { content: [{ type: 'reasoning', text: '思考过程' }] } } } },
      userEntry('主持人的指令不是辩论内容'),
      entry('assistant/message', ''),
      { event: { type: 'assistant/message', data: null } },
      {},
      entry('assistant/message', '唯一发言'),
    ])
    expect(transcript.lines).toEqual([{ text: '唯一发言' }])
  })

  it('concatenates multiple text blocks of one message', () => {
    const transcript = foldSideTranscript([{
      event: {
        type: 'assistant/message',
        data: {
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: '第一段' }, { type: 'text', text: '第二段' }],
          },
        },
      },
    }])
    expect(transcript.lines).toEqual([{ text: '第一段第二段' }])
  })

  it('exposes a stable empty transcript', () => {
    expect(EMPTY_SIDE_TRANSCRIPT).toEqual({ lines: [] })
  })
})
