/**
 * The Settings-page body for the plugin.
 *
 * It edits the one thing the plugin lets users decide: their own shortcuts.
 * The annotation list itself has no configurable surface by design — colours
 * and filters carry meaning, so they are not user inputs.
 *
 * The surface follows the shell's settings sections: an 18px heading, a 13px
 * intro, hairline input rows and primitive buttons, so the page reads as part
 * of Settings rather than as a plugin bolted onto it.
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Button, IconPlusOutlineRegular, IconTrashOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Preset } from './contract.ts'
import type { CopyKey } from './locales.ts'

/** One settings write the settings page accepts. */
export interface SettingsConfigOp {
  /** Set or clear one field. */
  op: 'set' | 'unset'
  /** Field path inside the row namespace. */
  path: string[]
  /** New value, for `set` only. */
  value?: unknown
}

/** The settings snapshot the page passes down. */
export interface SettingsConfigState {
  /** Whether the Host serves this row's namespace yet. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Current values, absent until the first read settles. */
  value?: { presets?: Preset[] }
  /** Raw user layer; a field present here was written by the user. */
  user?: unknown
  /** Namespace revision used to fence writes. */
  revision?: number
  /** Whether the Host accepts edits. */
  writable: boolean
}

/** Owner props of this slot. */
export interface SettingsPageProps {
  /** Namespace translator supplied by the slot registration. */
  t?(key: CopyKey): string
  /** Row settings face, absent while the namespace is not served. */
  form?: {
    state: SettingsConfigState
    mutate(ops: readonly SettingsConfigOp[], revision?: number): Promise<boolean>
  }
}

/**
 * Whether the stored layer carries an explicit `presets` field.
 *
 * The resolved value cannot answer this: the schema fills an unset array with
 * `[]`, which is also what a user who deleted every shortcut produces.
 * @param user - raw user layer from a config snapshot.
 * @returns true when the user has written the field.
 */
function hasStoredPresets(user: unknown): boolean {
  return typeof user === 'object' && user !== null && Object.hasOwn(user, 'presets')
}

/**
 * Render the annotation settings page.
 * @param props - owner props supplied by the settings section.
 * @returns the heading, the shortcut rows and their actions.
 */
export function SettingsPage({ form, t }: SettingsPageProps): ReactElement | null {
  const copy = (key: CopyKey): string => t?.(key) ?? key
  const [draft, setDraft] = useState<Preset[] | null>(null)

  useEffect(() => {
    if (form === undefined) return
    const state = form.state
    // Only a stored field becomes a draft; an unset one keeps the page on the
    // built-in pair so those rows stay visible and deletable.
    setDraft(hasStoredPresets(state.user) ? state.value?.presets ?? [] : null)
  }, [form?.state])

  if (form === undefined) return null
  const state = form.state


  /** Persist one list and adopt it locally. */
  const commit = (next: Preset[]): void => {
    setDraft(next)
    void form.mutate([{ op: 'set', path: ['presets'], value: next }])
  }
  /** Drop the user layer so the built-in pair applies again. */
  const reset = (): void => {
    setDraft(null)
    void form.mutate([{ op: 'unset', path: ['presets'] }])
  }
  /** Replace one field without writing until the input settles. */
  const edit = (index: number, field: keyof Preset, value: string): void => {
    setDraft(rows.map((preset, at) => at === index ? { ...preset, [field]: value } : preset))
  }
  const disabled = !state.writable || state.status === 'loading'
  // Nothing stored yet means the panel is showing the built-in pair; the page
  // materialises them as rows so they can be read, edited or deleted like any
  // other entry. The first write turns the implicit pair into an explicit list.
  const builtIn: Preset[] = [
    { label: copy('preset.explain'), prompt: copy('preset.explainPrompt') },
    { label: copy('preset.disagree'), prompt: copy('preset.disagreePrompt') },
  ]
  const configured = hasStoredPresets(state.user)
  const rows = draft ?? (configured ? state.value?.presets ?? [] : builtIn)

  return (
    <div className="dsh-notes-settings">
      <h2 className="dsh-notes-settings-title">{copy('nav')}</h2>
      <p className="dsh-notes-settings-intro">{copy('settings.hint')}</p>
      {rows.length === 0 && <p className="dsh-notes-settings-empty">{copy('settings.empty')}</p>}
      {rows.map((preset, index) => (
        <div className="dsh-notes-preset" key={index}>
          <input
            className="dsh-notes-input"
            value={preset.label}
            placeholder={copy('settings.label')}
            aria-label={copy('settings.label')}
            disabled={disabled}
            onChange={event => { edit(index, 'label', event.target.value) }}
            onBlur={() => { commit(rows) }}
          />
          <input
            className="dsh-notes-input"
            value={preset.prompt}
            placeholder={copy('settings.prompt')}
            aria-label={copy('settings.prompt')}
            disabled={disabled}
            onChange={event => { edit(index, 'prompt', event.target.value) }}
            onBlur={() => { commit(rows) }}
          />
          <button
            type="button"
            className="dsh-notes-settings-trash"
            aria-label={copy('settings.remove')}
            title={copy('settings.remove')}
            disabled={disabled}
            onClick={() => { commit(rows.filter((_, at) => at !== index)) }}
          >
            <IconTrashOutlineRegular />
          </button>
        </div>
      ))}
      <div className="dsh-notes-settings-actions">
        <Button
          variant="outline"
          size="sm"
          icon={<IconPlusOutlineRegular />}
          disabled={disabled}
          onClick={() => { commit([...rows, { label: '', prompt: '' }]) }}
        >
          {copy('settings.add')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || !configured}
          onClick={reset}
        >
          {copy('settings.reset')}
        </Button>
      </div>
    </div>
  )
}
