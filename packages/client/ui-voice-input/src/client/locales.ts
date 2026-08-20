/** `voice` namespace dictionaries (voice-input toggle copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'voice.aria': '语音输入',
  'voice.listening': '聆听中…',
} satisfies Record<string, string>

/** The voice namespace key union. */
export type VoiceKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'voice.aria': 'Voice input',
  'voice.listening': 'Listening…',
} satisfies Record<VoiceKey, string>
