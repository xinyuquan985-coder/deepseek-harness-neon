// Host-backed semantic coverage for the three state-derived Cyber workbenches.
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { JobId } from '@deepseek-ai/dsh-jobs'
import {
  SESSION_FORMAT_VERSION, SessionId, type SessionEvent,
} from '@deepseek-ai/dsh-session'
import { snapshotSubagentDescriptor } from '@deepseek-ai/dsh-subagent'
import {
  captureStableAria,
  compareOrRefreshGolden,
  launchWebScaffold,
  seedSession,
  watchConsole,
  webSnapshotMode,
  type WebScaffold,
} from './scaffold.ts'
import { saveFailureShot, ZH_BROWSER_LOCALE } from './support.ts'

const SEED = fileURLToPath(new URL(
  './snapshots/cyber-workbenches/seed.jsonl',
  import.meta.url,
))
const APPROVAL_FIXTURE = fileURLToPath(new URL(
  './snapshots/approval-composer/session.jsonl',
  import.meta.url,
))
const APPROVAL_OVERRIDE = fileURLToPath(new URL(
  './snapshots/cyber-workbenches/approval.replay.override.json',
  import.meta.url,
))
const CONVERSATION_ID = 'cyber-workbench-conversation'
const CODE_ID = 'cyber-workbench-code'
const TRAJECTORY_ID = 'cyber-workbench-trajectory'
const SEARCH_ID = 'cyber-workbench-search'
const CONVERSATION_TITLE = '赛博朋克2077主题界面设计'
const CODE_TITLE = '赛博朋克2077主题界面设计'
const TRAJECTORY_TITLE = '赛博朋克2077主题界面设计'
const SEARCH_TITLE = '赛博朋克只读搜索会话'
const CAPTURE = process.env.DSH_CAPTURE_WORKBENCHES === '1'
const MODE = webSnapshotMode()
const APPROVAL_PROMPT = '请创建 approval-preview.txt，内容为 CYBER_APPROVAL_OK，并在最终系统级校验前申请一次受控提升权限。'
const A_EXPECTED = fileURLToPath(new URL(
  './snapshots/cyber-workbenches/A-1920.expected.md', import.meta.url,
))
const B_EXPECTED = fileURLToPath(new URL(
  './snapshots/cyber-workbenches/B-1920.expected.md', import.meta.url,
))
const C_EXPECTED = fileURLToPath(new URL(
  './snapshots/cyber-workbenches/C-1920.expected.md', import.meta.url,
))
const NEW_SESSION_EXPECTED = fileURLToPath(new URL(
  './snapshots/cyber-workbenches/New-Session-1920.expected.md', import.meta.url,
))

async function seedCollaborationChildren(
  scaffold: WebScaffold,
  parentSession: SessionId,
  prefix: string,
  children: readonly { mode: 'continuable' | 'one-shot'; label: string }[],
): Promise<void> {
  const createdAt = 1786075203000
  for (const [index, child] of children.entries()) {
    const id = SessionId(`cyber-workbench-${prefix}-${String(index + 1)}`)
    const time = createdAt + index * 100
    await scaffold.ctx.sessionPersistence.create({
      version: SESSION_FORMAT_VERSION,
      id,
      createdAt: time,
      cwd: scaffold.workspaceCwd,
      parentSession,
      origin: 'subagent',
      delegationDepth: 1,
    })
    await scaffold.ctx.sessionPersistence.append(id, [
      {
        type: 'turn/start', seq: 0, time,
        data: { turn: 1, trigger: { kind: 'message', source: { kind: 'user' } } },
      },
      {
        type: 'user/message', seq: 1, time: time + 1,
        data: {
          content: [{ type: 'text', text: `作为 ${child.label} 检查赛博朋克工作台。` }],
          source: { kind: 'user' },
        },
        surfaceOp: 'append',
      },
      {
        type: 'subagent/descriptor', seq: 2, time: time + 2,
        data: snapshotSubagentDescriptor({
          mode: child.mode,
          provider: 'spawn',
          label: child.label,
        }),
      },
      {
        type: 'turn/end', seq: 3, time: time + 3,
        data: { turn: 1, reason: { kind: 'completed' } },
      },
    ] as SessionEvent[])
    await scaffold.ctx.sessionProjectionCache.coldSnapshot(id)
  }
}

async function applyCyberTheme(page: Page): Promise<void> {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '设置' })
  await dialog.waitFor({ timeout: 10_000 })
  const cyber = dialog.getByRole('button', { name: '赛博朋克' })
  if (await cyber.getAttribute('aria-pressed') !== 'true') await cyber.click()
  await expect.poll(() => cyber.getAttribute('aria-pressed'), { timeout: 5_000 }).toBe('true')
  await page.keyboard.press('Escape')
}

