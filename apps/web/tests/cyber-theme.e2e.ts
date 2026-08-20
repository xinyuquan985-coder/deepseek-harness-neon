// Web e2e scenario: the cyber theme skin over a cold-seeded session. The
// recorded seeded-history fixture is seeded cold, opened, and switched to the
// built-in cyber appearance through the real host and browser — the token
// palette, CRT scanline overlay, user bubble colors, persona rows (netrunner
// user / Blackwall AI assistant), and the voice toggle are asserted with zero
// model calls.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  captureStableAria, compareOrRefreshGolden, launchWebScaffold, seedSession, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { newEnglishPage, saveFailureShot } from './support.ts'

const UI_EXPECTED = fileURLToPath(new URL('./snapshots/cyber-theme/ui.expected.md', import.meta.url))
const CYBER_SEED = fileURLToPath(new URL('./snapshots/cyber-theme/seed.jsonl', import.meta.url))
const MODE = webSnapshotMode()
const SEED_ID = 'cyber-theme-web-e2e'

/** Read the cyber palette from the live body: token values + effects evidence. */
async function readCyberState(page: Page) {
  return await page.evaluate(() => {
    const body = document.body
    const cs = getComputedStyle(body)
    return {
      themeId: body.getAttribute('data-theme-id'),
      bgBase: cs.getPropertyValue('--dsw-alias-bg-base').trim(),
      brand: cs.getPropertyValue('--dsw-alias-brand-primary').trim(),
      bubble: cs.getPropertyValue('--dsw-specific-bubble').trim(),
      bubbleForeground: cs.getPropertyValue('--dsw-specific-bubble-foreground').trim(),
      borderL2: cs.getPropertyValue('--dsw-alias-border-l2').trim(),
      scanlines: getComputedStyle(body, '::after').backgroundImage,
    }
  })
}

describe('web e2e: cyber theme skin', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    const raw = await readFile(CYBER_SEED, 'utf8')
    await seedSession(scaffold, raw, SEED_ID)
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('applies the cyber palette, scanlines, persona rows, and the yellow user bubble', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-cyber-theme'))
    // Open the cold session through the sidebar (group row, then session row).
    const groupRow = page.locator('[role="treeitem"]').first()
    await groupRow.waitFor({ timeout: 15_000 })
    if ((await groupRow.getAttribute('aria-expanded')) === 'false') await groupRow.click()
    const sessionRow = page.locator('[role="treeitem"]').nth(1)
    await sessionRow.waitFor({ timeout: 10_000 })
    await sessionRow.click()
    await expect.poll(() => page.locator('[data-chat-flow-kind]').count(), { timeout: 15_000 }).toBeGreaterThan(0)

    // Flip the appearance through the fourth cube; the presenter then projects
    // the palette tokens and the data-theme-id effects gate.
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await dialog.waitFor({ timeout: 10_000 })
    const cyberCube = dialog.getByRole('button', { name: 'Cyberpunk' })
    await cyberCube.click()
    await expect.poll(() => cyberCube.getAttribute('aria-pressed'), { timeout: 5_000 }).toBe('true')
    await page.keyboard.press('Escape')

    await expect.poll(async () => (await readCyberState(page)).themeId, { timeout: 5_000 }).toBe('cyber')
    const state = await readCyberState(page)
    expect(state.bgBase).toBe('#05070D')
    expect(state.brand).toBe('#FCE400')
    expect(state.bubble).toBe('#FCE400')
    expect(state.bubbleForeground).toBe('#0A0A0A')
    expect(state.borderL2).toBe('rgba(0, 240, 255, 0.32)')
    expect(state.scanlines).toContain('repeating-linear-gradient')

    // Persona rows ride the keyed seat for user and assistant rows.
    const userPersona = page.locator('[data-persona-role="user"]').first()
    await userPersona.waitFor({ timeout: 10_000 })
    expect(await userPersona.textContent()).toContain('Netrunner')
    const assistantPersona = page.locator('[data-persona-role="assistant"]').first()
    await assistantPersona.waitFor({ timeout: 10_000 })
    expect(await assistantPersona.textContent()).toContain('Blackwall AI')

    // The user bubble wears the Night City yellow with near-black text.
    const bubble = page.locator('[data-chat-flow-kind="user"] [class*="bubble"]').first()
    await bubble.waitFor({ timeout: 10_000 })
    expect(await bubble.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(252, 228, 0)')
    expect(await bubble.evaluate(el => getComputedStyle(el).color)).toBe('rgb(10, 10, 10)')

    const snapshot = await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(UI_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
  }, 90_000)

  it('shows the off-peak toggle beside the mic and persists the flip', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-cyber-offpeak'))
    // Open the cold session through the sidebar so the resident composer (and
    // its tool row) mounts; then return to cyber so both controls are visible.
    const groupRow = page.locator('[role="treeitem"]').first()
    await groupRow.waitFor({ timeout: 15_000 })
    if ((await groupRow.getAttribute('aria-expanded')) === 'false') await groupRow.click()
    const sessionRow = page.locator('[role="treeitem"]').nth(1)
    await sessionRow.waitFor({ timeout: 10_000 })
    await sessionRow.click()
    await expect.poll(() => page.locator('[data-chat-flow-kind]').count(), { timeout: 15_000 }).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await dialog.waitFor({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Cyberpunk' }).click()
    await page.keyboard.press('Escape')
    await expect.poll(async () => (await readCyberState(page)).themeId, { timeout: 5_000 }).toBe('cyber')

    const offpeak = page.getByRole('button', { name: 'Off-peak mode' })
    await offpeak.waitFor({ timeout: 10_000 })
    expect(await offpeak.getAttribute('aria-pressed')).toBe('false')
    await offpeak.click()
    await expect.poll(() => offpeak.getAttribute('aria-pressed'), { timeout: 5_000 }).toBe('true')
    await expect.poll(async () => readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8'), { timeout: 5_000 })
      .toMatch(/ui-offpeak:\n\s+enabled: true/)

    // The dock line appears with a phase attribute; the copy is wall-clock
    // dependent, the phase presence is not.
    const dock = page.locator('[data-offpeak-phase]')
    await dock.waitFor({ timeout: 10_000 })
    expect(['paused', 'running']).toContain(await dock.getAttribute('data-offpeak-phase'))

    // The mic sits in the same row (its cyber gate holds).
    expect(await page.getByRole('button', { name: 'Voice input' }).count()).toBe(1)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('shows the voice toggle in the cyber theme and hides it in the light palette', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-cyber-voice'))
    await expect.poll(async () => (await readCyberState(page)).themeId, { timeout: 5_000 }).toBe('cyber')
    const mic = page.getByRole('button', { name: 'Voice input' })
    await mic.waitFor({ timeout: 10_000 })
    expect(await mic.count()).toBe(1)

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await dialog.waitFor({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Light' }).click()
    await page.keyboard.press('Escape')
    await expect.poll(async () => (await readCyberState(page)).themeId, { timeout: 5_000 }).toBe('light')
    // The toggle's CSS gate removes it from the accessibility tree entirely.
    expect(await page.getByRole('button', { name: 'Voice input' }).count()).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)
})
