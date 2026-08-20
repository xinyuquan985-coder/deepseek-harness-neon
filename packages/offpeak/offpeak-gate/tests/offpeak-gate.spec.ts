/**
 * Real-composition behavior suite for the off-peak host gate: boot the core
 * spine plus the gate with a scripted mock adapter and a stub settings
 * service, then prove the three paths — transparent while off, holding every
 * pre-step during peak while enabled, and resuming the moment the mode flips
 * off (the same mechanism resumes at the window edge).
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import * as Offpeak from '../src/index.ts'
import type { Config } from '../src/index.ts'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'

const NAMESPACE = settingsNamespace('ui-offpeak')

/** Mutable settings stub: the gate reads the section through ctx.get('settings'). */
function makeSettings(enabled: boolean) {
  const section = { enabled }
  return {
    section,
    get: (ns: unknown) => (ns === NAMESPACE ? section : undefined),
    register: () => {},
  }
}

async function harness(config: Config, enabled: boolean): Promise<{
  adapter: MockAdapter
  ctx: Context
  settings: ReturnType<typeof makeSettings>
}> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  const settings = makeSettings(enabled)
  ctx.provide('settings', settings as never)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(Offpeak, config)
  const adapter = new MockAdapter([textResponse('done')])
  ctx.llm.registerAdapter(['mock'], adapter)
  return { adapter, ctx, settings }
}

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const d = ctx.on('agent/status', ({ agent: s, status }) => {
      if (s === agent && status === 'idle') { d(); resolve() }
    })
  })
}

function drive(ctx: Context): Agent {
  const agent = ctx.agentLoop.create(SessionId('offpeak-a1'), { provider: 'mock', model: 'mock' })
  agent.followup(createUserMessage({ content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
  return agent
}

const sleep = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms) })

describe('offpeak host gate', () => {
  it('stays transparent while the mode is off', async () => {
    const { ctx } = await harness({ pollMs: 50 }, false)
    const agent = drive(ctx)
    await waitForIdle(ctx, agent)
    expect(agent.session.events.some(e => e.type === 'assistant/message')).toBe(true)
  })

  it('holds every pre-step while enabled during peak, then resumes on toggle-off', async () => {
    const { adapter, ctx, settings } = await harness({
      peakWindows: [{ startMinutes: 0, endMinutes: 1440 }],
      pollMs: 50,
    }, true)
    const agent = drive(ctx)
    await sleep(400)
    // The turn boundary opens before the first pre-step; the gate holds the
    // first STEP (and every later one), so no step or model output lands.
    expect(agent.session.events.some(e => e.type === 'step/start')).toBe(false)
    expect(agent.session.events.some(e => e.type === 'assistant/message')).toBe(false)
    expect(adapter.requests).toHaveLength(0)
    settings.section.enabled = false
    await waitForIdle(ctx, agent)
    expect(agent.session.events.some(e => e.type === 'assistant/message')).toBe(true)
    expect(adapter.requests).toHaveLength(1)
    expect(adapter.requests[0]?.provider).toBe('mock')
    expect(adapter.requests[0]?.model).toBe('mock')
    expect(JSON.stringify(adapter.requests[0]?.messages)).toContain('go')
  })

  it('passes immediately when enabled outside every peak window', async () => {
    const { ctx } = await harness({ peakWindows: [], pollMs: 50 }, true)
    const agent = drive(ctx)
    await waitForIdle(ctx, agent)
    expect(agent.session.events.some(e => e.type === 'assistant/message')).toBe(true)
  })

  it('does not cancel a model step that was already allowed to start', async () => {
    const { adapter, ctx, settings } = await harness({
      peakWindows: [{ startMinutes: 0, endMinutes: 1440 }],
      pollMs: 50,
    }, false)
    const dispose = ctx.on('session/event', (_session, event) => {
      if (event.type !== 'step/start') return
      settings.section.enabled = true
      dispose()
    })
    const agent = drive(ctx)
    await waitForIdle(ctx, agent)
    expect(adapter.requests).toHaveLength(1)
    expect(agent.session.events.some(e => e.type === 'assistant/message')).toBe(true)
  })
})