async function expectApprovedWideGeometry(page: Page): Promise<void> {
  const geometry = await page.locator('[data-shell-layout="three-column"]').evaluate((shell) => {
    const tracks = getComputedStyle(shell).gridTemplateColumns
      .split(' ')
      .map(value => Number.parseFloat(value))
    const surface = shell.querySelector<HTMLElement>(
      '[data-chat-flow], [data-trajectory-workbench]',
    )?.getBoundingClientRect()
    const composer = (
      document.querySelector<HTMLElement>('[data-approval-key]')
      ?? document.querySelector<HTMLElement>('[data-composer-card]')
    )?.getBoundingClientRect()
    return {
      sidebar: tracks[0] ?? 0,
      center: tracks[1] ?? 0,
      details: tracks[2] ?? 0,
      surface: surface?.width ?? 0,
      composer: composer?.width ?? 0,
    }
  })
  expect(geometry.sidebar).toBeGreaterThanOrEqual(292)
  expect(geometry.sidebar).toBeLessThanOrEqual(324)
  expect(geometry.details).toBeGreaterThanOrEqual(388)
  expect(geometry.details).toBeLessThanOrEqual(460)
  expect(geometry.surface / geometry.center).toBeGreaterThanOrEqual(0.82)
  expect(geometry.composer / geometry.center).toBeGreaterThanOrEqual(0.86)
}

async function expectMirroredConversationRoles(page: Page): Promise<void> {
  const geometry = await page.locator('[data-chat-flow]').evaluate((flow) => {
    const roleRow = (role: 'user' | 'assistant') => {
      const persona = flow.querySelector<HTMLElement>(`[data-persona-role="${role}"]`)
      const row = persona?.closest<HTMLElement>('[data-chat-flow-kind]') ?? null
      const personaShell = row === null || persona === null
        ? null
        : [...row.children].find(child => child.contains(persona)) as HTMLElement | undefined
      const messageShell = row === null || personaShell === null || personaShell === undefined
        ? null
        : [...row.children].find(child => child !== personaShell) as HTMLElement | undefined
      const image = persona?.querySelector<HTMLElement>('[data-persona-asset]')
      const avatar = persona?.querySelector<HTMLElement>('[aria-hidden="true"]')
      const avatarRect = avatar?.getBoundingClientRect()
      const messageRect = messageShell?.getBoundingClientRect()
      const transform = image === null || image === undefined
        ? 1
        : new DOMMatrix(getComputedStyle(image).transform).a
      return {
        avatar: avatarRect === undefined ? null : {
          left: avatarRect.left,
          right: avatarRect.right,
          width: avatarRect.width,
          height: avatarRect.height,
        },
        message: messageRect === undefined ? null : {
          left: messageRect.left,
          right: messageRect.right,
        },
        rowBorder: row === null ? null : getComputedStyle(row).borderTopWidth,
        transform,
      }
    }
    return { assistant: roleRow('assistant'), user: roleRow('user') }
  })
  expect(geometry.assistant.rowBorder).toBe('0px')
  expect(geometry.user.rowBorder).toBe('0px')
  expect(geometry.assistant.avatar?.width).toBeCloseTo(82, 0)
  expect(geometry.assistant.avatar?.height).toBeCloseTo(80, 0)
  expect(geometry.user.avatar?.width).toBeCloseTo(82, 0)
  expect(geometry.user.avatar?.height).toBeCloseTo(80, 0)
  expect(geometry.assistant.avatar!.right).toBeLessThan(geometry.assistant.message!.left)
  expect(geometry.user.avatar!.left).toBeGreaterThan(geometry.user.message!.right)
  expect(geometry.user.transform).toBeLessThan(0)
  expect(geometry.assistant.transform).toBeGreaterThan(0)
}

async function setViewport(page: Page, viewport: { width: number; height: number }): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      page.setViewportSize(viewport),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`viewport resize timed out at ${String(viewport.width)}x${String(viewport.height)}`))
        }, 5_000)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

async function captureWorkbenchAria(page: Page, scaffold: WebScaffold): Promise<string> {
  const snapshot = await captureStableAria(
    page,
    '[data-shell-layout="three-column"]',
    scaffold.workspaceCwd,
  )
  return snapshot
    .replaceAll(basename(scaffold.workspaceCwd), '{{workspace}}')
    .replace(/- button "\d{4}-\d{2}-\d{2} \{\{clock\}\}"/g, '- button "{{date}} {{clock}}"')
    // Scroll position can cross the one-pixel threshold after the rest of the
    // shell settles. Its floating affordance is covered behaviorally and must
    // not make the workbench structure golden alternate between two states.
    .replace('\n- button "回到底部":\n  - img', '')
}

