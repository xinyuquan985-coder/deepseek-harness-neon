import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const toolbarCss = readFileSync(fileURLToPath(new URL(
  '../src/client/TrajectoryToolbar.module.css', import.meta.url,
)), 'utf8')
const tableCss = readFileSync(fileURLToPath(new URL(
  '../src/client/TrajectoryTable.module.css', import.meta.url,
)), 'utf8')

describe('Cyber C workbench composition', () => {
  it('uses the approved execution-ledger title band and readable event rows', () => {
    expect(toolbarCss).toContain("body[data-theme-id='cyber']")
    expect(toolbarCss).toContain('.title')
    expect(toolbarCss).toContain('height: 52px')
    expect(tableCss).toContain('height: 46px')
    expect(tableCss).toContain('width: 150px')
    expect(tableCss).toContain('@keyframes cyber-trajectory-lock')
    expect(tableCss).toContain('.selectionRail::after')
  })
})
