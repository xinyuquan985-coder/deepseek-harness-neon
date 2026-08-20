import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL(
  '../src/client/WorkbenchInspector.module.css', import.meta.url,
)), 'utf8')
const source = readFileSync(fileURLToPath(new URL(
  '../src/client/WorkbenchInspector.tsx', import.meta.url,
)), 'utf8')

const portraits = ['strategist', 'researcher', 'coder', 'reviewer'].map(role => ({
  role,
  path: fileURLToPath(new URL(`../src/client/assets/${role}-night-city-v2.png`, import.meta.url)),
}))

describe('Cyber mission-control card geometry', () => {
  it('keeps the right-rail cards square without pointed frame artwork', () => {
    const identity = css.match(/\.identity\s*\{([^}]*)\}/)?.[1] ?? ''
    const section = css.match(/\.section\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(identity).toContain('clip-path: none')
    expect(section).toContain('clip-path: none')
    expect(css).not.toContain('cyber-panel-frame.svg')
    expect(css).not.toContain('.section::after')
  })

  it('gives C and debate agents the same single flat-chamfer portrait frame as A', () => {
    const frame = css.match(/\.agentFrame\s*\{([^}]*)\}/)?.[1] ?? ''
    const viewport = css.match(/\.agentViewport\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(frame).toContain('width: 82px')
    expect(frame).toContain('height: 80px')
    expect(frame).toContain('padding: 2px')
    expect(frame).toContain('clip-path: polygon(')
    expect(viewport).toContain('clip-path: polygon(')
    expect(css).toContain("[data-workbench-kind='trajectory'] .agentRow")
    expect(css).toContain("[data-workbench-view='debate-vs'] .agentRow")
  })

  it('uses the versioned Night City portraits without removing the original assets', () => {
    for (const portrait of portraits) {
      expect(existsSync(portrait.path), portrait.role).toBe(true)
      expect(readFileSync(portrait.path).byteLength, portrait.role).toBeGreaterThan(4_000)
      expect(source).toContain(`./assets/${portrait.role}-night-city-v2.png`)
    }
  })

  it('layers theme-owned glass and carbon materials without pointed card overlays', () => {
    expect(css).toContain('var(--dsw-specific-cyber-glass)')
    expect(css).toContain('var(--dsw-specific-cyber-carbon)')
    expect(css).toContain('var(--dsw-specific-cyber-bloom-cyan)')
    expect(css).toContain('@keyframes cyber-rail-energy')
    expect(css).toContain('@keyframes cyber-agent-holo-scan')
    expect(css).toContain('.agentViewport::before')
    expect(css).not.toContain('.section::after')
  })
})
