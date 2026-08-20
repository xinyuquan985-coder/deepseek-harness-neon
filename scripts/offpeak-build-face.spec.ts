import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('off-peak build faces', () => {
  it('keeps the Host gate on the Host-only settings surface', async () => {
    const gateConfig = JSON.parse(await readFile(
      new URL('../packages/offpeak/offpeak-gate/tsconfig.json', import.meta.url),
      'utf8',
    )) as { references: Array<{ path: string }> }
    const hostConfig = JSON.parse(await readFile(
      new URL('../packages/client/ui-offpeak/tsconfig.host.json', import.meta.url),
      'utf8',
    )) as { extends: string; files: string[] }

    expect(gateConfig.references).toContainEqual({ path: '../../client/ui-offpeak/tsconfig.host.json' })
    expect(gateConfig.references).not.toContainEqual({ path: '../../client/ui-offpeak' })
    expect(hostConfig.extends).toBe('../../../tsconfig.base.json')
    expect(hostConfig.files).toEqual([
      'src/index.ts',
      'src/offpeak-settings.ts',
    ])
  })
})
