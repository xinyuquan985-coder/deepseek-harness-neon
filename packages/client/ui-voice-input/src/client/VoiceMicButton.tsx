// VoiceMicButton: a header-action mic toggle. When the browser exposes a
// SpeechRecognition implementation, clicking starts a zh-CN recognition
// session whose final transcripts append to the composer draft through the
// public inputActions.setDraft path; the button renders nothing where the
// API is absent, and its CSS gates visibility to the cyber theme.

import clsx from 'clsx'
import { useRef, useState } from 'react'
import { IconMicOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './VoiceMicButton.module.css'

/** Minimal Web Speech API surface; browsers without it never see the button. */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: unknown) => void) | null
}

interface SpeechResultEvent {
  results: {
    readonly length: number
    [index: number]: { isFinal?: boolean; [j: number]: { transcript: string } }
  }
}

type SpeechCtor = new () => SpeechRecognitionLike

/** Resolve the engine's SpeechRecognition constructor (prefixed where needed). */
function recognitionCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type VoiceMicButtonProps =
  PropsRuntime<'conversation.input.right'> & PropsLocale<'voice'>

/**
 * Mic toggle riding the session header action seat. Final transcripts land in
 * the draft; interim results stay local so only settled speech is written.
 * @param props - runtime share (useInput/inputActions) + locale seat.
 * @returns the toggle element tree, or null where recognition is unavailable.
 */
export function VoiceMicButton({ t, useInput, inputActions }: VoiceMicButtonProps) {
  const draft = useInput(s => s.draft)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [listening, setListening] = useState(false)
  const recognition = useRef<SpeechRecognitionLike | null>(null)

  if (recognitionCtor() === null) return null

  const stop = (): void => {
    recognition.current?.stop()
    recognition.current = null
    setListening(false)
  }

  const start = (): void => {
    const Ctor = recognitionCtor()
    if (Ctor === null) return
    const next = new Ctor()
    next.lang = 'zh-CN'
    next.continuous = false
    next.interimResults = true
    next.onresult = (event) => {
      const finals: string[] = []
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result === undefined || result.isFinal !== true) continue
        const alternative = result[0]
        if (alternative !== undefined) finals.push(alternative.transcript)
      }
      if (finals.length === 0) return
      const spoken = finals.join('').trim()
      if (spoken === '') return
      const current = draftRef.current
      inputActions.setDraft(current === '' ? spoken : current + ' ' + spoken)
    }
    next.onend = () => { setListening(false); recognition.current = null }
    next.onerror = () => { setListening(false); recognition.current = null }
    recognition.current = next
    setListening(true)
    // A browser may expose the constructor but refuse to start (no mic
    // permission, no speech service); fail back to idle instead of throwing.
    try {
      next.start()
    } catch {
      recognition.current = null
      setListening(false)
    }
  }

  return (
    <button
      type="button"
      className={clsx(css.button, listening && css.listening)}
      aria-pressed={listening}
      aria-label={listening ? t('voice.listening') : t('voice.aria')}
      title={listening ? t('voice.listening') : t('voice.aria')}
      onClick={() => { if (listening) stop(); else start() }}
    >
      <IconMicOutline16 />
    </button>
  )
}
