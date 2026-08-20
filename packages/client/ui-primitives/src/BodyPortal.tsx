import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Escape page stacking contexts by rendering children directly under body.
 * @param props - content that must share the application's top overlay plane.
 * @returns the body-portaled content.
 */
export function BodyPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
