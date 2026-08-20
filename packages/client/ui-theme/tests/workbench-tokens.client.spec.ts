import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const STYLES = new URL('../src/styles/', import.meta.url)
const CLIENT_PACKAGES = fileURLToPath(new URL('../../', import.meta.url))
const platform = readFileSync(fileURLToPath(new URL('design-platform.css', STYLES)), 'utf8')
const cyber = readFileSync(fileURLToPath(new URL('cyber-effects.css', STYLES)), 'utf8')

const TOKENS = [
  '--dsw-specific-workbench-chamfer',
  '--dsw-specific-workbench-rail-fill',
  '--dsw-specific-workbench-rail-border',
  '--dsw-specific-workbench-role-accent',
  '--dsw-specific-workbench-ledger-selected',
  '--dsw-specific-workbench-danger-outline',
] as const

const NIGHT_CITY_MATERIAL_TOKENS = [
  '--dsw-specific-cyber-glass',
  '--dsw-specific-cyber-carbon',
  '--dsw-specific-cyber-grid',
  '--dsw-specific-cyber-bloom-cyan',
  '--dsw-specific-cyber-bloom-yellow',
  '--dsw-specific-cyber-energy-line',
  '--dsw-specific-cyber-holo-noise',
] as const

function declarations(css: string, selector: string): Map<string, string> {
  const found = new Map<string, string>()
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
  for (const [, selectors = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').map(value => value.trim()).includes(selector)) continue
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon !== -1) found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim())
    }
  }
  return found
}

function packageStylesheets(): string[] {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!['lib', 'node_modules'].includes(entry.name)) walk(path)
      } else if (entry.name.endsWith('.css') && !path.includes(join('ui-theme', 'src', 'styles'))) {
        files.push(path)
      }
    }
  }
  walk(CLIENT_PACKAGES)
  return files
}

describe('shared workbench semantic tokens', () => {
  it('defines safe light and dark defaults plus a Cyber override for every token', () => {
    const light = declarations(platform, 'body')
    const dark = declarations(platform, 'body[data-ds-dark-theme]')
    const nightCity = declarations(cyber, "body[data-theme-id='cyber']")
    for (const token of TOKENS) {
      expect(light.get(token), `${token} light`).toBeTruthy()
      expect(dark.get(token), `${token} dark`).toBeTruthy()
      expect(nightCity.get(token), `${token} cyber`).toBeTruthy()
    }
  })

  it('keeps each shared token shared by at least two package stylesheets', () => {
    const sheets = packageStylesheets().map(file => ({ file, css: readFileSync(file, 'utf8') }))
    for (const token of TOKENS) {
      const consumers = sheets.filter(sheet => sheet.css.includes(`var(${token})`)).map(sheet => sheet.file)
      expect(consumers.length, `${token}: ${consumers.join(', ')}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('defines the Night City material stack and state-driven motion safely', () => {
    const nightCity = declarations(cyber, "body[data-theme-id='cyber']")
    for (const token of NIGHT_CITY_MATERIAL_TOKENS) {
      expect(nightCity.get(token), `${token} cyber`).toBeTruthy()
    }
    expect(cyber).toContain('@keyframes cyber-data-pulse')
    expect(cyber).toContain('@keyframes cyber-alert-breathe')
    expect(cyber).toContain('@keyframes cyber-selected-sweep')
    expect(cyber).toContain('@keyframes cyber-city-parallax')
    expect(cyber).toContain('@keyframes cyber-scan-surge')
    expect(cyber).toContain('@media (prefers-reduced-motion: reduce)')
    expect(cyber).not.toContain('button:not(:disabled):hover {\n    filter:')
  })
})
