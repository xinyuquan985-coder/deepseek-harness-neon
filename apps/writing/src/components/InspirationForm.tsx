import { useState } from 'react'
import type { FormEvent } from 'react'
import type { WritingPrefs } from '../../shared/types'

interface Props {
  busy: boolean
  error: string | null
  hasResume: boolean
  onStart: (inspiration: string, prefs?: WritingPrefs) => void
  onResume: () => void
}

export function InspirationForm({ busy, error, hasResume, onStart, onResume }: Props) {
  const [inspiration, setInspiration] = useState('')
  const [audience, setAudience] = useState('')
  const [length, setLength] = useState('')
  const [tone, setTone] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = inspiration.trim()
    if (!text) return
    onStart(text, {
      audience: audience.trim() || undefined,
      length: length.trim() || undefined,
      tone: tone.trim() || undefined,
    })
  }

  return (
    <form className="stage" onSubmit={submit}>
      <h1 className="display">填一个灵感，剩下的交给我</h1>
      <p className="lead">我会像教练一样，一步步引导你写完一整篇文章——而不是一下丢给你全文。</p>
      <div className="card">
        <div className="field">
          <label className="label" htmlFor="inspiration">
            灵感
          </label>
          <textarea
            id="inspiration"
            className="textarea"
            autoFocus
            placeholder="例如：为什么年轻人越来越不愿意发朋友圈了"
            value={inspiration}
            onChange={e => setInspiration(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label">写作偏好（可选）</label>
          <div className="grid-3">
            <input
              className="input"
              placeholder="目标读者"
              value={audience}
              onChange={e => setAudience(e.target.value)}
            />
            <input
              className="input"
              placeholder="目标字数"
              value={length}
              onChange={e => setLength(e.target.value)}
            />
            <input className="input" placeholder="语气风格" value={tone} onChange={e => setTone(e.target.value)} />
          </div>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy || !inspiration.trim()}>
            {busy ? (
              <>
                <span className="spinner" /> 正在构思选题…
              </>
            ) : (
              '开始'
            )}
          </button>
          {hasResume && (
            <button className="btn btn-ghost" type="button" onClick={onResume} disabled={busy}>
              继续上次写作
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
