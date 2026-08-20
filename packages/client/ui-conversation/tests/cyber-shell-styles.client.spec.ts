import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootCss = readFileSync(fileURLToPath(new URL(
  '../src/client/skeleton/ConversationRoot.module.css', import.meta.url,
)), 'utf8')
const inputCss = readFileSync(fileURLToPath(new URL(
  '../src/client/skeleton/InputBar.module.css', import.meta.url,
)), 'utf8')
const heroCss = readFileSync(fileURLToPath(new URL(
  '../src/client/skeleton/HeroShell.module.css', import.meta.url,
)), 'utf8')
const chatCss = readFileSync(fileURLToPath(new URL(
  '../src/client/chat/ChatView.module.css', import.meta.url,
)), 'utf8')
const messageCss = readFileSync(fileURLToPath(new URL(
  '../src/client/chat/MessageItem.module.css', import.meta.url,
)), 'utf8')
const approvalCss = readFileSync(fileURLToPath(new URL(
  '../src/client/skeleton/ApprovalPanel.module.css', import.meta.url,
)), 'utf8')
const inputSource = readFileSync(fileURLToPath(new URL(
  '../src/client/skeleton/InputBar.tsx', import.meta.url,
)), 'utf8')
const chatNodeSeatSource = readFileSync(fileURLToPath(new URL(
  '../src/client/chat/ChatNodeSeat.tsx', import.meta.url,
)), 'utf8')

describe('Cyber shared conversation shell', () => {
  it('uses technical shared chrome for the root, header and active tab', () => {
    expect(rootCss).toContain(":global(body[data-theme-id='cyber']) .root")
    expect(rootCss).toContain(":global(body[data-theme-id='cyber']) .header")
    expect(rootCss).toContain(":global(body[data-theme-id='cyber']) .tabActive")
    expect(rootCss).toContain('var(--dsw-specific-workbench-rail-border)')
    expect(rootCss).toContain('var(--dsw-specific-workbench-role-accent)')
    expect(rootCss).toContain('var(--dsw-specific-cyber-grid)')
    expect(rootCss).toContain('var(--dsw-specific-cyber-glass)')
  })

  it('does not fabricate agent preset labels through decorative CSS content', () => {
    expect(rootCss).not.toContain("content: 'PTC 模式'")
    expect(rootCss).not.toContain("content: '当前代理预设 · DSH_BOOT'")
    expect(rootCss).not.toContain('.titleCluster::after')
    expect(rootCss).not.toContain("[data-workbench-kind='conversation']) .header::before")
  })

  it('keeps every composer seat but gives its card and actions Cyber chrome', () => {
    expect(inputCss).toContain(":global(body[data-theme-id='cyber']) .card")
    expect(inputCss).toContain(":global(body[data-theme-id='cyber']) .card:focus-within")
    expect(inputCss).toContain(":global(body[data-theme-id='cyber']) .primary")
    expect(inputCss).toContain('var(--dsw-specific-workbench-rail-fill)')
    expect(inputCss).toContain('var(--dsw-specific-workbench-rail-border)')
    expect(inputCss).toContain('var(--dsw-specific-cyber-carbon)')
    expect(inputCss).toContain('var(--dsw-specific-cyber-glass)')
  })

  it('keeps the blank-session arrival stage transparent around the composer card', () => {
    const heroSeat = rootCss.match(
      /:global\(body\[data-theme-id='cyber'\]\) \.root\[data-phase='hero'\] \.composerSeat\s*\{([^}]*)\}/,
    )?.[1] ?? ''

    expect(heroSeat).toContain('background-image: none')
    expect(heroSeat).toContain('box-shadow: none')
  })

  it('lets Night City show through the blank-session card and keeps the portrait in frame', () => {
    const heroCard = inputCss.match(
      /:global\(body\[data-theme-id='cyber'\]\) :global\(\[data-phase='hero'\]\) \.card\s*\{([^}]*)\}/,
    )?.[1] ?? ''

    expect(heroCard).toContain('42%, transparent')
    expect(heroCard).toContain('background-image: var(--dsw-specific-cyber-carbon)')
    expect(heroCss).toContain('object-position: right center')
    expect(heroCss).toContain('opacity: 1')
    expect(heroCss).toContain('brightness(0.96)')
    const portraitLift = Array.from(heroCss.matchAll(/\.cityPortraitLift\s*\{([^}]*)\}/g))
      .map(match => match[1])
      .join('\n')
    expect(portraitLift).toContain('z-index: 4')
    expect(portraitLift).toContain('brightness(1.08)')
    expect(portraitLift).toContain('mask-image: radial-gradient')
  })

  it('keeps A and B on the same mirrored portrait-ledger geometry', () => {
    expect(chatCss).toContain("[data-workbench-kind='conversation']")
    expect(chatCss).toContain("[data-persona-role='assistant']")
    expect(chatCss).toContain("[data-workbench-kind='code']")
    expect(messageCss).toContain("[data-workbench-kind='conversation']")
    expect(messageCss).toContain("[data-workbench-kind='code']")
    expect(chatCss).toContain('cyber-frame-corners.svg')
    expect(messageCss).toContain("[data-workbench-kind='conversation']) .bubble {\n  box-sizing: border-box;\n  width: 100%;")
    expect(chatCss).toContain("[data-workbench-kind='code']) .flowItem:has(:global([data-persona-role='user']))")
    expect(chatCss).toContain('grid-template-columns: minmax(0, 1fr) 88px')
    expect(chatCss).toContain('grid-template-columns: 88px minmax(0, 1fr)')
    expect(chatCss).not.toContain('grid-template-columns: 54px minmax(0, 1fr)')
    expect(chatCss).not.toContain('padding: 14px 18px 14px 116px')
    expect(messageCss).toContain('var(--dsw-specific-cyber-carbon)')
    expect(chatNodeSeatSource).toContain('className={css.personaSeat}')
    expect(chatNodeSeatSource).toContain('className={css.nodeSeat}')
    expect(chatCss).toContain('.personaSeat')
    expect(chatCss).toContain('.nodeSeat')
  })

  it('uses a project decoration asset around the Cyber composer instead of a plain CSS box', () => {
    expect(inputCss).toContain('cyber-frame-corners.svg')
    expect(inputCss).toContain('.card::before')
    expect(inputCss).toContain('.card::after')
    expect(inputCss).toContain('@keyframes cyber-composer-energy')
    expect(rootCss).toContain('@keyframes cyber-view-refract')
    expect(inputSource).toContain("t('input.sendShort')")
    expect(inputSource).toContain('data-primary-label={primaryVisualLabel}')
    expect(inputCss).toContain('content: attr(data-primary-label)')
  })

  it('renders the real C approval takeover as the red trajectory risk panel', () => {
    expect(approvalCss).toContain("[data-workbench-kind='trajectory']")
    expect(approvalCss).toContain('var(--dsw-alias-state-error-primary)')
    expect(approvalCss).toContain('var(--dsw-specific-workbench-danger-outline)')
  })

  it('removes composer activity animation for reduced-motion users', () => {
    const reduced = inputCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? ''
    expect(reduced).toContain('.pending')
    expect(reduced).toContain('animation: none')
  })
})
