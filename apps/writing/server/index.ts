import { Hono } from 'hono'
import type { Context } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync } from 'node:fs'
import type {
  CreateProjectRequest,
  OutlineResult,
  SectionAnglesResult,
  WriteSectionRequest,
  WritingPrefs,
} from '../shared/types.ts'
import { configStatus } from './config.ts'
import { chat, chatJson } from './llm.ts'
import * as prompts from './prompts.ts'
import * as store from './store.ts'
import { distDir } from './paths.ts'

const app = new Hono()

/** Wrap a handler so LLM and store failures become a JSON 500 instead of a crash. */
function route(handler: (c: Context) => Promise<Response>): (c: Context) => Promise<Response> {
  return async (c) => {
    try {
      return await handler(c)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[writing]', message)
      return c.json({ error: message }, 500)
    }
  }
}

/** Read a required path parameter, failing loud when the route lacks it. */
function param(c: Context, name: string): string {
  const value = c.req.param(name)
  if (!value) throw new Error(`缺少路径参数 ${name}`)
  return value
}

function asOutlineResult(value: unknown): OutlineResult {
  if (typeof value !== 'object' || value === null) throw new Error('选题结果格式错误')
  const raw = (value as { angles?: unknown }).angles
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('未生成选题角度')
  const angles = raw.map((item, i) => {
    if (typeof item !== 'object' || item === null) throw new Error(`第 ${i + 1} 个角度格式错误`)
    const text = (item as { text?: unknown }).text
    const outline = (item as { outline?: unknown }).outline
    if (typeof text !== 'string' || text.trim() === '') throw new Error(`第 ${i + 1} 个角度缺少说明`)
    if (!Array.isArray(outline)) throw new Error(`角度「${text}」缺少大纲`)
    const cleaned = outline.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    if (cleaned.length === 0) throw new Error(`角度「${text}」的大纲为空`)
    return { text: text.trim(), outline: cleaned }
  })
  return { angles }
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label}格式错误`)
  const cleaned = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  if (cleaned.length === 0) throw new Error(`${label}为空`)
  return cleaned
}

app.get('/api/config', c => c.json(configStatus()))

app.post(
  '/api/projects',
  route(async (c) => {
    const body = await c.req.json<CreateProjectRequest>()
    const inspiration = (body.inspiration ?? '').trim()
    if (!inspiration) return c.json({ error: '请先填写灵感' }, 400)
    const prefs: WritingPrefs = body.prefs ?? {}
    const project = store.newProject(inspiration, prefs)
    const result = asOutlineResult(await chatJson<unknown>(prompts.outlineMessages(inspiration, prefs)))
    project.angles = result.angles
    await store.saveProject(project)
    return c.json(project)
  }),
)

app.get(
  '/api/projects/:id',
  route(async c => c.json(await store.loadProject(param(c, 'id')))),
)

app.post(
  '/api/projects/:id/angle',
  route(async (c) => {
    const { index } = await c.req.json<{ index?: unknown }>()
    if (typeof index !== 'number' || !Number.isInteger(index)) return c.json({ error: '请选择有效角度' }, 400)
    const project = await store.loadProject(param(c, 'id'))
    if (index < 0 || index >= project.angles.length) return c.json({ error: '角度编号超出范围' }, 400)
    project.chosenAngle = index
    project.outline = [...project.angles[index].outline]
    project.sections = store.buildSections(project.outline)
    await store.saveProject(project)
    return c.json(project)
  }),
)

app.put(
  '/api/projects/:id/outline',
  route(async (c) => {
    const { outline } = await c.req.json<{ outline?: unknown }>()
    const titles = asStringArray(outline, '大纲')
    const project = await store.loadProject(param(c, 'id'))
    project.outline = titles
    project.sections = store.buildSections(titles)
    project.phase = 'writing'
    await store.saveProject(project)
    return c.json(project)
  }),
)

app.post(
  '/api/projects/:id/sections/:idx/angles',
  route(async (c) => {
    const index = Number(param(c, 'idx'))
    const project = await store.loadProject(param(c, 'id'))
    if (!project.sections[index]) return c.json({ error: '段落编号超出范围' }, 400)
    const result = await chatJson<SectionAnglesResult>(prompts.sectionAngleMessages(project, index))
    return c.json({ angles: asStringArray(result.angles, '写作角度') })
  }),
)

app.post(
  '/api/projects/:id/sections/:idx/write',
  route(async (c) => {
    const index = Number(param(c, 'idx'))
    const body = await c.req.json<WriteSectionRequest>()
    const project = await store.loadProject(param(c, 'id'))
    const section = project.sections[index]
    if (!section) return c.json({ error: '段落编号超出范围' }, 400)

    const manual = (body.content ?? '').trim()
    if (manual) {
      store.setSectionContent(project, index, manual)
    } else {
      const angle = (body.angle ?? '').trim()
      if (!angle) return c.json({ error: '请提供写作角度或正文内容' }, 400)
      const content = await chat(prompts.writeSectionMessages(project, index, angle), { temperature: 0.8 })
      store.setSectionContent(project, index, content.trim())
    }
    await store.saveProject(project)
    return c.json(project)
  }),
)

app.post(
  '/api/projects/:id/sections/:idx/confirm',
  route(async (c) => {
    const index = Number(param(c, 'idx'))
    const project = await store.loadProject(param(c, 'id'))
    if (!project.sections[index]) return c.json({ error: '段落编号超出范围' }, 400)
    if (!project.sections[index].content) return c.json({ error: '该段还没有内容，无法确认' }, 400)
    store.confirmSection(project, index)
    await store.saveProject(project)
    return c.json(project)
  }),
)

app.post(
  '/api/projects/:id/finish',
  route(async (c) => {
    const project = await store.loadProject(param(c, 'id'))
    const result = await chatJson<{ titles?: unknown; ending?: unknown }>(prompts.finishMessages(project))
    project.titleCandidates = asStringArray(result.titles, '标题')
    if (typeof result.ending !== 'string' || result.ending.trim() === '') throw new Error('未生成结尾')
    project.ending = result.ending.trim()
    project.phase = 'done'
    await store.saveProject(project)
    return c.json(project)
  }),
)

app.delete(
  '/api/projects/:id',
  route(async (c) => {
    await store.deleteProject(param(c, 'id'))
    return c.json({ ok: true })
  }),
)

// Serve the built frontend in production; absent in dev (Vite serves it).
if (existsSync(distDir)) {
  app.use('*', serveStatic({ root: distDir }))
}

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[writing] server listening on http://localhost:${info.port}`)
})
