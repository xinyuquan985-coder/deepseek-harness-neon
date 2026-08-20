import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL(
  '../src/client/DebateVSView.module.css', import.meta.url,
)), 'utf8')

describe('Cyber debate arena materials', () => {
  it('keeps the real debate DOM while applying square cinematic surfaces', () => {
    expect(css).toContain(":global(body[data-theme-id='cyber']) .arena")
    expect(css).toContain('var(--dsw-specific-cyber-grid)')
    expect(css).toContain('var(--dsw-specific-cyber-glass)')
    expect(css).toContain('var(--dsw-specific-cyber-carbon)')
    expect(css).toContain('border-radius: 0')
    expect(css).toContain('@keyframes cyber-debate-energy')
    expect(css).toContain('@keyframes cyber-debate-grid-drift')
  })
})
