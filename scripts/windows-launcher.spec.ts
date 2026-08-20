import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = join(import.meta.dirname, '..')

describe('Windows source launcher', () => {
  it('builds and starts the repository frontend instead of a packaged runtime', async () => {
    const launcher = await readFile(join(repositoryRoot, 'start-deepseek-harness.cmd'), 'utf8')

    expect(launcher).not.toContain('.dsh-runtime')
    expect(launcher).toContain('pnpm install --frozen-lockfile')
    expect(launcher).toContain('pnpm run build:runtime')
    expect(launcher).toContain('pnpm dsh web %*')
  })
})
