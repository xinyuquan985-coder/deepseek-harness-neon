// @vitest-environment jsdom
// VoiceMicButton behavior: feature detection, recognition lifecycle, and
// final transcripts appended to the draft through inputActions.setDraft.
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InputActions, InputState } from '@deepseek-ai/dsh-client-ui-conversation/src/client/input/contract.ts'
import { VoiceMicButton } from '../src/client/VoiceMicButton.tsx'
import type { VoiceMicButtonProps } from '../src/client/VoiceMicButton.tsx'

interface FakeResultEvent {
  results: {
    length: number
    [i: number]: { isFinal?: boolean; transcript?: string; [j: number]: { transcript: string } }
  }
}

class FakeRecognition {
  lang = ''
  continuous = false
  interimResults = false
  start = vi.fn()
  stop = vi.fn()
  onresult: ((event: FakeResultEvent) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null
}

const t = (key: string): string => key

function makeUseInput(draft: string) {
  const selector = (s: InputState) => s.draft
  const useInput = Object.assign((select: (s: InputState) => unknown) => select({ draft } as InputState), {
    getSnapshot: () => ({ draft } as InputState),
  }) as VoiceMicButtonProps['useInput']
  return { useInput, selector }
}

function makeActions(): InputActions {
  return {
    setDraft: vi.fn(),
    addImages: vi.fn(() => false),
    removeImage: vi.fn(),
    pruneImages: vi.fn(),
    submit: vi.fn(),
  }
}

function renderButton(draft = '') {
  const { useInput } = makeUseInput(draft)
  const inputActions = makeActions()
  // The framework kit the header-action seat composes; the component reads none of it.
  const props = {
    t,
    useInput,
    inputActions,
    sessionId: 's1',
    useSession: () => undefined,
    useProjection: () => undefined,
  } as unknown as VoiceMicButtonProps
  const view = render(<VoiceMicButton {...props} />)
  return { view, inputActions, useInput }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
})

describe('VoiceMicButton', () => {
  it('renders nothing where SpeechRecognition is unavailable', () => {
    const { view } = renderButton()
    expect(view.container.innerHTML).toBe('')
  })

  it('renders the toggle once the API exists and starts a zh-CN session on click', () => {
    const instances: FakeRecognition[] = []
    const Ctor = vi.fn(function (this: unknown) { const r = new FakeRecognition(); instances.push(r); return r })
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = Ctor
    const { view, inputActions } = renderButton()
    const button = view.getByRole('button', { name: 'voice.aria' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(Ctor).toHaveBeenCalledOnce()
    const recognition = instances[0]!
    expect(recognition.lang).toBe('zh-CN')
    expect(recognition.start).toHaveBeenCalledOnce()
    expect(button.getAttribute('aria-pressed')).toBe('true')

    // Final result lands in the draft; interim results are ignored.
    recognition.onresult!({ results: { length: 2, 0: { transcript: '临时' }, 1: { isFinal: true, 0: { transcript: '你好世界' } } } })
    expect(inputActions.setDraft).toHaveBeenCalledWith('你好世界')
    act(() => { recognition.onend!() })
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('falls back to idle when the engine refuses to start', () => {
    const instances: FakeRecognition[] = []
    const Ctor = vi.fn(function (this: unknown) {
      const r = new FakeRecognition()
      r.start = vi.fn(() => { throw new Error('not-allowed') })
      instances.push(r)
      return r
    })
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = Ctor
    const { view } = renderButton()
    const button = view.getByRole('button', { name: 'voice.aria' })
    fireEvent.click(button)
    expect(instances[0]!.start).toHaveBeenCalledOnce()
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('appends spoken text to an existing draft and stops on a second click', () => {
    const instances: FakeRecognition[] = []
    const Ctor = vi.fn(function (this: unknown) { const r = new FakeRecognition(); instances.push(r); return r })
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = Ctor
    const { view, inputActions } = renderButton('已有草稿')
    const button = view.getByRole('button', { name: 'voice.aria' })
    fireEvent.click(button)
    const recognition = instances[0]!
    recognition.onresult!({ results: { length: 1, 0: { isFinal: true, 0: { transcript: '追加内容' } } } })
    expect(inputActions.setDraft).toHaveBeenCalledWith('已有草稿 追加内容')
    fireEvent.click(button)
    expect(recognition.stop).toHaveBeenCalledOnce()
  })
})
