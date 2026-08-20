import { useState } from 'react'
import type { Project } from '../../shared/types'
import * as api from '../api'
import { Stepper } from './Stepper'

interface Props {
  project: Project
  busy: boolean
  error: string | null
  notice: string | null
  onWrite: (index: number, body: { angle?: string; content?: string }) => Promise<Project | null>
  onConfirm: (index: number) => Promise<Project | null>
  onFinish: () => void
}

export function SectionWriter({ project, busy, error, notice, onWrite, onConfirm, onFinish }: Props) {
  const firstPending = project.sections.findIndex(s => s.status !== 'confirmed')
  const [active, setActive] = useState(firstPending === -1 ? 0 : firstPending)
  const [angles, setAngles] = useState<string[] | null>(null)
  const [angleLoading, setAngleLoading] = useState(false)
  const [angleError, setAngleError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [manual, setManual] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const section = project.sections[active]
  const allDone = project.sections.length > 0 && project.sections.every(s => s.status === 'confirmed')
  const laterConfirmed = project.sections.filter(s => s.index > active && s.status === 'confirmed').length
  const hasContent = Boolean(section?.content)

  function select(i: number) {
    setActive(i)
    setAngles(null)
    setAngleError(null)
    setEditing(false)
    setManual('')
    setRegenerating(false)
  }

  async function loadAngles() {
    setAngleLoading(true)
    setAngleError(null)
    setAngles(null)
    try {
      const res = await api.getSectionAngles(project.id, active)
      setAngles(res.angles)
    } catch (e) {
      setAngleError(e instanceof Error ? e.message : String(e))
    } finally {
      setAngleLoading(false)
    }
  }

  async function writeWithAngle(angle: string) {
    const next = await onWrite(active, { angle })
    if (next) {
      setAngles(null)
      setRegenerating(false)
    }
  }

  async function saveManual() {
    const next = await onWrite(active, { content: manual })
    if (next) {
      setEditing(false)
      setManual('')
      setRegenerating(false)
    }
  }

  async function confirm() {
    const next = await onConfirm(active)
    if (next) {
      const following = next.sections.findIndex(s => s.status !== 'confirmed')
      if (following !== -1 && following !== active) select(following)
    }
  }

  function statusLabel(s: Project['sections'][number]) {
    return s.status === 'confirmed' ? '已确认' : s.status === 'draft' ? '草稿' : '待写'
  }

  return (
    <div className="stage-wide">
      <Stepper current={2} />
      <h1 className="display">逐段写作</h1>
      <p className="lead">每一段：先选一个切入角度，我只写这一小段，你满意再继续。</p>
      {notice && <div className="notice info">{notice}</div>}

      {allDone ? (
        <div className="card center">
          <h2 className="section-heading">全部段落已完成 🎉</h2>
          <p className="hint">生成标题与结尾，收束全文。</p>
          <button className="btn btn-primary" onClick={onFinish} disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" /> 正在收尾…
              </>
            ) : (
              '生成标题与结尾'
            )}
          </button>
          {error && <div className="error-box">{error}</div>}
        </div>
      ) : (
        <div className="writer-layout">
          <aside className="section-list card">
            <p className="hint" style={{ marginTop: 0 }}>
              大纲
            </p>
            {project.sections.map(s => (
              <button
                key={s.index}
                className={`section-row ${s.index === active ? 'active' : ''}`}
                onClick={() => select(s.index)}
              >
                <span className="num">{s.index + 1}</span>
                <span className={`status-dot ${s.status}`} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
                <span className={`status-label ${s.status}`}>{statusLabel(s)}</span>
              </button>
            ))}
          </aside>

          <section className="card">
            <div className="hint">
              第 {active + 1} / {project.sections.length} 段
            </div>
            <h2 className="section-heading">{section?.title}</h2>

            {laterConfirmed > 0 && (
              <div className="notice warn">改写这一段会把后面已确认的 {laterConfirmed} 段重置为待写。</div>
            )}

            {editing ? (
              <div>
                <textarea
                  className="textarea"
                  autoFocus
                  value={manual}
                  onChange={e => setManual(e.target.value)}
                  placeholder="写下这一段…"
                />
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={saveManual} disabled={busy || !manual.trim()}>
                    {busy ? <span className="spinner" /> : '保存这段'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
                    取消
                  </button>
                </div>
              </div>
            ) : hasContent && !regenerating ? (
              <div>
                <div className="prose-box">
                  <div className="prose">{section.content}</div>
                </div>
                <div className="btn-row">
                  {section.status !== 'confirmed' ? (
                    <button className="btn btn-primary" onClick={confirm} disabled={busy}>
                      {busy ? <span className="spinner" /> : '采纳这段，继续'}
                    </button>
                  ) : (
                    <span className="muted" style={{ alignSelf: 'center' }}>
                      ✓ 已确认
                    </span>
                  )}
                  <button className="btn" onClick={() => setRegenerating(true)} disabled={busy}>
                    重新改写
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setManual(section.content ?? '')
                      setEditing(true)
                    }}
                    disabled={busy}
                  >
                    自己改这段
                  </button>
                </div>
              </div>
            ) : angles === null ? (
              <div>
                <p className="hint">为这一段生成几个不同的写作角度，你选一个，我只写这一小段。</p>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={loadAngles} disabled={angleLoading || busy}>
                    {angleLoading ? (
                      <>
                        <span className="spinner" /> 正在构思角度…
                      </>
                    ) : (
                      '生成写作角度'
                    )}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setManual(section.content ?? '')
                      setEditing(true)
                    }}
                    disabled={busy}
                  >
                    自己写这段
                  </button>
                </div>
                {angleError && <div className="error-box">{angleError}</div>}
              </div>
            ) : (
              <div>
                <p className="hint">选一个切入角度：</p>
                {angles.map((angle, i) => (
                  <div className="card" key={i} style={{ marginTop: 10, marginBottom: 0, padding: 0 }}>
                    <button className="angle-card" onClick={() => writeWithAngle(angle)} disabled={busy}>
                      <span className="angle-index">{i + 1}</span>
                      <span className="angle-text">{angle}</span>
                    </button>
                  </div>
                ))}
                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" onClick={loadAngles} disabled={angleLoading || busy}>
                    {angleLoading ? <span className="spinner dark" /> : '换一批'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setManual(section.content ?? '')
                      setEditing(true)
                    }}
                    disabled={busy}
                  >
                    自己写这段
                  </button>
                  {regenerating && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setRegenerating(false)} disabled={busy}>
                      取消
                    </button>
                  )}
                </div>
                {angleError && <div className="error-box">{angleError}</div>}
              </div>
            )}
            {error && <div className="error-box">{error}</div>}
          </section>
        </div>
      )}
    </div>
  )
}
