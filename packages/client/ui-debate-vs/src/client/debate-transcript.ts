/**
 * Pure fold of one debate child's transcript page into side lines: only the
 * child's assistant outputs (its speeches) render — the host's inbox prompts
 * are instruction plumbing, not debate content, and stay invisible. Tool
 * calls, reasoning, and other log events are invisible too. Wire-tolerant
 * narrow — the page crosses the RPC boundary as untyped JSON.
 */

/** One extracted transcript line from a debate child's log. */
export interface SideLine {
  /** Complete markdown text of one child speech. */
  text: string
}

/** Folded view of one side's live transcript. */
export interface SideTranscript {
  /** Speeches in log order (latest last). */
  lines: readonly SideLine[]
}

/** Stable empty transcript for undispatched or unreadable sides. */
export const EMPTY_SIDE_TRANSCRIPT: SideTranscript = { lines: [] }

/** Concatenate the text blocks of one message event's data (assistant messages nest content under `message`). */
function eventText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return ''
  const nested = (data as { message?: unknown }).message
  const content = (data as { content?: unknown }).content
    ?? (typeof nested === 'object' && nested !== null ? (nested as { content?: unknown }).content : undefined)
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const candidate = block as { type?: unknown; text?: unknown }
    if (candidate.type === 'text' && typeof candidate.text === 'string') text += candidate.text
  }
  return text
}

/** One history page entry: the raw event under the optional render intent. */
export type TranscriptHistoryEntry = { event?: { type?: string; data?: unknown } }

/**
 * Fold one transcript page into side speeches.
 * @param entries - history page entries (event + optional render intent).
 * @returns the folded transcript.
 */
export function foldSideTranscript(entries: readonly TranscriptHistoryEntry[]): SideTranscript {
  const lines: SideLine[] = []
  for (const entry of entries) {
    const event = entry.event
    if (event === undefined || event.data === undefined || event.type !== 'assistant/message') continue
    const text = eventText(event.data)
    if (text === '') continue
    lines.push({ text })
  }
  return { lines }
}
