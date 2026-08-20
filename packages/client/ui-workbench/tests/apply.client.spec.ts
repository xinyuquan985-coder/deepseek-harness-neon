/** ui-workbench apply wiring: one overview entry and locale registration. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry, type SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject } from '../src/client/index.ts'
import {
  WorkbenchInspector, type WorkbenchInspectorInjected,
} from '../src/client/WorkbenchInspector.tsx'

const SLOT = 'conversation.details.overview'

async function bench() {
  const ctx = new Context()
  const actionCalls: { method: string; value: unknown }[] = []
  const openDetails = vi.fn()
  ctx.provide('sessions', {
    list: { getSnapshot: () => ({ byId: { session: { cwd: 'C:/workspace' } } }) },
    openSubagent: (value: unknown) => { actionCalls.push({ method: 'openChild', value }) },
    refreshSubagents: (value: unknown) => {
      actionCalls.push({ method: 'refreshSubagents', value })
      return Promise.resolve()
    },
  } as never)
  ctx.provide('workspaces', {
    openPath: (value: unknown) => {
      actionCalls.push({ method: 'openFile', value })
      return Promise.resolve()
    },
  } as never)
  ctx.provide('connection', {
    api: { subagents: { interrupt: (value: unknown) => {
      actionCalls.push({ method: 'interruptChild', value })
      return Promise.resolve({ result: { ok: true } })
    } } },
  } as never)
  ctx.provide('layout', { openDetails, closeDetails: vi.fn() } as never)
  await ctx.plugin(SlotRegistry).await()
  ctx.provide('locale', new LocaleRuntime(ctx))
  const slots = ctx.get('slots') as SlotRegistry
  slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'single', scope: 'session' } } } as never,
    () => null,
  )
  return { ctx, slots, actionCalls, openDetails }
}

describe('ui-workbench client apply', () => {
  it('declares its service dependencies', () => {
    expect(inject).toEqual(['slots', 'locale', 'sessions', 'workspaces', 'connection', 'layout'])
  })

  it('fills the overview seat and tears down the entry and locale together', async () => {
    const { ctx, slots, actionCalls, openDetails } = await bench()
    const locale = ctx.get('locale') as LocaleRuntime
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(openDetails).toHaveBeenCalledTimes(1)
    expect(slots.entries(SLOT).map(entry => entry.component)).toEqual([WorkbenchInspector])
    const entry = slots.entries(SLOT)[0]!
    const actions = (entry.inject as unknown as (id: SessionId) => WorkbenchInspectorInjected)('session' as SessionId)
    const address = { parentSessionId: 'session', childSessionId: 'child', mode: 'continuable' } as const
    actions.openChild(address as never)
    actions.interruptChild(address as never)
    actions.openFile('src/app.tsx')
    await Promise.resolve()
    expect(actionCalls).toEqual([
      { method: 'openChild', value: address },
      { method: 'interruptChild', value: address },
      { method: 'openFile', value: 'C:/workspace/src/app.tsx' },
      { method: 'refreshSubagents', value: 'session' },
    ])
    expect(locale.bind('workbench')('kind.conversation')).toBe('任务控制栏')
    await fiber.dispose()
    expect(slots.entries(SLOT)).toHaveLength(0)
    expect(locale.bind('workbench')('kind.conversation')).toBe('kind.conversation')
  })
})
