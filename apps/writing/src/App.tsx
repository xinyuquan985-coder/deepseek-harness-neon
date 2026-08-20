import { useCallback, useEffect, useState } from 'react'
import type { Project, WritingPrefs } from '../shared/types'
import * as api from './api'
import { InspirationForm } from './components/InspirationForm'
import { AnglePicker } from './components/AnglePicker'
import { OutlineEditor } from './components/OutlineEditor'
import { SectionWriter } from './components/SectionWriter'
import { FinalExport } from './components/FinalExport'

const LAST_ID_KEY = 'writing-app:lastProjectId'

function KeySetup({ model }: { model: string }) {
  return (
    <div className="stage">
      <div className="card">
        <h1 className="display">灵感写作</h1>
        <p className="lead">先配置大模型 API Key，配好即可开始。</p>
        <p>在 <code>apps/writing/.env</code> 中写入：</p>
        <pre className="code">{`DEEPSEEK_API_KEY=你的key
# 可选
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat`}</pre>
        <p className="hint">当前模型：{model}。配置后重启后端服务，再刷新本页。</p>
      </div>
    </div>
  )
}

export default function App() {
  const [config, setConfig] = useState<{ configured: boolean; model: string } | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pickingAngle, setPickingAngle] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    api
      .getConfig()
      .then(setConfig)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const mutate = useCallback(async (fn: () => Promise<Project>, message?: string): Promise<Project | null> => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const next = await fn()
      setProject(next)
      localStorage.setItem(LAST_ID_KEY, next.id)
      if (message) setNotice(message)
      return next
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  function startNew() {
    setProject(null)
    setError(null)
    setNotice(null)
    setPickingAngle(false)
    setReviewing(false)
    localStorage.removeItem(LAST_ID_KEY)
  }

  async function handleResume() {
    const id = localStorage.getItem(LAST_ID_KEY)
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      setProject(await api.getProject(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      localStorage.removeItem(LAST_ID_KEY)
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = (inspiration: string, prefs?: WritingPrefs) =>
    mutate(() => api.createProject(inspiration, prefs))

  const currentProjectId = (): string => {
    if (project === null) throw new Error('Writing project is not loaded')
    return project.id
  }

  const handleChooseAngle = (index: number) => {
    setPickingAngle(false)
    return mutate(() => api.chooseAngle(currentProjectId(), index))
  }

  const handleOutline = (outline: string[]) => mutate(() => api.updateOutline(currentProjectId(), outline))

  const handleWrite = (index: number, body: { angle?: string; content?: string }) =>
    mutate(() => api.writeSection(currentProjectId(), index, body))

  const handleConfirm = (index: number) => mutate(() => api.confirmSection(currentProjectId(), index))

  const handleFinish = async () => {
    const next = await mutate(() => api.finishProject(currentProjectId()))
    if (next) setReviewing(false)
  }

  function renderBody() {
    if (!config) {
      return error ? (
        <div className="stage">
          <div className="error-box">无法连接后端：{error}。请先在 apps/writing 下运行 pnpm dev:server。</div>
        </div>
      ) : (
        <div className="center">
          <span className="spinner dark" />
        </div>
      )
    }
    if (!config.configured) return <KeySetup model={config.model} />
    if (!project) {
      return (
        <InspirationForm
          busy={busy}
          error={error}
          hasResume={Boolean(localStorage.getItem(LAST_ID_KEY))}
          onStart={handleCreate}
          onResume={handleResume}
        />
      )
    }
    if (project.phase === 'outlining' && (project.chosenAngle === null || pickingAngle)) {
      return <AnglePicker project={project} busy={busy} error={error} onChoose={handleChooseAngle} />
    }
    if (project.phase === 'outlining') {
      return (
        <OutlineEditor
          project={project}
          busy={busy}
          error={error}
          onConfirm={handleOutline}
          onReselect={() => setPickingAngle(true)}
        />
      )
    }
    if (project.phase === 'writing' || (project.phase === 'done' && reviewing)) {
      return (
        <SectionWriter
          project={project}
          busy={busy}
          error={error}
          notice={notice}
          onWrite={handleWrite}
          onConfirm={handleConfirm}
          onFinish={handleFinish}
        />
      )
    }
    return <FinalExport project={project} onBack={() => setReviewing(true)} />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            <span className="brand-mark">笔</span> 灵感写作
          </span>
          <span className="topbar-meta">{config ? `模型 ${config.model}` : ''}</span>
          {project && (
            <button className="btn btn-ghost btn-sm" onClick={startNew}>
              新写作
            </button>
          )}
        </div>
      </header>
      <main className="main">{renderBody()}</main>
    </div>
  )
}
