/**
 * Host half of boost.
 *
 * Annotations live in the browser and never enter the Session log, so this
 * half owns one thing: the settings namespace the Plugins page edits. The
 * preset list is user vocabulary (labels + prompt lines), not plugin logic,
 * which is why it lives in volatile config rather than in a dictionary.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'highlight-notes'

/** No host service is required; the config row is served by the settings layer. */
export const inject: string[] = []

/** One user-defined shortcut: the button label and the line it writes. */
export interface Preset {
  /** Button text, e.g. 解释. */
  label: string
  /** Instruction line prepended to the excerpt. */
  prompt: string
}

/** Settings that reach the browser half through configForms. */
export interface Config {
  /**
   * User shortcuts. Absent means "never configured" and selects the built-in,
   * localized set, so a fresh install follows the UI language. An explicitly
   * empty list means the user removed every shortcut and wants none.
   */
  presets?: Preset[]
}

export const Config = z.object({
  presets: z.array(z.object({
    label: z.string().default(''),
    prompt: z.string().default(''),
  })).required(false).volatile(),
})

/**
 * Register nothing; the settings layer reads `Config` for this row.
 * @param _ctx - host Context for the row.
 */
export function apply(_ctx: Context): void {
  // Intentionally empty: the config schema above is the whole host contract.
}
