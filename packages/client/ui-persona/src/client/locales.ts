/** `persona` namespace dictionaries (character-skin copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'persona.user': '网络行者',
  'persona.assistant': 'Blackwall_AI',
  'persona.userStatus': '已连接',
  'persona.assistantStatus': 'AI代理',
} satisfies Record<string, string>

/** The persona namespace key union. */
export type PersonaKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'persona.user': 'Netrunner',
  'persona.assistant': 'Blackwall AI',
  'persona.userStatus': 'connected',
  'persona.assistantStatus': 'online',
} satisfies Record<PersonaKey, string>
