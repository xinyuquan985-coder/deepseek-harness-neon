import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL(
  '../src/client/PersonaAvatar.module.css', import.meta.url,
)), 'utf8')

const assets = [
  fileURLToPath(new URL('../src/client/assets/netrunner-night-city-v2.png', import.meta.url)),
  fileURLToPath(new URL('../src/client/assets/blackwall-night-city-v2.png', import.meta.url)),
]

describe('Cyber persona CG assets', () => {
  it('ships the two approved Night City v2 PNG portraits as real project assets', () => {
    for (const path of assets) {
      expect(existsSync(path)).toBe(true)
      const bytes = readFileSync(path)
      expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
      expect(bytes.byteLength).toBeGreaterThan(4_000)
    }
  })

  it('crops the artwork frame and keeps one flat chamfered portrait border', () => {
    expect(css).toContain('.portrait')
    expect(css).toContain('object-fit: cover')
    const frame = css.match(/\.frame\s*\{([^}]*)\}/)?.[1] ?? ''
    const viewport = css.match(/\.viewport\s*\{([^}]*)\}/)?.[1] ?? ''
    const portrait = css.match(/\.portrait\s*\{([^}]*)\}/)?.[1] ?? ''
    const userPortrait = css.match(/\.user \.portrait\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(frame).toContain('border: 0')
    expect(frame).toContain('padding: 2px')
    expect(frame).toContain('background: currentColor')
    expect(frame).toContain('clip-path: polygon(')
    expect(viewport).toContain('overflow: hidden')
    expect(viewport).toContain('clip-path: polygon(')
    expect(portrait).toContain('transform: scale(1.2)')
    expect(userPortrait).toContain('transform: scale(-1.2, 1.2)')
    expect(css).not.toContain('.frame::after')
    expect(css).not.toContain('width: 42px')
    expect(css).toContain('text-transform: none')
  })

  it('adds cinematic portrait grading without adding another frame line', () => {
    expect(css).toContain('filter: saturate(1.08) contrast(1.06)')
    expect(css).toContain('.viewport::before')
    expect(css).toContain('.viewport::after')
    expect(css).toContain('mix-blend-mode: screen')
    expect(css).toContain('@keyframes cyber-persona-holo-scan')
    expect(css).toContain('@keyframes cyber-persona-signal-jitter')
    expect(css).not.toContain('.frame::before')
  })
})
