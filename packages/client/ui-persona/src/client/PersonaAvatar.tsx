// PersonaAvatar: the character-skin row mounted above user and assistant chat
// nodes through the keyed 'conversation.chat.persona' seat. Each role renders
// the approved CG portrait and a nameplate; the whole row is CSS-gated to the
// cyber theme so the light/dark palettes keep their chrome unchanged.

import clsx from 'clsx'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './PersonaAvatar.module.css'
import netrunnerPortrait from './assets/netrunner-night-city-v2.png'
import blackwallPortrait from './assets/blackwall-night-city-v2.png'

interface PersonaAvatarProps {
  /** Which character skin this row shows. */
  role: 'user' | 'assistant'
  /** Nameplate text resolved from the persona dictionary. */
  name: string
  /** Compact operational state shown beside the nameplate. */
  status?: string
}

/**
 * One persona row: approved CG portrait + nameplate. The CSS module hides the
 * row outside the cyber theme and aligns user rows to the right.
 * @param props - role and resolved name.
 * @returns the avatar row element tree.
 */
export function PersonaAvatar({ role, name, status }: PersonaAvatarProps) {
  const isUser = role === 'user'
  return (
    <div
      className={clsx(css.root, isUser ? css.user : css.assistant)}
      data-persona-role={role}
      data-persona-status={status === undefined ? undefined : 'online'}
    >
      <span className={css.frame} aria-hidden="true">
        <span className={css.viewport}>
          <img
            className={css.portrait}
            src={isUser ? netrunnerPortrait : blackwallPortrait}
            alt=""
            data-persona-asset={isUser ? 'netrunner-night-city-v2' : 'blackwall-night-city-v2'}
          />
        </span>
      </span>
      <span className={css.identity}>
        <span className={css.name}>{name}</span>
        {status !== undefined && (
          <span className={css.status}><span className={css.statusDot} aria-hidden="true" />{status}</span>
        )}
      </span>
    </div>
  )
}

type PersonaRowProps = { t: PropsLocale<'persona'>['t'] }

/** Persona seat entry for user message rows (the netrunner skin). */
export function UserPersonaRow({ t }: PersonaRowProps) {
  return <PersonaAvatar role="user" name={t('persona.user')} status={t('persona.userStatus')} />
}

/** Persona seat entry for steering rows - user-authored, same skin as user rows. */
export function SteeringPersonaRow({ t }: PersonaRowProps) {
  return <PersonaAvatar role="user" name={t('persona.user')} status={t('persona.userStatus')} />
}

/** Persona seat entry for assistant rows (the Blackwall AI skin). */
export function AssistantPersonaRow({ t }: PersonaRowProps) {
  return <PersonaAvatar role="assistant" name={t('persona.assistant')} status={t('persona.assistantStatus')} />
}
