import { describe, expect, it } from 'vitest'
import { normalizeAriaSnapshot } from './scaffold.ts'

describe('normalizeAriaSnapshot', () => {
  it('redacts raw and aria-escaped Windows workspace paths', () => {
    const workspace = String.raw`C:\redaction-fixture\dsh-web-e2e-ws-example`
    const escaped = workspace.replaceAll('\\', '\\\\')
    const snapshot = `raw=${workspace}; aria=${escaped}\\\\approval-preview.txt; title=dsh-web-e2e-ws-example`

    const normalized = normalizeAriaSnapshot(snapshot, workspace)

    expect(normalized).toContain('raw={{cwd}}')
    expect(normalized).toContain('aria={{cwd}}\\\\approval-preview.txt')
    expect(normalized).toContain('title={{workspace}}')
    expect(normalized).not.toContain('local-user')
    expect(normalized).not.toContain('redaction-fixture')
  })
})
