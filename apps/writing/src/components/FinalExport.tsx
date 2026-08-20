import { useMemo, useState } from 'react'
import type { Project } from '../../shared/types'
import { Stepper } from './Stepper'

interface Props {
  project: Project
  onBack: () => void
}

export function FinalExport({ project, onBack }: Props) {
  const [customTitle, setCustomTitle] = useState('')
  const [chosen, setChosen] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  const title = customTitle.trim() || project.titleCandidates[chosen] || project.inspiration

  const markdown = useMemo(() => {
    const body = project.sections
      .filter(s => s.content)
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n')
    const ending = project.ending ? `\n\n${project.ending}` : ''
    return `# ${title}\n\n${body}${ending}\n`
  }, [title, project])

  const plainText = useMemo(() => {
    const body = project.sections
      .filter(s => s.content)
      .map(s => `${s.title}\n${s.content}`)
      .join('\n\n')
    const ending = project.ending ? `\n\n${project.ending}` : ''
    return `${title}\n\n${body}${ending}\n`
  }, [title, project])

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied('failed')
    }
  }

  function download(text: string, filename: string, mime: string) {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const safeName = (title || '文章').replace(/[\\/:*?"<>|]/g, '')

  return (
    <div className="stage">
      <Stepper current={3} />
      <h1 className="display">完成</h1>
      <p className="lead">选一个标题，导出全文。</p>

      <div className="card">
        <div className="field">
          <label className="label">标题</label>
          {project.titleCandidates.map((t, i) => (
            <button
              key={i}
              className={`section-row ${i === chosen && !customTitle.trim() ? 'active' : ''}`}
              onClick={() => {
                setChosen(i)
                setCustomTitle('')
              }}
            >
              <span className="num">{i + 1}</span>
              <span style={{ flex: 1 }}>{t}</span>
            </button>
          ))}
          <input
            className="input"
            style={{ marginTop: 8 }}
            placeholder="或用你自己的标题"
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
          />
        </div>

        {project.ending && (
          <div className="field">
            <label className="label">结尾</label>
            <div className="prose-box" style={{ marginTop: 0 }}>
              <div className="prose">{project.ending}</div>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => copy(markdown, 'md')}>
            {copied === 'md' ? '已复制 ✓' : '复制 Markdown'}
          </button>
          <button className="btn" onClick={() => copy(plainText, 'txt')}>
            {copied === 'txt' ? '已复制 ✓' : '复制纯文本'}
          </button>
          <button className="btn" onClick={() => download(markdown, `${safeName}.md`, 'text/markdown')}>
            下载 .md
          </button>
          <button className="btn" onClick={() => download(plainText, `${safeName}.txt`, 'text/plain')}>
            下载 .txt
          </button>
          <button className="btn btn-ghost" onClick={onBack}>
            返回修改
          </button>
        </div>
        {copied === 'failed' && <div className="error-box">复制失败，请手动选择文本复制。</div>}
      </div>

      <div className="card">
        <div className="section-heading" style={{ marginBottom: 10 }}>
          预览
        </div>
        <div className="prose">
          {project.sections
            .filter(s => s.content)
            .map(s => `## ${s.title}\n${s.content}`)
            .join('\n\n')}
          {project.ending ? `\n\n${project.ending}` : ''}
        </div>
      </div>
    </div>
  )
}
