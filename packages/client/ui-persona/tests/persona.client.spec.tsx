// @vitest-environment jsdom
// Persona row components: role chrome, nameplate copy, and the approved CG
// portrait assets render from props alone (no framework machinery).
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AssistantPersonaRow, PersonaAvatar, SteeringPersonaRow, UserPersonaRow } from '../src/client/PersonaAvatar.tsx'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => key

afterEach(cleanup)

describe('PersonaAvatar', () => {
  it('uses the approved A identity labels in the Chinese interface', () => {
    expect(zh['persona.user']).toBe('网络行者')
    expect(zh['persona.assistant']).toBe('Blackwall_AI')
    expect(zh['persona.userStatus']).toBe('已连接')
    expect(zh['persona.assistantStatus']).toBe('AI代理')
  })

  it('renders the netrunner skin for the user role', () => {
    const { container, getByText } = render(<PersonaAvatar role="user" name="网络行者" />)
    const row = container.firstElementChild!
    expect(row.getAttribute('data-persona-role')).toBe('user')
    expect(getByText('网络行者')).not.toBeNull()
    const frame = row.querySelector('span')
    expect(frame?.getAttribute('aria-hidden')).toBe('true')
    const portrait = frame?.querySelector('img')
    expect(portrait?.getAttribute('data-persona-asset')).toBe('netrunner-night-city-v2')
    expect(portrait?.getAttribute('alt')).toBe('')
    expect(frame?.querySelector('svg')).toBeNull()
  })

  it('renders the Blackwall AI skin for the assistant role', () => {
    const { container, getByText } = render(<PersonaAvatar role="assistant" name="黑墙 AI" status="在线" />)
    expect(container.firstElementChild!.getAttribute('data-persona-role')).toBe('assistant')
    expect(container.firstElementChild!.getAttribute('data-persona-status')).toBe('online')
    expect(getByText('黑墙 AI')).not.toBeNull()
    expect(getByText('在线')).not.toBeNull()
    const portrait = container.querySelector('img')
    expect(portrait?.getAttribute('data-persona-asset')).toBe('blackwall-night-city-v2')
    expect(portrait?.getAttribute('alt')).toBe('')
    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })

  it.each([
    [UserPersonaRow, 'persona.user', 'user'],
    [SteeringPersonaRow, 'persona.user', 'user'],
    [AssistantPersonaRow, 'persona.assistant', 'assistant'],
  ] as const)('row entries map %# to the right role and copy key', (Component, key, role) => {
    const { container, getByText } = render(<Component t={t} />)
    expect(container.firstElementChild!.getAttribute('data-persona-role')).toBe(role)
    expect(getByText(key)).not.toBeNull()
  })
})
