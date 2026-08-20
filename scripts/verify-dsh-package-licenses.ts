/**
 * Enforce the split-license declarations for repository-owned DSH npm packages.
 * @module scripts/verify-dsh-package-licenses
 */

import { globSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DSH_PACKAGE_NAME = /^@deepseek-ai\/dsh(?:-|$)/
const COMBINED_REPOSITORY_LICENSE = 'SEE LICENSE IN LICENSE'
const NEON_NONCOMMERCIAL_LICENSE = 'PolyForm-Noncommercial-1.0.0'
const NEON_NONCOMMERCIAL_PACKAGES = new Set([
  '@deepseek-ai/dsh-client-ui-debate-vs',
  '@deepseek-ai/dsh-client-ui-offpeak',
  '@deepseek-ai/dsh-client-ui-persona',
  '@deepseek-ai/dsh-client-ui-voice-input',
  '@deepseek-ai/dsh-client-ui-workbench',
  '@deepseek-ai/dsh-offpeak-gate',
  '@deepseek-ai/dsh-writing-app',
])

/** Result of checking every DSH package reachable through the root workspace list. */
export interface DshPackageLicenseReport {
  /** Number of DSH package manifests checked. */
  packageCount: number
  /** Repository-relative diagnostics for declarations that contradict the split-license policy. */
  failures: string[]
}

function readManifest(root: string, file: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(resolve(root, file), 'utf8'))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`verify-dsh-package-licenses: ${file} must contain a JSON object.`)
  }
  return parsed as Record<string, unknown>
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string')
}

function workspaceManifestPaths(root: string): string[] {
  const rootManifest = readManifest(root, 'package.json')
  const workspaces = rootManifest.workspaces
  if (!isStringArray(workspaces)) {
    throw new Error('verify-dsh-package-licenses: package.json workspaces must be a string array.')
  }

  const files = new Set(['package.json'])
  for (const pattern of workspaces) {
    for (const file of globSync(`${pattern}/package.json`, { cwd: root })) {
      files.add(file)
    }
  }
  return [...files].sort()
}

function printable(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value)
}

function expectedLicense(name: string): string {
  if (name === '@deepseek-ai/dsh-root') return COMBINED_REPOSITORY_LICENSE
  if (NEON_NONCOMMERCIAL_PACKAGES.has(name)) return NEON_NONCOMMERCIAL_LICENSE
  return 'MIT'
}

/**
 * Check every DSH npm package declared by the repository workspace.
 * @param root - absolute repository root containing the workspace package.json.
 * @returns the checked package count and every declaration that contradicts the split-license policy.
 */
export function inspectDshPackageLicenses(root: string): DshPackageLicenseReport {
  let packageCount = 0
  const failures: string[] = []

  for (const file of workspaceManifestPaths(root)) {
    const manifest = readManifest(root, file)
    const name = manifest.name
    if (typeof name !== 'string' || !DSH_PACKAGE_NAME.test(name)) continue

    packageCount++
    const requiredLicense = expectedLicense(name)
    if (manifest.license !== requiredLicense) {
      const normalizedFile = file.split(sep).join('/')
      failures.push(
        `${normalizedFile}: ${name} must declare "license": "${requiredLicense}"; found ${printable(manifest.license)}.`,
      )
    }
  }

  return { packageCount, failures }
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const report = inspectDshPackageLicenses(ROOT)
  if (report.failures.length > 0) {
    process.stderr.write('verify-dsh-package-licenses: invalid DSH package declarations found:\n')
    for (const failure of report.failures) process.stderr.write(`  ${failure}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(
      `verify-dsh-package-licenses: ${String(report.packageCount)} DSH package(s) checked; all match the split-license policy.\n`,
    )
  }
}
