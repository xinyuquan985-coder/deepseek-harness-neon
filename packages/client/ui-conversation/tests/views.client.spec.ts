import { describe, expect, it } from 'vitest'
import { resolveActiveView, type ViewTab } from '../src/client/contract/views.ts'

const CHAT = { id: 'chat', label: '对话' }
const TRAJECTORY = { id: 'trajectory', label: '轨迹' }
const DEBATE = { id: 'debate-vs', label: 'VS 对决' }
const TABS: readonly ViewTab[] = [CHAT, TRAJECTORY, DEBATE]

const debateDefault = (agentPreset: string | undefined): string | null =>
  agentPreset === 'debate' ? 'debate-vs' : null

describe('resolveActiveView', () => {
  it('falls back to chat with no persisted selection and no resolver', () => {
    expect(resolveActiveView(TABS, null)).toBe(CHAT)
  })

  it('names the resolver view for a matching agent preset', () => {
    expect(resolveActiveView(TABS, null, debateDefault, 'debate')).toBe(DEBATE)
  })

  it('falls back to chat when the resolver declines the preset', () => {
    expect(resolveActiveView(TABS, null, debateDefault, 'standard')).toBe(CHAT)
    expect(resolveActiveView(TABS, null, debateDefault, undefined)).toBe(CHAT)
  })

  it('keeps a user-picked selection over the default resolver', () => {
    expect(resolveActiveView(TABS, 'trajectory', debateDefault, 'debate', true)).toBe(TRAJECTORY)
    expect(resolveActiveView(TABS, 'chat', debateDefault, 'debate', true)).toBe(CHAT)
  })

  it('lets the preset default win over an unpicked persisted chat pick (pre-default history)', () => {
    expect(resolveActiveView(TABS, 'chat', debateDefault, 'debate', false)).toBe(DEBATE)
    expect(resolveActiveView(TABS, 'chat', debateDefault, 'debate')).toBe(DEBATE)
    // Without a resolver, the persisted chat pick still resolves to chat.
    expect(resolveActiveView(TABS, 'chat', undefined, 'debate')).toBe(CHAT)
  })

  it('lets the preset default own an unpicked session even with a non-chat stale id', () => {
    expect(resolveActiveView(TABS, 'trajectory', debateDefault, 'debate', false)).toBe(DEBATE)
  })

  it('falls back to chat when the resolver names an unregistered view', () => {
    const stale = (): string | null => 'waterfall'
    expect(resolveActiveView(TABS, null, stale, 'debate')).toBe(CHAT)
  })

  it('keeps stale persisted ids on the chat fallback', () => {
    expect(resolveActiveView(TABS, 'removed-view')).toBe(CHAT)
  })

  it('returns undefined with no registered tabs', () => {
    expect(resolveActiveView([], null, debateDefault, 'debate')).toBeUndefined()
  })
})
