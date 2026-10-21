/**
 * The floating annotation panel: one card per annotation, a kind filter, and
 * the composer hand-offs.
 *
 * Popovers come from the shell's `Menu` primitive so their surface, keyboard
 * handling and dismissal match the rest of the app; this file only owns the
 * triggers and the content.
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import { IconChevronDownOutlineRegular, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Annotation, Preset } from './contract.ts'
import type { BoostTranslate } from './locales.ts'
import type { BoostStore, ListFilter } from './store.ts'
import { useBoost } from './useBoost.ts'

/** Props for the panel card. */
export interface AnnotationPanelProps {
  /** Plugin store. */
  readonly store: BoostStore
  /** Localized copy. */
  readonly t: BoostTranslate
}

/**
 * Compose the text an action drops into the composer: quote, then the note the
 * user wrote about it, then the instruction to act on both. The quote comes
 * first so every "this passage" that follows has an antecedent, and the
 * instruction comes last because that is the operative ask.
 * @param t - localized copy.
 * @param annotation - source annotation.
 * @param instruction - what to do with the excerpt; empty for a plain hand-off.
 * @returns plain text blocks in reading order.
 */
function composeText(t: BoostTranslate, annotation: Annotation, instruction: string): string {
  const quoted = annotation.quote.split('\n').map(line => `> ${line}`).join('\n')
  const blocks: string[] = [quoted]
  const note = annotation.note.trim()
  if (note !== '') blocks.push(`${t('note.label')}${note}`)
  if (instruction !== '') blocks.push(instruction)
  return blocks.join('\n')
}

/** Pencil glyph for the note-edit trigger. */
function PencilIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d="M4 20h5l2.5-2.5" />
      <path d="M14.5 4.5l5 5L9 20H4v-5L14.5 4.5z" />
    </svg>
  )
}

/** Card width, mirrored in the stylesheet; the transcript gives up width + 24. */
const PANEL_WIDTH = 240

