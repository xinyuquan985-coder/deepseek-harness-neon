import type { ChatMessage } from './llm.ts'
import type { Project, WritingPrefs } from '../shared/types.ts'

/**
 * The coach persona: a senior self-media editor who breaks a long article into
 * small guided steps and produces only the current step, never the full draft.
 */
const SYSTEM =
  '你是一位资深公众号/自媒体主编与写作教练。你擅长把一篇长文的创作拆解成清晰的小步骤，用提问和选项启发作者，一次只产出当前需要的那一小步，绝不一次性输出全文。所有要求 JSON 的回答，都只输出一个合法 JSON 对象，不要包含多余文字、解释或代码围栏。'

function prefsText(prefs: WritingPrefs): string {
  const parts: string[] = []
  if (prefs.audience) parts.push(`目标读者：${prefs.audience}`)
  if (prefs.length) parts.push(`目标篇幅：${prefs.length}`)
  if (prefs.tone) parts.push(`语气风格：${prefs.tone}`)
  return parts.length > 0 ? parts.join('\n') : '（未指定）'
}

/** Confirmed sections before `upTo`, joined as context for continuity. */
function confirmedContext(project: Project, upTo: number): string {
  const parts = project.sections
    .filter(s => s.index < upTo && s.status === 'confirmed' && s.content)
    .map(s => `## ${s.title}\n${s.content}`)
  return parts.length > 0 ? parts.join('\n\n') : '（尚无已确认段落）'
}

/** Step 1: inspiration → candidate topic angles, each with an outline draft. */
export function outlineMessages(inspiration: string, prefs: WritingPrefs): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        '作者只想填一个“灵感”，剩下的由你启发式引导完成。',
        '',
        `灵感：${inspiration}`,
        `写作偏好：\n${prefsText(prefs)}`,
        '',
        '第一步：请给出 3 个各不相同的选题角度，并为每个角度配一份 3~6 个小标题的大纲草案。',
        '角度要具体、有冲突感或信息增量，适合公众号长文。',
        '',
        '只输出一个 JSON 对象：',
        '{"angles":[{"text":"角度的一句话说明","outline":["小标题1","小标题2"]}]}',
      ].join('\n'),
    },
  ]
}

/** Step 2: for one section, offer 3 actionable writing angles. */
export function sectionAngleMessages(project: Project, index: number): ChatMessage[] {
  const section = project.sections[index]
  const angle = project.angles[project.chosenAngle ?? 0]?.text ?? ''
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `灵感：${project.inspiration}`,
        `已选选题角度：${angle}`,
        `全文大纲：\n${project.outline.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        '',
        `现在要写第 ${index + 1} 节：${section?.title ?? ''}`,
        '',
        '请为这一节给出 3 个不同的写作切入角度，每个用一句简短、可执行的话描述（例如“从一个具体场景切入”“用一组数据制造反差”“直接抛出一个扎心的问题”）。',
        '只输出一个 JSON 对象：{"angles":["角度1","角度2","角度3"]}',
      ].join('\n'),
    },
  ]
}

/** Step 3: write exactly one section, anchored to the chosen angle and prior text. */
export function writeSectionMessages(project: Project, index: number, angle: string): ChatMessage[] {
  const section = project.sections[index]
  const topicAngle = project.angles[project.chosenAngle ?? 0]?.text ?? ''
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `灵感：${project.inspiration}`,
        `选题角度：${topicAngle}`,
        `写作偏好：\n${prefsText(project.prefs)}`,
        `全文大纲：\n${project.outline.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        '',
        `已确认的前文：\n${confirmedContext(project, index)}`,
        '',
        `现在只写第 ${index + 1} 节：${section?.title ?? ''}`,
        `写作切入角度：${angle}`,
        '',
        '要求：',
        '1. 只写这一节的正文，不要写标题，不要写其他章节，不要写结尾总结。',
        '2. 自然承接已确认的前文；若这是第一节，则直接用一个有吸引力的开头切入。',
        '3. 篇幅与目标篇幅匹配，语言贴近目标读者。',
        '4. 直接输出正文（可用 Markdown 段落），不要任何解释或前后缀。',
      ].join('\n'),
    },
  ]
}

/** Step 4: finishing — candidate titles plus a closing lift. */
export function finishMessages(project: Project): ChatMessage[] {
  const body = project.sections
    .filter(s => s.content)
    .map(s => `## ${s.title}\n${s.content}`)
    .join('\n\n')
  const topicAngle = project.angles[project.chosenAngle ?? 0]?.text ?? ''
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `灵感：${project.inspiration}`,
        `选题角度：${topicAngle}`,
        '',
        `已完成的正文：\n${body}`,
        '',
        '现在收尾，请完成两件事：',
        '1. 给出 3 个备选标题（要抓人、信息量足、适合公众号）。',
        '2. 给出 1~2 句的结尾升华，让文章收得有力。',
        '',
        '只输出一个 JSON 对象：{"titles":["标题1","标题2","标题3"],"ending":"结尾文字"}',
      ].join('\n'),
    },
  ]
}