async function scrollConversationToTop(page: Page): Promise<void> {
  await page.locator('[data-conversation-scroll]').evaluate((element) => {
    element.scrollTop = 0
  })
}

/** Add settled terminal and mutation calls so the committed seed covers real B evidence. */
function withCodeTurn(seed: string): string {
  const terminalName = process.platform === 'win32' ? 'pwsh' : 'bash'
  const session = seed.split('\n').find(line => line.includes('"type":"session"'))
  if (session === undefined) throw new Error('Cyber workbench seed is missing its Session header')
  const events = [
    { type: 'turn/start', seq: 0, time: 1786075201000, data: { turn: 1, trigger: { kind: 'message', source: { kind: 'user', rpcId: '{{rpcId}}' } } } },
    { type: 'user/message', seq: 1, time: 1786075201001, data: { content: [{ type: 'text', text: '主题激活后会话面板当前没有渲染消息，请做一次更细的探查：活动视图、聊天节点数、头部按钮清单。' }], source: { kind: 'user', rpcId: '{{rpcId}}' } }, surfaceOp: 'append' },
    { type: 'session/title', seq: 2, time: 1786075201002, data: { title: CODE_TITLE, messageSeqs: [1], source: { kind: 'fallback' } } },
    { type: 'step/start', seq: 3, time: 1786075201003, data: { turn: 1, step: 1 } },
    { type: 'assistant/message', seq: 4, time: 1786075201004, data: { turn: 1, step: 1, content: [{ type: 'text', text: '页面停在无会话状态。先列出真实侧栏条目并点击验证，再核对空状态节点。' }], provenance: { provider: 'replay', model: 'replay' } }, surfaceOp: 'append' },
    { type: 'tool/call', seq: 5, time: 1786075201005, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_code', name: terminalName, arguments: JSON.stringify({ command: 'node tools/read_session_dom_snapshot.js --mode=live', description: '读取真实会话快照' }) } },
    { type: 'tool/result', seq: 6, time: 1786075201006, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_code', content: [{ type: 'text', text: '[info] context: browser=chrome headless=true viewport=1920x1080\n[info] sessions: none (fresh context)\n[info] sidebar items: 7\n[info] chat nodes: 0\n$ snapshot saved to artifacts/session_dom_snapshot.json\n$ done.' }], isError: false }, sourceEventSeqs: [5], surfaceOp: 'append' },
    { type: 'tool/call', seq: 7, time: 1786075201007, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_write', name: 'write', arguments: JSON.stringify({ file_path: 'src/components/ChatEmptyState.tsx', content: 'export function ChatEmptyState() {\n  return <div className="empty state--active">开始新会话以查看内容</div>\n}\n' }) } },
    { type: 'tool/result', seq: 8, time: 1786075201008, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_write', content: [{ type: 'text', text: 'Wrote src/components/ChatEmptyState.tsx' }], isError: false }, sourceEventSeqs: [7], surfaceOp: 'append' },
    { type: 'tool/call', seq: 9, time: 1786075201009, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_write_styles', name: 'write', arguments: JSON.stringify({ file_path: 'src/styles/empty.state.ts', content: 'export const emptyState = { active: true }\n' }) } },
    { type: 'tool/result', seq: 10, time: 1786075201010, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_write_styles', content: [{ type: 'text', text: 'Wrote src/styles/empty.state.ts' }], isError: false }, sourceEventSeqs: [9], surfaceOp: 'append' },
    { type: 'tool/call', seq: 11, time: 1786075201011, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_read', name: 'read', arguments: JSON.stringify({ file_path: 'session_probe_report.md' }) } },
    { type: 'tool/result', seq: 12, time: 1786075201012, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_read', content: [{ type: 'text', text: '# 会话探查报告\n活动视图：未渲染消息\n聊天节点数：0\n头部按钮：5 个' }], isError: false }, sourceEventSeqs: [11], surfaceOp: 'append' },
    { type: 'tool/call', seq: 13, time: 1786075201013, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_search', name: 'grep', arguments: JSON.stringify({ pattern: 'empty state--active', path: 'src' }) } },
    { type: 'tool/result', seq: 14, time: 1786075201014, data: { turn: 1, step: 1, callId: 'call_cyber_workbench_search', content: [{ type: 'text', text: 'src/components/ChatEmptyState.tsx:2\nsrc/styles/empty.state.ts:1' }], isError: false }, sourceEventSeqs: [13], surfaceOp: 'append' },
    { type: 'assistant/message', seq: 15, time: 1786075201015, data: { turn: 1, step: 1, content: [{ type: 'text', text: '代码工作台夹具执行完成。已生成两项真实变更与会话探查报告。' }], provenance: { provider: 'replay', model: 'replay' } }, surfaceOp: 'append' },
    { type: 'step/end', seq: 16, time: 1786075201016, data: { turn: 1, step: 1 } },
    { type: 'turn/end', seq: 17, time: 1786075201017, data: { turn: 1, reason: { kind: 'completed' } } },
  ]
  return `${session}\n${events.map(event => JSON.stringify(event)).join('\n')}\n`
}

/** Reuse real code evidence in a dedicated C session to prove trajectory wins routing. */
function withTrajectoryTurn(seed: string): string {
  return withCodeTurn(seed)
    .replace(CODE_TITLE, TRAJECTORY_TITLE)
    .replace('准备可复现的赛博朋克代码执行工作台。', '准备可复现的赛博朋克多代理轨迹工作台。')
    .replace('代码执行工作台基线已就绪。', '多代理轨迹工作台基线已就绪。')
    .replace('代码工作台夹具执行完成。', '多代理轨迹工作台夹具执行完成。')
}

/** Add a search-only Turn to prove discovery activity conservatively remains A. */
function withSearchTurn(seed: string): string {
  const titled = seed
    .replace(CONVERSATION_TITLE, SEARCH_TITLE)
    .replace('你重启了服务——DSH_BOOT——现在包含 persona 和 voice。立刻在真机上做最终验收采样。', '准备可复现的赛博朋克只读搜索会话。')
    .replace('侧栏结构与测试脚手架不同。先列出真实侧栏条目再点击，核对导航、任务控制栏和会话条目。', '只读搜索会话基线已就绪。')
  const events = [
    { type: 'turn/start', seq: 27, time: 1786075202000, data: { turn: 3, trigger: { kind: 'message', source: { kind: 'user', rpcId: '{{rpcId}}' } } } },
    { type: 'user/message', seq: 28, time: 1786075202001, data: { content: [{ type: 'text', text: '搜索内容，但不要修改任何文件。' }], source: { kind: 'user', rpcId: '{{rpcId}}' } }, surfaceOp: 'append' },
    { type: 'step/start', seq: 29, time: 1786075202002, data: { turn: 3, step: 1 } },
    { type: 'tool/call', seq: 30, time: 1786075202003, data: { turn: 3, step: 1, callId: 'call_cyber_workbench_search', name: 'grep', arguments: '{"pattern":"CYBER_WORKBENCH_SEARCH","path":"src"}' } },
    { type: 'tool/result', seq: 31, time: 1786075202004, data: { turn: 3, step: 1, callId: 'call_cyber_workbench_search', content: [{ type: 'text', text: 'No matches found.' }], isError: false }, sourceEventSeqs: [30], surfaceOp: 'append' },
    { type: 'assistant/message', seq: 32, time: 1786075202005, data: { turn: 3, step: 1, content: [{ type: 'text', text: '只读搜索夹具执行完成。' }], provenance: { provider: 'replay', model: 'replay' } }, surfaceOp: 'append' },
    { type: 'step/end', seq: 33, time: 1786075202006, data: { turn: 3, step: 1 } },
    { type: 'turn/end', seq: 34, time: 1786075202007, data: { turn: 3, reason: { kind: 'completed' } } },
  ]
  return `${titled.trimEnd()}\n${events.map(event => JSON.stringify(event)).join('\n')}\n`
}

async function openSession(page: Page, contentMarker: string): Promise<void> {
  // Cold sidebar summaries initially share the temporary workspace basename.
  // Content search is the stable product route for disambiguating the two
  // deterministic sessions, and exercises the real lazy history index.
  const searchButton = page.getByRole('button', { name: '搜索会话', exact: true })
  if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
  const search = page.getByRole('textbox', { name: '搜索会话…', exact: true })
  await search.fill(contentMarker)
  const results = page.getByRole('tree', { name: '搜索结果' }).getByRole('treeitem')
  await expect.poll(() => results.count(), {
    timeout: 20_000,
    message: `one search result for ${JSON.stringify(contentMarker)}`,
  }).toBe(1)
  await results.click()
  await page.getByRole('tab', { name: '对话', exact: true }).waitFor({ timeout: 30_000 })
  await page.getByText(contentMarker, { exact: false }).first().waitFor({ timeout: 30_000 })
  await page.getByRole('button', { name: '清除搜索', exact: true }).click()
  await expect.poll(
    () => searchButton.getAttribute('aria-expanded'),
    { timeout: 5_000 },
  ).toBe('false')
}

describe('web e2e: Cyber three workbenches', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  const backgroundJobs: JobId[] = []
  let detachJobController: (() => void) | undefined
  let tripwire: ReturnType<typeof watchConsole>

  function startBackgroundJob(label: string): void {
    const completion = Promise.withResolvers<{ status: 'killed' }>()
    const jobId = scaffold.ctx.jobs.start({
      kind: 'bash',
      label,
      run: () => ({
        cancel: () => { completion.resolve({ status: 'killed' }) },
        done: completion.promise,
      }),
    })
    backgroundJobs.push(JobId(jobId))
  }

  beforeAll(async () => {
    scaffold = await launchWebScaffold({
      replayFixture: APPROVAL_FIXTURE,
      replayOverride: APPROVAL_OVERRIDE,
      paceMs: 15,
    })
    const raw = await readFile(SEED, 'utf8')
    const conversationId = await seedSession(scaffold, raw, CONVERSATION_ID)
    await seedCollaborationChildren(scaffold, conversationId, 'conversation', [
      { mode: 'continuable', label: 'Netrunner_47' },
      { mode: 'one-shot', label: 'Blackwall_AI' },
    ])
    await seedSession(scaffold, withCodeTurn(raw), CODE_ID)
    const trajectoryId = await seedSession(scaffold, withTrajectoryTurn(raw), TRAJECTORY_ID)
    await seedCollaborationChildren(scaffold, trajectoryId, 'trajectory', [
      { mode: 'continuable', label: 'DSH_BOOT' },
      { mode: 'continuable', label: 'ORA-RESEARCH' },
      { mode: 'one-shot', label: 'ORA-CODER' },
      { mode: 'one-shot', label: 'ORA-REVIEW' },
    ])
    await seedSession(scaffold, withSearchTurn(raw), SEARCH_ID)
    await scaffold.ctx.workspaceRegistry.create(scaffold.workspaceCwd, 'deepseek harness')
    detachJobController = scaffold.ctx.jobs.attachController('cyber-workbench-fixtures')
    startBackgroundJob('probe_live_view')
    startBackgroundJob('diff_sidebar_structure')
    browser = await chromium.launch()
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      locale: ZH_BROWSER_LOCALE,
    })
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    for (const job of backgroundJobs) {
      scaffold?.ctx.jobs.kill(job, undefined, 'Cyber workbench fixture teardown')
    }
    detachJobController?.()
    await browser?.close()
    await scaffold?.close()
  })

  it('renders the Night City New Session arrival', async () => {
    onTestFailed(() => saveFailureShot(page, 'cyber-workbench-new-session'))
    await setViewport(page, { width: 1920, height: 1080 })
    await applyCyberTheme(page)
    await page.getByRole('button', { name: '新建会话', exact: true }).last().click()

    const backdrop = page.locator('[data-cyber-empty-backdrop]')
    await backdrop.waitFor({ timeout: 10_000 })
    const artwork = backdrop.locator('[data-cyber-hero-asset="night-city-access-lobby-v1"]')
    await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
    }))).toEqual({ complete: true, naturalWidth: 1707 })
    await page.getByText('黑墙接入待命', { exact: true }).waitFor()
    await page.locator('[data-composer-card] textarea').waitFor()

    const arrivalSurface = await page.locator('[data-composer-seat]').evaluate((seat) => {
      const style = getComputedStyle(seat)
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        boxShadow: style.boxShadow,
      }
    })
    expect(arrivalSurface).toEqual({
      backgroundColor: 'rgba(0, 0, 0, 0)',
      backgroundImage: 'none',
      boxShadow: 'none',
    })

    const arrivalComposition = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('[data-composer-card]')!
      const artwork = document.querySelector<HTMLElement>('[data-cyber-hero-asset]')!
      const portrait = document.querySelector<HTMLImageElement>('[data-cyber-hero-portrait-layer]')!
      const cardStyle = getComputedStyle(card)
      const artworkStyle = getComputedStyle(artwork)
      const portraitStyle = getComputedStyle(portrait)
      return {
        cardBackgroundColor: cardStyle.backgroundColor,
        cardBackgroundImage: cardStyle.backgroundImage,
        artworkObjectPosition: artworkStyle.objectPosition,
        artworkOpacity: artworkStyle.opacity,
        artworkFilter: artworkStyle.filter,
        portraitUsesArtwork: portrait.src === (artwork as HTMLImageElement).src,
        portraitZIndex: portraitStyle.zIndex,
        portraitFilter: portraitStyle.filter,
        portraitMask: portraitStyle.maskImage,
      }
    })
    expect(arrivalComposition.cardBackgroundColor).toMatch(/0\.42/)
    expect(arrivalComposition.cardBackgroundImage).toContain('repeating-linear-gradient')
    expect(arrivalComposition.cardBackgroundImage).not.toContain('linear-gradient(145deg')
    expect(arrivalComposition.artworkObjectPosition).toBe('100% 50%')
    expect(arrivalComposition.artworkOpacity).toBe('1')
    expect(arrivalComposition.artworkFilter).toContain('brightness(0.96)')
    expect(arrivalComposition.portraitUsesArtwork).toBe(true)
    expect(arrivalComposition.portraitZIndex).toBe('4')
    expect(arrivalComposition.portraitFilter).toContain('brightness(1.08)')
    expect(arrivalComposition.portraitMask).toContain('radial-gradient')

    const geometry = await page.locator('[data-conversation-scroll]').evaluate((scrollport) => {
      const backdrop = scrollport.querySelector<HTMLElement>('[data-cyber-empty-backdrop]')
      const scrollRect = scrollport.getBoundingClientRect()
      const backdropRect = backdrop?.getBoundingClientRect()
      return {
        scroll: { width: scrollRect.width, height: scrollRect.height },
        backdrop: backdropRect === undefined
          ? null
          : { width: backdropRect.width, height: backdropRect.height },
        fitsViewport: document.documentElement.scrollWidth <= window.innerWidth,
      }
    })
    expect(Math.abs((geometry.backdrop?.width ?? 0) - geometry.scroll.width))
      .toBeLessThanOrEqual(12)
    expect(geometry.backdrop?.height).toBeCloseTo(geometry.scroll.height, 0)
    expect(geometry.fitsViewport).toBe(true)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => artwork.evaluate(image => getComputedStyle(image).animationName))
      .toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    const snapshot = await captureWorkbenchAria(page, scaffold)
    await compareOrRefreshGolden(NEW_SESSION_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
    if (CAPTURE) {
      await page.screenshot({
        path: fileURLToPath(new URL(
          './snapshots/cyber-workbenches/New-Session-1920.actual.png',
          import.meta.url,
        )),
      })
    }
  }, 45_000)

  it('renders A conversation workbench', async () => {
    onTestFailed(() => saveFailureShot(page, 'cyber-workbench-A'))
    // Hydrate each real session summary once so the approved sidebar shows
    // Chinese history titles rather than cold-cache cwd fallbacks.
    await openSession(page, '多代理轨迹工作台夹具执行完成。')
    await openSession(page, '代码工作台夹具执行完成。')
    await openSession(page, '只读搜索夹具执行完成。')
    await openSession(page, '侧栏结构与测试脚手架不同。')
    await applyCyberTheme(page)
    await expect.poll(
      () => page.locator('[data-testid="workbench-inspector"][data-workbench-kind="conversation"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
    ]) {
      await setViewport(page, viewport)
      await scrollConversationToTop(page)
      await expect.poll(async () => {
        const box = await page.locator('[data-details-mode="overview"]').boundingBox()
        return box?.width ?? 0
      }, {
        timeout: 5_000,
        message: `A mission-control rail is visible at ${String(viewport.width)}px`,
      }).toBeGreaterThanOrEqual(300)
      if (CAPTURE) {
        await page.screenshot({
          path: fileURLToPath(new URL(
            `./snapshots/cyber-workbenches/A-${String(viewport.width)}.actual.png`,
            import.meta.url,
          )),
        })
      }
    }
    await setViewport(page, { width: 1920, height: 1080 })
    await expectApprovedWideGeometry(page)
    await expectMirroredConversationRoles(page)
    await expect.poll(() => page.getByText('PTC 模式', { exact: true }).count()).toBe(0)
    await expect.poll(
      () => page.getByText('当前代理预设 · DSH_BOOT', { exact: true }).count(),
    ).toBe(0)

    const settingsTrigger = page.getByRole('button', { name: '设置', exact: true })
    await settingsTrigger.click()
    const settingsDialog = page.getByRole('dialog', { name: '设置', exact: true })
    await settingsDialog.waitFor()
    expect(await settingsDialog.evaluate(dialog => (
      dialog.parentElement?.parentElement === document.body
      && dialog.contains(document.elementFromPoint(
        dialog.getBoundingClientRect().left + dialog.getBoundingClientRect().width / 2,
        dialog.getBoundingClientRect().bottom - 20,
      ))
    ))).toBe(true)
    await page.keyboard.press('Escape')

    const collaborationTrigger = page.locator('[data-collaboration-trigger]')
    await collaborationTrigger.click()
    const collaborationMenu = page.locator('[data-collaboration-menu]')
    await collaborationMenu.waitFor()
    expect(await collaborationMenu.evaluate(menu => (
      menu.parentElement === document.body
      && menu.contains(document.elementFromPoint(
        menu.getBoundingClientRect().left + menu.getBoundingClientRect().width / 2,
        menu.getBoundingClientRect().top + Math.min(40, menu.getBoundingClientRect().height / 2),
      ))
    ))).toBe(true)
    await page.keyboard.press('Escape')

    await page.getByRole('heading', { name: '任务控制栏', exact: true }).waitFor()
    await expect.poll(() => page.locator('[data-testid="workbench-section-goal"]').count()).toBe(1)
    await expect.poll(() => page.locator('[data-testid="workbench-section-todos"][data-count="4"]').count()).toBe(1)
    await expect.poll(() => page.locator('[data-testid="workbench-section-jobs"][data-count="2"]').count()).toBe(1)
    await expect.poll(() => page.locator('[data-testid="workbench-section-subagents"][data-count="2"]').count()).toBe(1)
    await expect.poll(() => page.locator('[data-testid="workbench-section-deliverables"][data-count="2"]').count()).toBe(1)
    const snapshot = await captureWorkbenchAria(page, scaffold)
    await compareOrRefreshGolden(A_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
  }, 45_000)

  it('concedes the shared shell at 1024 and narrow widths', async () => {
    onTestFailed(() => saveFailureShot(page, 'cyber-workbench-responsive'))
    await setViewport(page, { width: 1024, height: 768 })
    await expect.poll(
      () => page.locator('[data-shell-layout="three-column"]').getAttribute('data-details-mode'),
      { timeout: 5_000 },
    ).toBe('collapsed')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)

    await setViewport(page, { width: 1023, height: 768 })
    await expect.poll(
      () => page.locator('[data-shell-layout="three-column"]').getAttribute('data-viewport-mode'),
      { timeout: 5_000 },
    ).toBe('narrow')
    await expect.poll(
      () => page.locator('[data-shell-layout="three-column"]').getAttribute('data-sidebar-mode'),
      { timeout: 5_000 },
    ).toBe('collapsed')

    await setViewport(page, { width: 720, height: 760 })
    await expect.poll(
      () => page.locator('[data-shell-layout="three-column"]').getAttribute('data-details-mode'),
      { timeout: 5_000 },
    ).toBe('collapsed')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => page.evaluate(
      () => getComputedStyle(document.body, '::after').animationName,
    )).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await setViewport(page, { width: 1920, height: 1080 })
    const composer = page.getByRole('textbox', { name: '给智能体发消息' })
    await composer.fill('赛博朋克草稿在工作台导航后仍应保留。')
    await page.getByRole('tab', { name: '轨迹', exact: true }).click()
    await page.getByRole('tab', { name: '对话', exact: true }).click()
    await expect.poll(() => composer.inputValue()).toBe('赛博朋克草稿在工作台导航后仍应保留。')
    await composer.fill('')
    expect(tripwire.pageErrors).toEqual([])
  }, 45_000)

  it('renders B code execution workbench', async () => {
    onTestFailed(() => saveFailureShot(page, 'cyber-workbench-B'))
    await setViewport(page, { width: 1920, height: 1080 })
    await openSession(page, '代码工作台夹具执行完成。')
    await applyCyberTheme(page)
    await expect.poll(
      () => page.locator('[data-testid="workbench-inspector"][data-workbench-kind="code"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    await expectApprovedWideGeometry(page)
    await expectMirroredConversationRoles(page)
    await page.getByRole('heading', { name: '本轮变更', exact: true }).waitFor()
    await expect.poll(
      () => page.locator('[data-tool-ledger][data-card-kind="terminal"]').count(),
      { timeout: 5_000 },
    ).toBeGreaterThanOrEqual(1)
    await expect.poll(
      () => page.locator('[data-tool-ledger][data-card-kind="diff"]').count(),
      { timeout: 5_000 },
    ).toBeGreaterThanOrEqual(1)
    await expect.poll(
      () => page.locator('[data-testid="workbench-change-ledger"] [title="src/components/ChatEmptyState.tsx"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    await page.locator('[data-tool-ledger][data-card-kind="terminal"] [data-disclosure-row]').first().press('Enter')
    await page.locator('[data-tool-ledger][data-card-kind="diff"] [data-disclosure-row]').first().press('Enter')
    await expect.poll(
      () => page.locator('[data-tool-ledger] [data-terminal]').count(),
      { timeout: 5_000 },
    ).toBeGreaterThanOrEqual(1)
    await expect.poll(
      () => page.locator('[data-tool-ledger] [data-diff]').count(),
      { timeout: 5_000 },
    ).toBeGreaterThanOrEqual(1)
    await scrollConversationToTop(page)
    const snapshot = await captureWorkbenchAria(page, scaffold)
    await compareOrRefreshGolden(B_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
    if (CAPTURE) {
      await setViewport(page, { width: 1920, height: 1080 })
      await scrollConversationToTop(page)
      await page.screenshot({
        path: fileURLToPath(new URL(
          './snapshots/cyber-workbenches/B-1920.actual.png',
          import.meta.url,
        )),
      })
    }
  }, 45_000)

  it('keeps a search-only turn in A', async () => {
    onTestFailed(() => saveFailureShot(page, 'cyber-workbench-search'))
    await openSession(page, '只读搜索夹具执行完成。')
    await applyCyberTheme(page)
    await expect.poll(
      () => page.locator('[data-testid="workbench-inspector"][data-workbench-kind="conversation"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    await expect.poll(
      () => page.locator('[data-testid="workbench-change-ledger"]').count(),
      { timeout: 5_000 },
    ).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 45_000)

  it('renders C trajectory workbench', async () => {
    onTestFailed(() => saveFailureShot(page, 'cyber-workbench-C'))
    await openSession(page, '多代理轨迹工作台夹具执行完成。')
    await applyCyberTheme(page)
    await setViewport(page, { width: 1920, height: 1080 })
    startBackgroundJob('初始化浏览器上下文')
    startBackgroundJob('会话快照自动保存')
    const settled = scaffold.whenTurnSettled(60_000)
    const input = page.getByRole('textbox', { name: '给智能体发消息' })
    await input.fill(APPROVAL_PROMPT)
    await input.press('Enter')
    const approval = page.locator('[data-approval-key]')
    await approval.waitFor({ timeout: 60_000 })
    await page.getByRole('tab', { name: '轨迹', exact: true }).click()
    await expect.poll(
      () => page.locator('[data-testid="workbench-inspector"][data-workbench-kind="trajectory"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    await expectApprovedWideGeometry(page)
    await page.getByRole('heading', { name: '协同总览', exact: true }).waitFor()
    await expect.poll(
      () => page.locator('[data-trajectory-workbench="trajectory"][data-trajectory-composition="ledger-detail"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    await expect.poll(
      () => page.locator('[data-testid="workbench-trajectory-selection"]').count(),
      { timeout: 5_000 },
    ).toBe(1)
    await expect.poll(
      () => page.locator('[data-testid="workbench-section-subagents"][data-count="4"]').count(),
      { timeout: 10_000 },
    ).toBe(1)
    const agentFrames = page.locator('[data-collaboration-agent-frame]')
    await expect.poll(() => agentFrames.count(), { timeout: 10_000 }).toBe(4)
    const agentFrameGeometry = await agentFrames.evaluateAll(frames => frames.map((frame) => {
      const rect = frame.getBoundingClientRect()
      return { width: Math.round(rect.width), height: Math.round(rect.height) }
    }))
    expect(agentFrameGeometry).toEqual(Array.from({ length: 4 }, () => ({ width: 82, height: 80 })))
    await expect.poll(
      () => page.locator('[data-testid="workbench-section-jobs"][data-count="4"]').count(),
      { timeout: 10_000 },
    ).toBe(1)
    await expect.poll(
      () => page.locator('[data-testid="workbench-section-deliverables"] [title="approval-preview.txt"]').count(),
      { timeout: 10_000 },
    ).toBe(1)
    await expect.poll(() => page.locator('[data-approval-key]').count(), { timeout: 5_000 }).toBe(1)
    expect(await page.locator('[data-testid="workbench-inspector"][data-workbench-kind="trajectory"]').getAttribute('data-code-activity-count'))
      .not.toBe('0')
    const request = page.locator('button[data-label^="Request #"]').last()
    await request.focus()
    await request.press('Enter')
    await page.getByRole('complementary', { name: 'Event details' }).waitFor({ timeout: 5_000 })
    const snapshot = await captureWorkbenchAria(page, scaffold)
    await compareOrRefreshGolden(C_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
    if (CAPTURE) {
      await page.screenshot({
        path: fileURLToPath(new URL(
          './snapshots/cyber-workbenches/C-1920.actual.png',
          import.meta.url,
        )),
      })
    }
    await page.getByRole('complementary', { name: 'Event details' })
      .getByRole('button', { name: 'Close details' })
      .click()
    await expect.poll(() => page.evaluate(() => document.activeElement?.outerHTML ?? ''), {
      timeout: 5_000,
    }).toContain('data-label="Request #')
    await approval.getByRole('button', { name: '允许一次' }).click()
    await settled
    expect(await readFile(join(scaffold.workspaceCwd, 'approval-preview.txt'), 'utf8'))
      .toBe('CYBER_APPROVAL_OK')
    await expect.poll(() => page.locator('[data-approval-key]').count(), { timeout: 10_000 }).toBe(0)
  }, 90_000)
})
