import { useState } from 'react'
import type { Project } from '../../shared/types'
import { Stepper } from './Stepper'

interface Props {
  project: Project
  busy: boolean
  error: string | null
  onConfirm: (outline: string[]) => void
  onReselect: () => void
}

export function OutlineEditor({ project, busy, error, onConfirm, onReselect }: Props) {
  const [titles, setTitles] = useState<string[]>(() => [...project.outline])

  function update(i: number, value: string) {
    setTitles(prev => prev.map((t, j) => (j === i ? value : t)))
  }
  function remove(i: number) {
    setTitles(prev => prev.filter((_, j) => j !== i))
  }
  function add() {
    setTitles(prev => [...prev, ''])
  }

  const valid = titles.map(t => t.trim()).filter(Boolean)

  return (
    <div className="stage">
      <Stepper current={1} />
      <h1 className="display">确认大纲</h1>
      <p className="lead">
        选题角度：{project.angles[project.chosenAngle ?? 0]?.text ?? ''}
      </p>
      <div className="card">
        {titles.map((title, i) => (
          <div className="outline-item" key={i}>
            <span className="outline-num">{i + 1}</span>
            <input
              className="input"
              value={title}
              placeholder="小标题"
              onChange={e => update(i, e.target.value)}
            />
            <button className="btn btn-ghost btn-sm outline-remove" onClick={() => remove(i)} type="button" title="删除">
              ✕
            </button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={add} type="button">
          + 添加一节
        </button>
        {error && <div className="error-box">{error}</div>}
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => valid.length && onConfirm(valid)} disabled={busy || valid.length === 0}>
            {busy ? (
              <>
                <span className="spinner" /> 正在准备…
              </>
            ) : (
              '开始逐段写作'
            )}
          </button>
          <button className="btn btn-ghost" onClick={onReselect} disabled={busy} type="button">
            重新选题
          </button>
        </div>
      </div>
    </div>
  )
}
