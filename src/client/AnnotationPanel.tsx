/**
 * The floating annotation panel: one card per annotation with the two
 * composer hand-offs and a delete control.
 *
 * It renders as a direct child of the shell overlay layer, which is
 * click-through; a direct child re-enables pointer events for itself, so the
 * card never blocks the conversation underneath.
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import type { Annotation } from './contract.ts'
import type { BoostTranslate } from './locales.ts'
import type { BoostStore } from './store.ts'
import { useBoost } from './useBoost.ts'

/** Props for the panel card. */
export interface AnnotationPanelProps {
  /** Plugin store. */
  readonly store: BoostStore
  /** Localized copy. */
  readonly t: BoostTranslate
}

/**
 * Compose the text an action drops into the composer.
 * @param t - localized copy.
 * @param annotation - source annotation.
 * @param lead - instruction line that opens the message.
 * @returns plain text with a quoted excerpt and the optional note.
 */
function composeText(t: BoostTranslate, annotation: Annotation, lead: string): string {
  const quoted = annotation.quote.split('\n').map(line => `> ${line}`).join('\n')
  // No blank separator lines: the draft reads as one compact block. The model
  // still sees the `>` prefix on quoted lines, which is the only boundary that
  // matters; markdown rendering in the sent bubble is incidental.
  const blocks: string[] = []
  if (lead !== '') blocks.push(lead)
  blocks.push(quoted)
  const note = annotation.note.trim()
  if (note !== '') blocks.push(`${t('note.label')}${note}`)
  return blocks.join('\n')
}

/**
 * Render the panel when it is open.
 * @param props - store and copy.
 * @returns the panel card, or null while closed.
 */
