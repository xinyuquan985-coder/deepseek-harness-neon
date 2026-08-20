/**
 * Build the runnable Host, browser plugins, and Web shell without compiling
 * repository test aggregates. Clean source checkouts do not yet contain the
 * Host-generated remote modules consumed by the Client face, so the two
 * production project-reference sets must be emitted in that order.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execa } from 'execa'
import ts from 'typescript'

interface AggregateConfig {
  files?: string[]
  include?: string[]
  references?: Array<{ path: string }>
}

const repositoryRoot = resolve(import.meta.dirname, '..')
/** Application projects compiled by their owning bundler instead of the Client TypeScript solution. */
export const clientRuntimeExcludedReferences = ['./apps/web']
/** Package-owned Web build invoked after both runtime faces are available. */
export const webRuntimeBuild = {
  command: 'pnpm',
  args: ['--filter', '@deepseek-ai/dsh-web-frontend', 'run', 'build'],
} as const

/**
 * Create a program-less solution containing only an aggregate's production
 * project references.
 * @param root - Repository root used to resolve project-reference paths.
 * @param aggregate - Parsed Host or Client aggregate configuration.
 * @param excludedReferences - Face-incompatible references omitted from the solution.
 * @returns A temporary TypeScript solution with absolute project references.
 */
export function runtimeSolution(
  root: string,
  aggregate: AggregateConfig,
  excludedReferences: readonly string[] = [],
): {
  files: []
  references: Array<{ path: string }>
} {
  if (!aggregate.references?.length) {
    throw new Error('runtime build aggregate contains no project references')
  }
  return {
    files: [],
    references: aggregate.references
      .filter(reference => !excludedReferences.includes(reference.path))
      .map(reference => ({
        path: resolve(root, reference.path),
      })),
  }
}

async function loadRuntimeSolution(configName: string, excludedReferences: readonly string[] = []) {
  const configPath = join(repositoryRoot, configName)
  const source = await readFile(configPath, 'utf8')
  const parsed = ts.parseConfigFileTextToJson(configPath, source)
  if (parsed.error) {
    throw new Error(ts.formatDiagnostic(parsed.error, {
      getCanonicalFileName: fileName => fileName,
      getCurrentDirectory: () => repositoryRoot,
      getNewLine: () => '\n',
    }))
  }
  return runtimeSolution(repositoryRoot, parsed.config as AggregateConfig, excludedReferences)
}

async function run(command: string, args: string[], cwd = repositoryRoot) {
  await execa(command, args, {
    cwd,
    preferLocal: true,
    stdio: 'inherit',
  })
}

async function buildRuntime() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'dsh-runtime-build-'))
  const hostSolution = join(temporaryRoot, 'host.json')
  const clientSolution = join(temporaryRoot, 'client.json')
  try {
    await writeFile(hostSolution, `${JSON.stringify(
      await loadRuntimeSolution('tsconfig.host.json'),
      null,
      2,
    )}\n`)
    await writeFile(clientSolution, `${JSON.stringify(
      await loadRuntimeSolution('tsconfig.client.json', clientRuntimeExcludedReferences),
      null,
      2,
    )}\n`)

    await run('tsc', ['-b', hostSolution])
    await run('tsdown', ['--env.DSH_BUILD_FACE', 'host'])
    await run('tsc', ['-b', clientSolution])
    await run('tsdown', ['--env.DSH_BUILD_FACE', 'client'])
    await run(webRuntimeBuild.command, [...webRuntimeBuild.args])
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  await buildRuntime()
}
