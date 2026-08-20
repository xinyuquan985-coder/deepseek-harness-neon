/** The lifecycle stage of a writing project. */
export type Phase = 'outlining' | 'writing' | 'done'

/** Optional writing preferences supplied alongside the inspiration. */
export interface WritingPrefs {
  audience?: string
  length?: string
  tone?: string
}

/** One candidate topic angle, paired with its own outline draft. */
export interface AngleOption {
  text: string
  outline: string[]
}

/** Lifecycle of a single article section. */
export type SectionStatus = 'pending' | 'draft' | 'confirmed'

/** One outline item materialized into a writable section. */
export interface Section {
  index: number
  title: string
  status: SectionStatus
  content: string | null
}

/** Durable state of one writing project, persisted as JSON. */
export interface Project {
  id: string
  inspiration: string
  prefs: WritingPrefs
  phase: Phase
  angles: AngleOption[]
  chosenAngle: number | null
  outline: string[]
  sections: Section[]
  titleCandidates: string[]
  ending: string | null
  createdAt: string
  updatedAt: string
}

/** Request body for creating a project. */
export interface CreateProjectRequest {
  inspiration: string
  prefs?: WritingPrefs
}

/** LLM result for the first step: candidate topic angles, each with an outline. */
export interface OutlineResult {
  angles: AngleOption[]
}

/** LLM result for a section's writing angles. */
export interface SectionAnglesResult {
  angles: string[]
}

/** Request body for writing a section, either via an angle or freeform content. */
export interface WriteSectionRequest {
  angle?: string
  content?: string
}

/** Uniform error body returned by the API on failure. */
export interface ErrorBody {
  error: string
}