export function AnnotationPanel({ store, t }: AnnotationPanelProps) {
  const snapshot = useBoost(store)
  const [overflow, setOverflow] = useState<{ id: string; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [box, setBox] = useState<{ top: number; maxHeight: number } | null>(null)

  useEffect(() => {
    if (overflow === null) return
    /** Close the overflow menu on any press outside it. */
    const close = (event: MouseEvent): void => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-boost-overflow]') !== null) return
      setOverflow(null)
    }
    document.addEventListener('mousedown', close, true)
    return () => document.removeEventListener('mousedown', close, true)
  }, [overflow])

  // Keep the card between the transcript's top edge (below the header rule)
  // and the composer card's bottom border, so it never covers either rule and
  // never runs past the input box.
  useLayoutEffect(() => {
    if (!snapshot.panelOpen) {
      setBox(null)
      return
    }
    /** Re-measure the two anchors the card is allowed to occupy. */
    const measure = (): void => {
      const scroll = document.querySelector('[data-conversation-scroll]')
      const card = document.querySelector('[data-composer-card]')
      const top = scroll === null ? 84 : Math.round(scroll.getBoundingClientRect().top + 8)
      const limit = card === null ? window.innerHeight - 96 : Math.round(card.getBoundingClientRect().bottom - 8)
      setBox({ top, maxHeight: Math.max(160, limit - top) })
    }
    measure()
    window.addEventListener('resize', measure)
    const card = document.querySelector('[data-composer-card]')
    const observer = card === null ? null : new ResizeObserver(measure)
    if (card !== null && observer !== null) observer.observe(card)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [snapshot.panelOpen])

  if (!snapshot.panelOpen) return null

  const quotes = snapshot.annotations.filter(annotation => annotation.kind === 'quote').length
  const marks = snapshot.annotations.length - quotes
  const visible = snapshot.annotations.filter(annotation =>
    snapshot.filter === 'all' || annotation.kind === snapshot.filter)
  const unusable = [...snapshot.statuses.values()].some(status => status === 'lost' || status === 'missing')

  /**
   * Push composed annotation text into the composer and report the outcome.
   * @param annotation - source annotation.
   * @param lead - instruction line for this action.
   */
  const handOff = (annotation: Annotation, lead: string): void => {
    const result = store.insertText(composeText(t, annotation, lead))
    store.notify(result === 'ok' ? t('notice.added') : result === 'busy' ? t('notice.busy') : t('notice.failed'))
  }

  return (
    <section
      className="dsh-boost-panel"
      data-dsh-boost=""
      role="dialog"
      aria-label={t('panel.title')}
      style={box === null ? undefined : { top: box.top, maxHeight: box.maxHeight }}
    >
      <header className="dsh-boost-panel-head">
        <span className="dsh-boost-panel-title">
          {t('panel.title')} · {t('panel.count', { count: visible.length })}
        </span>
        <select
          className="dsh-boost-filter"
          value={snapshot.filter}
          aria-label={t('panel.title')}
          onChange={event => { store.setFilter(event.target.value as 'quote' | 'mark' | 'all') }}
        >
          <option value="quote">{`${t('filter.quote')} (${quotes})`}</option>
          <option value="mark">{`${t('filter.mark')} (${marks})`}</option>
          <option value="all">{`${t('filter.all')} (${snapshot.annotations.length})`}</option>
        </select>
        <button type="button" className="dsh-boost-close" onClick={() => { store.togglePanel(false) }}>
          {t('panel.close')}
        </button>
      </header>
      <ul className="dsh-boost-list">
        {visible.length === 0 && (
          <li className="dsh-boost-empty">
            {snapshot.annotations.length === 0
              ? t('panel.empty')
              : snapshot.filter === 'mark' ? t('panel.emptyMarks') : t('panel.empty')}
          </li>
        )}
        {visible.map(annotation => {
          const status = snapshot.statuses.get(annotation.id) ?? 'missing'
          return (
            <li
              key={annotation.id}
              className="dsh-boost-item"
              data-kind={annotation.kind}
              data-active={snapshot.activeId === annotation.id ? 'true' : undefined}
              onClick={() => { store.setActive(annotation.id); store.reveal(annotation.id) }}
            >
              <div className="dsh-boost-quote" data-kind={annotation.kind}>{annotation.quote}</div>
              {editing?.id === annotation.id
                ? (
                  <textarea
                    className="dsh-boost-note-edit"
                    autoFocus
                    value={editing.text}
                    placeholder={t('item.notePlaceholder')}
                    onClick={(event) => { event.stopPropagation() }}
                    onChange={(event) => { setEditing({ id: annotation.id, text: event.target.value }) }}
                    onBlur={() => {
                      store.setNote(annotation.id, editing.text.trim())
                      setEditing(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation()
                        setEditing(null)
                      }
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault()
                        store.setNote(annotation.id, editing.text.trim())
                        setEditing(null)
                      }
                    }}
                  />
                )
                : (
                  <div
                    className="dsh-boost-note"
                    data-empty={annotation.note.trim() === '' ? 'true' : undefined}
                    title={t('item.noteHint')}
                    onClick={(event) => {
                      event.stopPropagation()
                      setEditing({ id: annotation.id, text: annotation.note })
                    }}
                  >
                    {annotation.note.trim() === '' ? t('item.notePlaceholder') : annotation.note}
                  </div>
                )}
              {snapshot.diagnostics && (
                <div className="dsh-boost-meta">
                  <span className="dsh-boost-badge" data-status={status}>{status}</span>
                  <span>{`@${annotation.start}`}</span>
                </div>
              )}
              <div className="dsh-boost-actions">
                {annotation.kind === 'quote' && (
                  <>
                    <button
                      type="button"
                      className="dsh-boost-action"
                      onClick={(event) => { event.stopPropagation(); handOff(annotation, t('lead.explain')) }}
                    >
                      {t('item.explain')}
                    </button>
                    <button
                      type="button"
                      className="dsh-boost-action"
                      onClick={(event) => { event.stopPropagation(); handOff(annotation, t('lead.add')) }}
                    >
                      {t('item.add')}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="dsh-boost-more"
                  aria-label={t('item.more')}
                  onClick={(event) => {
                    event.stopPropagation()
                    const rect = event.currentTarget.getBoundingClientRect()
                    setOverflow({
                      id: annotation.id,
                      x: Math.min(rect.right - 148, window.innerWidth - 160),
                      y: rect.bottom + 4,
                    })
                  }}
                >
                  ⋯
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {overflow !== null && (() => {
        const target = snapshot.annotations.find(annotation => annotation.id === overflow.id)
        if (target === undefined) return null
        return (
          <div
            className="dsh-boost-overflow"
            data-dsh-boost=""
            data-boost-overflow=""
            style={{ left: overflow.x, top: overflow.y }}
          >
            <button
              type="button"
              onClick={() => {
                store.toggleKind(target.id)
                setOverflow(null)
              }}
            >
              {target.kind === 'quote' ? t('item.toMark') : t('item.toQuote')}
            </button>
            <button
              type="button"
              data-tone="danger"
              onClick={() => {
                store.remove(target.id)
                store.notify(t('notice.deleted'))
                setOverflow(null)
              }}
            >
              {t('item.delete')}
            </button>
          </div>
        )
      })()}
      {unusable && <div className="dsh-boost-empty">{t('panel.lostHint')}</div>}
      <footer className="dsh-boost-panel-foot">
        <button
          type="button"
          className="dsh-boost-foot-button"
          data-on={snapshot.diagnostics ? 'true' : undefined}
          onClick={() => { store.toggleDiagnostics() }}
        >
          {t('panel.diagnostics')}
        </button>
      </footer>
    </section>
  )
}
