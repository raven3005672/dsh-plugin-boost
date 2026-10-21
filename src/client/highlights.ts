/**
 * Highlight painting through the CSS Custom Highlight API.
 *
 * Ranges are painted by the browser, so nothing is inserted into the Markdown
 * DOM: the renderer's settled output stays untouched and its memoised blocks
 * keep reconciling normally. The registry is document-wide, so switching
 * sessions must clear it before new ranges are painted.
 *
 * Two kinds get two names: an actionable note is warm, a plain mark is cool.
 * `::highlight()` only accepts static names, which is why the palette is fixed.
 */

/** Registry names, one per kind plus its selected state. */
const NAMES = {
  quote: 'dsh-boost-quote',
  quoteActive: 'dsh-boost-quote-active',
  mark: 'dsh-boost-mark',
  markActive: 'dsh-boost-mark-active',
} as const

/** Whether this browser can paint custom highlights. */
export function supported(): boolean {
  return typeof CSS !== 'undefined' && CSS.highlights !== undefined
}

/**
 * Replace the painted ranges.
 * @param quote - actionable-note ranges.
 * @param mark - plain-mark ranges.
 * @param quoteActive - the selected note range, when one is selected.
 * @param markActive - the selected mark range, when one is selected.
 */
export function paint(
  quote: readonly Range[],
  mark: readonly Range[],
  quoteActive?: Range,
  markActive?: Range,
): void {
  if (!supported()) return
  for (const name of Object.values(NAMES)) CSS.highlights.delete(name)
  if (quote.length > 0) CSS.highlights.set(NAMES.quote, new Highlight(...quote))
  if (mark.length > 0) CSS.highlights.set(NAMES.mark, new Highlight(...mark))
  if (quoteActive !== undefined) CSS.highlights.set(NAMES.quoteActive, new Highlight(quoteActive))
  if (markActive !== undefined) CSS.highlights.set(NAMES.markActive, new Highlight(markActive))
}

/** Drop every painted range; call when leaving a session. */
export function clear(): void {
  if (!supported()) return
  for (const name of Object.values(NAMES)) CSS.highlights.delete(name)
}
