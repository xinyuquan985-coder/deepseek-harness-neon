import { describe, expect, it } from 'vitest'
import { approvalHeadline } from '../src/client/skeleton/ApprovalPanel.tsx'

describe('approval headline localization', () => {
  const t = (key: string, values?: Record<string, unknown>): string => {
    if (key === 'approval.sandboxEscalation') {
      return `请求将沙箱权限提升至 ${String(values?.['mode'])}：${String(values?.['reason'])}`
    }
    return `工具 ${String(values?.['toolName'])} 请求越权执行`
  }

  it('localizes the host sandbox escalation prefix while preserving its facts', () => {
    expect(approvalHeadline(
      'escalate sandbox to danger-full-access: 用户要求完成最终系统级校验。',
      'write',
      t,
    )).toBe('请求将沙箱权限提升至 danger-full-access：用户要求完成最终系统级校验。')
  })

  it('preserves arbitrary provider reasons and supplies the generic fallback', () => {
    expect(approvalHeadline('需要访问硬件设备', 'write', t)).toBe('需要访问硬件设备')
    expect(approvalHeadline(undefined, 'write', t)).toBe('工具 write 请求越权执行')
  })
})
