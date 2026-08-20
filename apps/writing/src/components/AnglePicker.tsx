import type { Project } from '../../shared/types'
import { Stepper } from './Stepper'

interface Props {
  project: Project
  busy: boolean
  error: string | null
  onChoose: (index: number) => void
}

export function AnglePicker({ project, busy, error, onChoose }: Props) {
  return (
    <div className="stage">
      <Stepper current={0} />
      <h1 className="display">选一个角度</h1>
      <p className="lead">灵感：{project.inspiration}</p>
      {project.angles.map((angle, i) => (
        <div className="card" key={i} style={{ marginBottom: 14 }}>
          <button className="angle-card" onClick={() => onChoose(i)} disabled={busy}>
            <span className="angle-index">{i + 1}</span>
            <span className="angle-text">{angle.text}</span>
            <div className="angle-outline-preview">
              {angle.outline.map((title, j) => (
                <div key={j}>
                  {j + 1}. {title}
                </div>
              ))}
            </div>
          </button>
        </div>
      ))}
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
