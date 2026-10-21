/**
 * The Settings-page body for boost.
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
import type { BoostKey } from './locales.ts'

/** One settings write the settings page accepts. */
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

/** Owner props of this slot. */
export interface BoostSettingsRowProps {
  /** Namespace translator supplied by the slot registration. */
  t?(key: BoostKey): string
  /** Row settings face, absent while the namespace is not served. */
  form?: {
    state: BoostConfigState
    mutate(ops: readonly BoostConfigOp[], revision?: number): Promise<boolean>
  }
}

/**
 * Render the boost settings page.
 * @param props - owner props supplied by the settings section.
 * @returns the heading, the shortcut rows and their actions.
 */
export function BoostSettingsRow({ form, t }: BoostSettingsRowProps): ReactElement | null {
  const copy = (key: BoostKey): string => t?.(key) ?? key
  const [draft, setDraft] = useState<Preset[] | null>(null)

  useEffect(() => {
    const configured = form?.state.value?.presets
    if (configured !== undefined) setDraft(configured)
  }, [form?.state.value])

  if (form === undefined) return null
  const state = form.state
  const presets = draft ?? state.value?.presets ?? []

  /** Persist one list and adopt it locally. */
  const commit = (next: Preset[]): void => {
    setDraft(next)
    void form.mutate([{ op: 'set', path: ['presets'], value: next }])
  }
  /** Replace one field without writing until the input settles. */
  const edit = (index: number, field: keyof Preset, value: string): void => {
    setDraft(presets.map((preset, at) => at === index ? { ...preset, [field]: value } : preset))
  }
  const disabled = !state.writable || state.status === 'loading'

  return (
    <div className="dsh-boost-settings">
      <h2 className="dsh-boost-settings-title">{copy('nav')}</h2>
      <p className="dsh-boost-settings-intro">{copy('settings.hint')}</p>
      {presets.length === 0 && <p className="dsh-boost-settings-empty">{copy('settings.empty')}</p>}
      {presets.map((preset, index) => (
        <div className="dsh-boost-preset" key={index}>
          <input
            className="dsh-boost-input"
            value={preset.label}
            placeholder={copy('settings.label')}
            aria-label={copy('settings.label')}
            disabled={disabled}
            onChange={event => { edit(index, 'label', event.target.value) }}
            onBlur={() => { commit(presets) }}
          />
          <input
            className="dsh-boost-input"
            value={preset.prompt}
            placeholder={copy('settings.prompt')}
            aria-label={copy('settings.prompt')}
            disabled={disabled}
            onChange={event => { edit(index, 'prompt', event.target.value) }}
            onBlur={() => { commit(presets) }}
          />
          <button
            type="button"
            className="dsh-boost-settings-trash"
            aria-label={copy('settings.remove')}
            title={copy('settings.remove')}
            disabled={disabled}
            onClick={() => { commit(presets.filter((_, at) => at !== index)) }}
          >
            <IconTrashOutlineRegular />
          </button>
        </div>
      ))}
      <div className="dsh-boost-settings-actions">
        <Button
          variant="outline"
          size="sm"
          icon={<IconPlusOutlineRegular />}
          disabled={disabled}
          onClick={() => { commit([...presets, { label: '', prompt: '' }]) }}
        >
          {copy('settings.add')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || presets.length === 0}
          onClick={() => { commit([]) }}
        >
          {copy('settings.reset')}
        </Button>
      </div>
    </div>
  )
}
