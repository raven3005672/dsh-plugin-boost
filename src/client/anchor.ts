/**
 * Text-range locating for annotations.
 *
 * An annotation stores offsets into a message's *rendered* plain text, not its
 * Markdown source: inline syntax markers (`**`, link destinations, table
 * pipes) never reach the DOM, so source offsets would not line up. Offsets are
 * the fast path; the quote plus surrounding context re-find the range after
 * the DOM is rebuilt or the text before it changes.
 */
import type { DraftSelection, ResolveResult, TextModel } from './contract.ts'

/** Characters of context stored on each side of a range. */
const CONTEXT_CHARS = 32

/** Attribute stamped on every rendered message seat. */
const MESSAGE_ATTRIBUTE = 'data-chat-node-key'

/**
 * Attribute stamped on every rendered *seat*. One chat node can render two
 * seats (its process row and its answer), both carrying the same node key, so
 * ranges must anchor to the seat rather than to the node.
 */
const SEAT_ATTRIBUTE = 'data-chat-flow-key'

/** Escape a value for use inside a quoted attribute selector. */
function escapeValue(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

/**
 * Build a selector for one rendered seat.
 * @param flowKey - value of `data-chat-flow-key`.
 * @returns a CSS selector matching exactly that seat.
 */
export function seatSelector(flowKey: string): string {
  return `[${SEAT_ATTRIBUTE}="${escapeValue(flowKey)}"]`
}

/**
 * Concatenate every text node of a subtree and record where each one starts.
 * @param root - message element to read.
 * @returns the plain text and its segment table.
 */
export function buildTextModel(root: Element): TextModel {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const segments: { node: Text; start: number; end: number }[] = []
  let text = ''
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const value = node.nodeValue ?? ''
    const start = text.length
    text += value
    segments.push({ node: node as Text, start, end: text.length })
  }
  return { text, segments }
}

/**
 * Map a plain-text offset onto a DOM insertion point.
 * @param model - the message's text model.
 * @param offset - offset to resolve; clamped into the model.
 * @returns the text node and the offset inside it, or undefined for no text.
 */
function pointAt(model: TextModel, offset: number): { node: Text; offset: number } | undefined {
  const clamped = Math.max(0, Math.min(offset, model.text.length))
  for (const segment of model.segments) {
    if (clamped < segment.end) return { node: segment.node, offset: clamped - segment.start }
  }
  const last = model.segments.at(-1)
  if (last === undefined) return undefined
  return { node: last.node, offset: (last.node.nodeValue ?? '').length }
}

/**
 * Build a paintable DOM range for a text interval.
 * @param model - the message's text model.
 * @param start - first character offset.
 * @param end - one past the last character offset.
 * @returns the range, or undefined when the message has no text.
 */
export function rangeOf(model: TextModel, start: number, end: number): Range | undefined {
  const from = pointAt(model, start)
  const to = pointAt(model, end)
  if (from === undefined || to === undefined) return undefined
  const range = from.node.ownerDocument.createRange()
  range.setStart(from.node, from.offset)
  range.setEnd(to.node, to.offset)
  return range
}

/**
 * Express a selection as message-relative offsets plus its surroundings.
 * @param message - message element the selection starts in.
 * @param range - the current selection range.
 * @returns the selection, or undefined for an empty or out-of-range selection.
 */
export function describeSelection(message: Element, range: Range): DraftSelection | undefined {
  const model = buildTextModel(message)
  const probe = message.ownerDocument.createRange()
  probe.selectNodeContents(message)
  probe.setEnd(range.startContainer, range.startOffset)
  const start = probe.toString().length
  const end = start + range.toString().length
  if (end <= start) return undefined
  return {
    start,
    end,
    quote: model.text.slice(start, end),
    prefix: model.text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    suffix: model.text.slice(end, end + CONTEXT_CHARS),
  }
}

/** Longest common prefix length of two strings. */
function commonPrefix(a: string, b: string): number {
  let index = 0
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1
  return index
}

/** Longest common suffix length of two strings. */
function commonSuffix(a: string, b: string): number {
  let index = 0
  while (index < a.length && index < b.length && a[a.length - 1 - index] === b[b.length - 1 - index]) index += 1
  return index
}

/**
 * Locate one stored annotation in the current DOM.
 *
 * The offset hit is a single slice comparison. When it misses (the DOM was
 * rebuilt, or text ahead of the range changed), every occurrence of the quote
 * is scored by how much stored context it reproduces; a single candidate or a
 * high enough score wins, anything else is `lost`.
 * @param annotation - stored range to locate.
 * @param cache - per-refresh map of message element to text model.
 * @returns the located status and, when found, its paintable range.
 */
export function locate(
  annotation: { flowKey?: string | undefined; nodeKey: string; start: number; quote: string; prefix: string; suffix: string },
  cache?: Map<string, TextModel>,
): ResolveResult {
  const message = resolveSeat(annotation)
  if (message === null) return { status: 'missing' }

  const cacheKey = annotation.flowKey ?? annotation.nodeKey
  let model = cache?.get(cacheKey)
  if (model === undefined) {
    model = buildTextModel(message)
    cache?.set(cacheKey, model)
  }

  const length = annotation.quote.length
  if (model.text.slice(annotation.start, annotation.start + length) === annotation.quote) {
    const range = rangeOf(model, annotation.start, annotation.start + length)
    return range === undefined ? { status: 'lost' } : { status: 'exact', range }
  }

  let best = -1
  let bestScore = -1
  let candidates = 0
  for (let at = model.text.indexOf(annotation.quote); at !== -1; at = model.text.indexOf(annotation.quote, at + 1)) {
    candidates += 1
    const before = model.text.slice(Math.max(0, at - annotation.prefix.length), at)
    const after = model.text.slice(at + length, at + length + annotation.suffix.length)
    const score = commonSuffix(annotation.prefix, before) + commonPrefix(annotation.suffix, after)
    if (score > bestScore) {
      bestScore = score
      best = at
    }
  }

  const maximum = annotation.prefix.length + annotation.suffix.length
  if (best !== -1 && (candidates === 1 || bestScore >= Math.min(6, maximum))) {
    const range = rangeOf(model, best, best + length)
    return range === undefined ? { status: 'lost' } : { status: 'fuzzy', range }
  }
  return { status: 'lost' }
}

/**
 * Find the message element that owns a selection endpoint.
 * @param node - node the selection starts at.
 * @returns the message element, or null when the node sits outside a message.
 */
export function owningMessage(node: Node): Element | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
  if (element === null) return null
  return element.closest(`[${SEAT_ATTRIBUTE}]`) ?? element.closest(`[${MESSAGE_ATTRIBUTE}]`)
}

/**
 * Find the seat an annotation belongs to.
 *
 * The flow key names one rendered seat. When it is absent (older records) or
 * no longer present, every seat carrying the node key is scanned and the one
 * whose text actually holds the quote wins — one node can render two seats.
 * @param annotation - stored keys and quote.
 * @returns the seat element, or null when none carries this text.
 */
function resolveSeat(annotation: { flowKey?: string | undefined; nodeKey: string; quote: string }): Element | null {
  if (annotation.flowKey !== undefined) {
    const seat = document.querySelector(seatSelector(annotation.flowKey))
    if (seat !== null) return seat
  }
  const candidates = document.querySelectorAll(`[${MESSAGE_ATTRIBUTE}="${escapeValue(annotation.nodeKey)}"]`)
  let fallback: Element | null = null
  for (const candidate of candidates) {
    fallback ??= candidate
    if (buildTextModel(candidate).text.includes(annotation.quote)) return candidate
  }
  return fallback
}
