/**
 * Settings-pane wrapper for the annotation controls.
 *
 * A `settings.section` registration receives no owner props, so this wrapper
 * subscribes to the plugin's own config namespace and projects the same
 * `{ state, mutate }` shape the row form already renders.
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { SettingsPage } from './SettingsPage.tsx'
import type { SettingsConfigOp, SettingsConfigState } from './SettingsPage.tsx'
import type { CopyKey } from './locales.ts'

/** The slice of `configForms`' form face this wrapper needs. */
export interface SettingsForm {
  /** Current snapshot, including the namespace revision used to fence writes. */
  getSnapshot(): SettingsConfigState
  /** Re-run the listener on every snapshot change. */
  subscribe(listener: () => void): () => void
  /** Apply one batch of writes, fenced by the snapshot's revision. */
  mutate(ops: readonly SettingsConfigOp[], revision?: number): Promise<boolean>
}

/** Owner props plus the inject face supplied by the section registration. */
export interface SettingsSectionProps {
  /** Namespace translator supplied by the slot registration. */
  t?(key: CopyKey): string
  /** Row settings form, resolved from the plugin's own namespace. */
  form: SettingsForm
  /** Builds the bug-report payload. */
  diagnostics?(): string
}

/**
 * Render the annotation settings inside the Settings panel.
 * @param props - form face and the namespace translator.
 * @returns the settings page body.
 */
export function SettingsSection({ t, form, diagnostics }: SettingsSectionProps): ReactElement {
  const [state, setState] = useState<SettingsConfigState>(() => form.getSnapshot())

  useEffect(() => {
    const sync = (): void => { setState(form.getSnapshot()) }
    // Subscribe first: a change landing between the read and the subscription
    // would otherwise be lost, and the replay is idempotent.
    const unsubscribe = form.subscribe(sync)
    sync()
    return unsubscribe
  }, [form])

  return (
    <SettingsPage
      t={t}
      diagnostics={diagnostics}
      form={{ state, mutate: (ops, revision) => form.mutate(ops, revision) }}
    />
  )
}
