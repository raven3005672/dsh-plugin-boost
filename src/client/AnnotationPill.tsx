/**
 * The composer-dock entry: a compact pill that opens the annotation panel.
 *
 * It also owns the session binding. The dock slot is session-scoped, so this
 * is the one place that sees both the current session id and the composer's
 * input actions — the panel (root scope) reads them through the store.
 */
import { useEffect } from 'react'
import type { InputActionsLike } from './contract.ts'
import type { BoostTranslate } from './locales.ts'
import type { BoostStore } from './store.ts'
import { useBoost } from './useBoost.ts'

/** Props assembled by the registration wrapper from the slot's standard seats. */
export interface AnnotationPillProps {
  /** Plugin store. */
  readonly store: BoostStore
  /** Localized copy. */
  readonly t: BoostTranslate
  /** Session the dock entry is bound to. */
  readonly sessionId: string
  /** Conversation input actions for that session. */
  readonly inputActions: InputActionsLike | undefined
  /** Current composer text. */
  readonly draft: string
  /** Submission phase of the composer. */
  readonly phase: string
  /** Number of reference chips in the draft. */
  readonly occurrences: number
}

/**
 * Render the dock pill and keep the store bound to this session.
 * @param props - store, copy, and the slot's live session facts.
 * @returns the pill button.
 */
export function AnnotationPill({ store, t, sessionId, inputActions, draft, phase, occurrences }: AnnotationPillProps) {
  const snapshot = useBoost(store)

  useEffect(() => {
    store.bind(sessionId, { draft, phase, occurrences, actions: inputActions })
  }, [store, sessionId, draft, phase, occurrences, inputActions])

  // The pill counts actionable notes only: plain marks are not a queue.
  const count = snapshot.sessionId === sessionId
    ? snapshot.annotations.filter(annotation => annotation.kind === 'quote').length
    : 0
  return (
    <button
      type="button"
      className="dsh-boost-pill"
      data-active={snapshot.panelOpen ? 'true' : undefined}
      title={t('pill.tip')}
      onClick={() => { store.togglePanel() }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 20h5l2.5-2.5" />
        <path d="M14.5 4.5l5 5L9 20H4v-5L14.5 4.5z" />
      </svg>
      <span>{t('pill.label')}</span>
      {count > 0 && <span className="dsh-boost-pill-count">{count}</span>}
    </button>
  )
}
