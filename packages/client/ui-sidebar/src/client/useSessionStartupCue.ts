import { useCallback, useEffect, useRef } from 'react'
import sessionStartupCue from './assets/session-startup-cue.mp3'

const STARTUP_RETRY_EVENTS = ['pointerdown', 'keydown'] as const

async function restartCue(audio: HTMLAudioElement): Promise<void> {
  audio.currentTime = 0
  await audio.play()
}

/**
 * Play the supplied startup cue once on mount and return a New Session cue trigger.
 * A browser-blocked startup attempt retries on the first user gesture.
 * @returns a callback for user-initiated New Session actions.
 */
export function useSessionStartupCue(): () => void {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startupPendingRef = useRef(true)
  const cleanupRetryRef = useRef<() => void>(() => {})

  useEffect(() => {
    const audio = new Audio(sessionStartupCue)
    audio.preload = 'auto'
    audioRef.current = audio
    let retryArmed = false
    let attemptInFlight = false

    const disarmRetry = (): void => {
      if (!retryArmed) return
      retryArmed = false
      for (const event of STARTUP_RETRY_EVENTS) document.removeEventListener(event, attemptStartup)
    }
    const armRetry = (): void => {
      if (retryArmed || !startupPendingRef.current) return
      retryArmed = true
      for (const event of STARTUP_RETRY_EVENTS) document.addEventListener(event, attemptStartup)
    }
    function attemptStartup(): void {
      if (!startupPendingRef.current || attemptInFlight) return
      attemptInFlight = true
      void restartCue(audio).then(
        () => {
          startupPendingRef.current = false
          disarmRetry()
        },
        () => { armRetry() },
      ).finally(() => { attemptInFlight = false })
    }

    cleanupRetryRef.current = disarmRetry
    attemptStartup()
    return disarmRetry
  }, [])

  return useCallback(() => {
    startupPendingRef.current = false
    cleanupRetryRef.current()
    const audio = audioRef.current ?? new Audio(sessionStartupCue)
    audio.preload = 'auto'
    audioRef.current = audio
    void restartCue(audio).catch(() => {
      // Browser media policy or a device error must not block New Session.
    })
  }, [])
}
