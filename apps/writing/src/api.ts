import type { Project, WritingPrefs } from '../shared/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  const data = (await response.json().catch(() => null)) as { error?: string } | T | null
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `请求失败（${response.status}）`
    throw new Error(message)
  }
  return data as T
}

export function getConfig(): Promise<{ configured: boolean; model: string }> {
  return request('/api/config')
}

export function createProject(inspiration: string, prefs?: WritingPrefs): Promise<Project> {
  return request('/api/projects', { method: 'POST', body: JSON.stringify({ inspiration, prefs }) })
}

export function getProject(id: string): Promise<Project> {
  return request(`/api/projects/${id}`)
}

export function chooseAngle(id: string, index: number): Promise<Project> {
  return request(`/api/projects/${id}/angle`, { method: 'POST', body: JSON.stringify({ index }) })
}

export function updateOutline(id: string, outline: string[]): Promise<Project> {
  return request(`/api/projects/${id}/outline`, { method: 'PUT', body: JSON.stringify({ outline }) })
}

export function getSectionAngles(id: string, index: number): Promise<{ angles: string[] }> {
  return request(`/api/projects/${id}/sections/${index}/angles`, { method: 'POST' })
}

export function writeSection(
  id: string,
  index: number,
  body: { angle?: string; content?: string },
): Promise<Project> {
  return request(`/api/projects/${id}/sections/${index}/write`, { method: 'POST', body: JSON.stringify(body) })
}

export function confirmSection(id: string, index: number): Promise<Project> {
  return request(`/api/projects/${id}/sections/${index}/confirm`, { method: 'POST' })
}

export function finishProject(id: string): Promise<Project> {
  return request(`/api/projects/${id}/finish`, { method: 'POST' })
}
