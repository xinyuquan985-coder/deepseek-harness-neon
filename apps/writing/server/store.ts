import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Project, Section, WritingPrefs } from '../shared/types.ts'
import { dataDir } from './paths.ts'

function projectPath(id: string): string {
  return resolve(dataDir, `${id}.json`)
}

/** Load a project, throwing if it is missing or unreadable. */
export async function loadProject(id: string): Promise<Project> {
  const raw = await readFile(projectPath(id), 'utf8')
  return JSON.parse(raw) as Project
}

/** Atomically persist a project (write to a temp file, then rename). */
export async function saveProject(project: Project): Promise<void> {
  await mkdir(dataDir, { recursive: true })
  project.updatedAt = new Date().toISOString()
  const target = projectPath(project.id)
  const tmp = `${target}.tmp`
  await writeFile(tmp, JSON.stringify(project, null, 2), 'utf8')
  await rename(tmp, target)
}

export function newProject(inspiration: string, prefs: WritingPrefs): Project {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    inspiration,
    prefs,
    phase: 'outlining',
    angles: [],
    chosenAngle: null,
    outline: [],
    sections: [],
    titleCandidates: [],
    ending: null,
    createdAt: now,
    updatedAt: now,
  }
}

/** Build pending sections from the active outline. */
export function buildSections(outline: string[]): Section[] {
  return outline.map((title, index) => ({ index, title, status: 'pending', content: null }))
}

/**
 * Record a section's content. Sections after `index` are downgraded to
 * `pending` with cleared content, because their generated text depended on the
 * section that just changed and must be regenerated to stay coherent.
 */
export function setSectionContent(project: Project, index: number, content: string): void {
  const section = project.sections[index]
  section.content = content
  section.status = 'draft'
  for (const later of project.sections) {
    if (later.index > index && later.status !== 'pending') {
      later.status = 'pending'
      later.content = null
    }
  }
}

export function confirmSection(project: Project, index: number): void {
  project.sections[index].status = 'confirmed'
}

/** Delete a project file. Missing files are a no-op (idempotent teardown). */
export async function deleteProject(id: string): Promise<void> {
  await unlink(projectPath(id)).catch((error: unknown) => {
    const code = (error as { code?: string }).code
    if (code !== 'ENOENT') throw error
  })
}