/** Disclosure chevron shared by the two trigger buttons. */
function Chevron(): React.ReactElement {
  return (
    <svg viewBox="0 0 10 6" width="9" height="6" aria-hidden focusable="false">
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Render the panel when it is open.
 * @param props - store and copy.
 * @returns the panel card, or null while closed.
 */
export function AnnotationPanel({ store, t }: AnnotationPanelProps) {
  const snapshot = useBoost(store)
  const [filterOpen, setFilterOpen] = useState(false)
  const [presetFor, setPresetFor] = useState<string | null>(null)
  const [overflowFor, setOverflowFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [box, setBox] = useState<{ top: number; maxHeight: number; right: number } | null>(null)

  // Keep the card between the transcript's top edge (below the header rule)
  // and the composer card's bottom border, so it never covers either rule and
  // never runs past the input box.
  useLayoutEffect(() => {
    if (!snapshot.panelOpen) {
      setBox(null)
      return
    }
    /**
     * Re-measure the three anchors: the transcript's top edge, the composer's
     * bottom edge, and the transcript's right edge — the card hugs that edge
     * rather than the window, so opening the right sidebar moves it along
     * instead of leaving it floating over the sidebar.
     */
    const measure = (): void => {
      const scroll = document.querySelector('[data-conversation-scroll]')
      const card = document.querySelector('[data-composer-card]')
      const scrollBox = scroll === null ? null : scroll.getBoundingClientRect()
      const top = scrollBox === null ? 84 : Math.round(scrollBox.top + 8)
      const limit = card === null ? window.innerHeight - 96 : Math.round(card.getBoundingClientRect().bottom - 8)
      const right = scrollBox === null
        ? 12
        : Math.max(12, Math.round(window.innerWidth - scrollBox.right + 10))
      // The transcript column is centred inside the scroll box, so padding of
      // S moves its right edge by only S/2. Solve for the S that lands the text
      // GAP pixels before the card instead of guessing a constant: the guess
      // left ~90px of dead space at full width.
      if (scrollBox !== null) {
        const column = document.querySelector('[data-chat-flow]')
        const columnWidth = column === null ? 0 : column.getBoundingClientRect().width
        const gap = 14
        const wanted = Math.round(-scrollBox.width + columnWidth + 20 + 2 * (PANEL_WIDTH + gap))
        const shift = columnWidth <= 0
          ? PANEL_WIDTH + 24
          : Math.max(0, Math.min(PANEL_WIDTH + 24, wanted))
        document.documentElement.style.setProperty('--dsh-boost-shift', `${shift}px`)
      }
      setBox({ top, maxHeight: Math.max(160, limit - top), right })
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

  useEffect(() => {
    if (snapshot.panelOpen) return
    setFilterOpen(false)
    setPresetFor(null)
    setOverflowFor(null)
    setEditing(null)
  }, [snapshot.panelOpen])

  if (!snapshot.panelOpen) return null

  // Never configured means the built-in pair; an explicitly empty list means
  // the user deleted every shortcut and wants no preset button at all.
  const presets: readonly Preset[] = snapshot.presets ?? [
    { label: t('preset.explain'), prompt: t('preset.explainPrompt') },
    { label: t('preset.disagree'), prompt: t('preset.disagreePrompt') },
  ]
  const primaryPreset: Preset | undefined = presets[0]
  const quotes = snapshot.annotations.filter(annotation => annotation.kind === 'quote').length
  const marks = snapshot.annotations.length - quotes
  const visible = snapshot.annotations.filter(annotation =>
    snapshot.filter === 'all' || annotation.kind === snapshot.filter)
  const unusable = [...snapshot.statuses.values()].some(status => status === 'lost' || status === 'missing')
  const filterLabel = snapshot.filter === 'mark' ? t('filter.mark') : snapshot.filter === 'all' ? t('filter.all') : t('filter.quote')

  const filterItems: MenuEntry[] = [
    { id: 'quote', label: `${t('filter.quote')} (${quotes})` },
    { id: 'mark', label: `${t('filter.mark')} (${marks})` },
    { id: 'all', label: `${t('filter.all')} (${snapshot.annotations.length})` },
  ]

  /**
   * Push composed annotation text into the composer and report the outcome.
   * @param annotation - source annotation.
   * @param instruction - what to do with the excerpt; empty for a plain hand-off.
   */
  const handOff = (annotation: Annotation, instruction: string): void => {
    store.insertText(composeText(t, annotation, instruction))
  }

  return (
    <section
      className="dsh-boost-panel"
      data-dsh-boost=""
      role="dialog"
      aria-label={t('panel.title')}
      style={box === null ? undefined : { top: box.top, maxHeight: box.maxHeight, right: box.right }}
    >
      <header className="dsh-boost-panel-head">
        <span className="dsh-boost-panel-title">
          {t('panel.title')} · {t('panel.count', { count: visible.length })}
        </span>
        <Menu
          open={filterOpen}
          align="start"
          compact
          portal
          listClassName="dsh-boost-menu-surface"
          items={filterItems}
          selectedId={snapshot.filter}
          onSelect={(id) => {
            store.setFilter(id as ListFilter)
            setFilterOpen(false)
          }}
          onClose={() => { setFilterOpen(false) }}
          anchor={(
            <button
              type="button"
              className="dsh-boost-trigger"
              aria-haspopup="menu"
              aria-expanded={filterOpen}
              onClick={() => { setFilterOpen(open => !open) }}
            >
              {filterLabel}
              <Chevron />
            </button>
          )}
        />
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
          const overflowItems: MenuEntry[] = [
            {
              id: 'kind',
              label: annotation.kind === 'quote' ? t('item.toMark') : t('item.toQuote'),
            },
            { type: 'separator', id: 'sep' },
            { id: 'delete', label: t('item.delete'), danger: true },
          ]
          const presetItems: MenuEntry[] = presets.map((preset, index) => ({
            id: `p${index}`,
            label: preset.label,
          }))
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
                  <div className="dsh-boost-note-row">
                    <button
                      type="button"
                      className="dsh-boost-icon-button"
                      aria-label={t('item.editNote')}
                      title={t('item.editNote')}
                      onClick={(event) => {
                        event.stopPropagation()
                        setEditing({ id: annotation.id, text: annotation.note })
                      }}
                    >
                      <PencilIcon />
                    </button>
                    <div className="dsh-boost-note" data-empty={annotation.note.trim() === '' ? 'true' : undefined}>
                      {annotation.note.trim() === '' ? t('item.notePlaceholder') : annotation.note}
                    </div>
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
                  <button
                    type="button"
                    className="dsh-boost-action"
                    onClick={(event) => { event.stopPropagation(); handOff(annotation, '') }}
                  >
                    {t('item.add')}
                  </button>
                )}
                {annotation.kind === 'quote' && primaryPreset !== undefined && (
                  <span className="dsh-boost-split">
                    <button
                      type="button"
                      className="dsh-boost-split-main"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (primaryPreset !== undefined) handOff(annotation, primaryPreset.prompt)
                      }}
                    >
                      {primaryPreset?.label ?? t('item.explain')}
                    </button>
                    <Menu
                      className="dsh-boost-split-slot"
                      open={presetFor === annotation.id}
                      align="start"
                      compact
                      portal
                      listClassName="dsh-boost-menu-surface"
                      items={presetItems}
                      onSelect={(id) => {
                        const preset = presets[Number(id.slice(1))]
                        if (preset !== undefined) handOff(annotation, preset.prompt)
                        setPresetFor(null)
                      }}
                      onClose={() => { setPresetFor(null) }}
                      anchor={(
                        <button
                          type="button"
                          className="dsh-boost-split-chevron"
                          aria-label={t('item.morePresets')}
                          aria-haspopup="menu"
                          aria-expanded={presetFor === annotation.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            setPresetFor(current => current === annotation.id ? null : annotation.id)
                          }}
                        >
                          <IconChevronDownOutlineRegular />
                        </button>
                      )}
                    />
                  </span>
                )}
                <Menu
                  className="dsh-boost-more-slot"
                  open={overflowFor === annotation.id}
                  align="end"
                  compact
                  portal
                  listClassName="dsh-boost-menu-surface"
                  items={overflowItems}
                  onSelect={(id) => {
                    setOverflowFor(null)
                    if (id === 'kind') store.toggleKind(annotation.id)
                    if (id === 'delete') store.remove(annotation.id)
                  }}
                  onClose={() => { setOverflowFor(null) }}
                  anchor={(
                    <button
                      type="button"
                      className="dsh-boost-more"
                      aria-label={t('item.more')}
                      aria-haspopup="menu"
                      aria-expanded={overflowFor === annotation.id}
                      onClick={(event) => {
                        event.stopPropagation()
                        setOverflowFor(current => current === annotation.id ? null : annotation.id)
                      }}
                    >
                      ⋯
                    </button>
                  )}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {unusable && <div className="dsh-boost-hint">{t('panel.lostHint')}</div>}
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
