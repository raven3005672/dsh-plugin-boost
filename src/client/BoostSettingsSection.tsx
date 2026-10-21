/**
 * Settings-pane wrapper for the boost controls.
 *
 * A `settings.section` registration receives no owner props, so this wrapper
 * subscribes to the plugin's own config namespace and projects the same
 * `{ state, mutate }` shape the row form already renders.
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { BoostSettingsRow } from './BoostSettingsRow.tsx'
import type { BoostConfigOp, BoostConfigState } from './BoostSettingsRow.tsx'
import type { BoostKey } from './locales.ts'

/** The slice of `configForms`' form face this wrapper needs. */
export interface BoostSettingsForm {
  /** Current snapshot, including the namespace revision used to fence writes. */
  getSnapshot(): BoostConfigState
  /** Re-run the listener on every snapshot change. */
  subscribe(listener: () => void): () => void
  /** Apply one batch of writes, fenced by the snapshot's revision. */
  mutate(ops: readonly BoostConfigOp[], revision?: number): Promise<boolean>
}

/** Owner props plus the inject face supplied by the section registration. */
export interface BoostSettingsSectionProps {
  /** Namespace translator supplied by the slot registration. */
  t?(key: BoostKey): string
  /** Row settings form, resolved from the plugin's own namespace. */
  form: BoostSettingsForm
}

/**
 * Render the boost settings inside the Settings panel.
 * @param props - form face and the namespace translator.
 * @returns the settings page body.
 */
export function BoostSettingsSection({ t, form }: BoostSettingsSectionProps): ReactElement {
  const [state, setState] = useState<BoostConfigState>(() => form.getSnapshot())

  useEffect(() => {
    const sync = (): void => { setState(form.getSnapshot()) }
    // Subscribe first: a change landing between the read and the subscription
    // would otherwise be lost, and the replay is idempotent.
    const unsubscribe = form.subscribe(sync)
    sync()
    return unsubscribe
  }, [form])

  return (
    <BoostSettingsRow
      t={t}
      form={{ state, mutate: (ops, revision) => form.mutate(ops, revision) }}
    />
  )
}
