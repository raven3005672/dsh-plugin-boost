/**
 * Host half of boost.
 *
 * The feature is entirely browser-side: annotations live in this browser and
 * never enter the Session log, so this half only gives the Loader a row to
 * mount. It deliberately reserves no services.
 */
import type { Context } from '@deepseek-ai/cordis'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'boost'

/** No host service is required. */
export const inject: string[] = []

/**
 * Register nothing; the browser half owns every behaviour.
 * @param _ctx - host Context for the row.
 */
export function apply(_ctx: Context): void {
  // Intentionally empty: see the module comment.
}
