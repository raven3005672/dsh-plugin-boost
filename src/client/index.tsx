/**
 * Browser half of boost.
 *
 * Two seats: a pill in the composer dock (session scope, where the composer's
 * input actions and the current session id are available) and the floating
 * panel plus selection menu on the shell overlay layer (root scope). The
 * store in between holds annotations per session; nothing here touches
 * Sessions, model requests, or the workspace.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { AnnotationPill } from './AnnotationPill.tsx'
import { BoostOverlay } from './BoostOverlay.tsx'
import { en, zh, type BoostKey } from './locales.ts'
import { BoostStore } from './store.ts'
import { STYLES } from './styles.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'boost'

/** Services this plugin reads. */
export const inject = ['slots', 'locale']

/** Copy namespace this plugin owns. */
const LOCALE_NS = 'boost'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Annotation copy. */
    boost: BoostKey
  }
}

/** Standard seats of a composer-dock entry plus this plugin's copy. */
type DockProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<'boost'>

/** Standard seats of an overlay entry plus this plugin's copy. */
type OverlayProps = PropsRuntime<'shell.overlay'> & PropsLocale<'boost'>

/**
 * Register both seats and the stylesheet.
 * @param ctx - client Context.
 */
export function apply(ctx: Context): void {
  const store = new BoostStore()
  store.loadDiagnostics()

  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }))

  ctx.effect(() => {
    const style = document.createElement('style')
    style.textContent = STYLES
    document.head.appendChild(style)
    return () => { style.remove() }
  })

  ctx.effect(() => () => { store.dispose() })

  /**
   * Dock entry: binds the store to the session and the composer's actions.
   * @param props - session-standard seats plus copy.
   * @returns the pill.
   */
  const Dock = (props: DockProps) => {
    const draft = props.useInput((state: { draft: string }) => state.draft)
    const phase = props.useInput((state: { phase: string }) => state.phase)
    const occurrences = props.useInput((state: { occurrences: readonly unknown[] }) => state.occurrences.length)
    return (
      <AnnotationPill
        store={store}
        t={props.t}
        sessionId={props.sessionId}
        inputActions={props.inputActions}
        draft={draft}
        phase={phase}
        occurrences={occurrences}
      />
    )
  }

  /**
   * Overlay entry: the panel, selection menu, note composer and toast.
   * @param props - overlay seats plus copy.
   * @returns the overlay surfaces.
   */
  const Overlay = (props: OverlayProps) => <BoostOverlay store={store} t={props.t} />

  // `inject` waits for the declaration: a composition without the conversation
  // dock simply never mounts the pill instead of failing at load.
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'boost.annotations', order: 2, locale: LOCALE_NS },
    Dock,
  ))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'boost.overlay', locale: LOCALE_NS },
    Overlay,
  ))
}
