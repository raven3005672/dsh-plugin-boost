/**
 * The Plugins-page row for boost.
 *
 * It edits the one thing the plugin lets users decide: their own shortcuts.
 * The annotation list itself has no configurable surface by design — colours
 * and filters carry meaning, so they are not user inputs.
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type { Preset } from './contract.ts'
import type { BoostKey } from './locales.ts'

/** One settings write the Plugins page accepts. */
export interface BoostConfigOp {
  /** Set or clear one field. */
  op: 'set' | 'unset'
  /** Field path inside the row namespace. */
  path: string[]
  /** New value, for `set` only. */
  value?: unknown
}

/** The settings snapshot the page passes down. */
export interface BoostConfigState {
  /** Whether the Host serves this row's namespace yet. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Current values, absent until the first read settles. */
  value?: { presets?: Preset[] }
  /** Namespace revision used to fence writes. */
  revision?: number
  /** Whether the Host accepts edits. */
  writable: boolean
}

/** Owner props of this slot: the two views the Plugins page renders. */
export interface BoostSettingsRowProps {
  /** `summary` fills the description line; `page` renders the body. */
  view: 'summary' | 'page'
  /** Namespace translator supplied by the slot registration. */
  t?(key: BoostKey): string
  /** Row settings face, absent while the namespace is not served. */
  form?: {
    state: BoostConfigState
    mutate(ops: readonly BoostConfigOp[], revision?: number): Promise<boolean>
  }
}

/**
 * Render the row config page.
 * @param props - owner props supplied by the Plugins page.
 * @returns the description line, the form, or null while nothing is known.
 */
export function BoostSettingsRow({ view, form, t }: BoostSettingsRowProps): ReactElement | null {
  const copy = (key: BoostKey): string => t?.(key) ?? key
  const [draft, setDraft] = useState<Preset[] | null>(null)

  useEffect(() => {
    const configured = form?.state.value?.presets
    if (configured !== undefined) setDraft(configured)
  }, [form?.state.value])

  if (form === undefined) return null
  const state = form.state
  const presets = draft ?? state.value?.presets ?? []

  if (view === 'summary') {
    return <span>{copy('settings.summary').replace('{count}', String(presets.length))}</span>
  }
  if (state.value === undefined) return <p className="dsh-boost-settings-hint">{copy('settings.hint')}</p>

  /** Persist one list and adopt it locally. */
  const commit = (next: Preset[]): void => {
    setDraft(next)
    void form.mutate([{ op: 'set', path: ['presets'], value: next }])
  }
  /** Replace one field without writing until the input settles. */
  const edit = (index: number, field: keyof Preset, value: string): void => {
    setDraft(presets.map((preset, at) => at === index ? { ...preset, [field]: value } : preset))
  }
  const disabled = !state.writable

  return (
    <div className="dsh-boost-settings">
      <p className="dsh-boost-settings-hint">{copy('settings.hint')}</p>
      {presets.length === 0 && <p className="dsh-boost-settings-hint">{copy('settings.empty')}</p>}
      {presets.map((preset, index) => (
        <div className="dsh-boost-settings-row" key={index}>
          <input
            className="dsh-boost-settings-input"
            style={{ width: 120 }}
            value={preset.label}
            placeholder={copy('settings.label')}
            disabled={disabled}
            onChange={event => { edit(index, 'label', event.target.value) }}
            onBlur={() => { commit(presets) }}
          />
          <input
            className="dsh-boost-settings-input"
            value={preset.prompt}
            placeholder={copy('settings.prompt')}
            disabled={disabled}
            onChange={event => { edit(index, 'prompt', event.target.value) }}
            onBlur={() => { commit(presets) }}
          />
          <button
            type="button"
            className="dsh-boost-settings-button"
            disabled={disabled}
            onClick={() => { commit(presets.filter((_, at) => at !== index)) }}
          >
            {copy('settings.remove')}
          </button>
        </div>
      ))}
      <div className="dsh-boost-settings-row">
        <button
          type="button"
          className="dsh-boost-settings-button"
          disabled={disabled}
          onClick={() => { commit([...presets, { label: '', prompt: '' }]) }}
        >
          {copy('settings.add')}
        </button>
        <button
          type="button"
          className="dsh-boost-settings-button"
          disabled={disabled || presets.length === 0}
          onClick={() => { commit([]) }}
        >
          {copy('settings.reset')}
        </button>
      </div>
    </div>
  )
}
