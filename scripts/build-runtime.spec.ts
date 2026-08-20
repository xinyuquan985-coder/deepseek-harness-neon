import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { clientRuntimeExcludedReferences, runtimeSolution, webRuntimeBuild } from './build-runtime.ts'

describe('runtime build solution', () => {
  it('leaves the application shell to Vite instead of compiling its e2e project', () => {
    expect(clientRuntimeExcludedReferences).toEqual(['./apps/web'])
    expect(webRuntimeBuild).toEqual({
      command: 'pnpm',
      args: ['--filter', '@deepseek-ai/dsh-web-frontend', 'run', 'build'],
    })
  })

  it('keeps production project references without aggregate test inputs', () => {
    const root = resolve('fixture-repository')

    expect(runtimeSolution(root, {
      files: ['aggregate.ts'],
      include: ['tests/**/*.ts'],
      references: [
        { path: './packages/host' },
        { path: './packages/client-only' },
        { path: './packages/client/tsconfig.client.json' },
      ],
    }, ['./packages/client-only'])).toEqual({
      files: [],
      references: [
        { path: resolve(root, 'packages/host') },
        { path: resolve(root, 'packages/client/tsconfig.client.json') },
      ],
    })
  })

  it('rejects an aggregate without project references', () => {
    expect(() => runtimeSolution(resolve('fixture-repository'), {})).toThrow(
      'contains no project references',
    )
  })
})
