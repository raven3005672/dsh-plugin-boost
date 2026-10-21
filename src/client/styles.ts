/**
 * The plugin's stylesheet: highlight pseudo-element colours plus the panel,
 * menu and composer chrome. Injected once per document.
 *
 * Colours come from the shell's semantic tokens so the surface follows the
 * light and dark palettes without a second definition.
 */
export const STYLES = `
/* The foreground is pinned to a dark ink: the amber plate is light in both
   palettes, so inheriting the dark theme's near-white text would wash out. */
::highlight(dsh-boost-quote) {
  background-color: color-mix(in srgb, #ffc400 72%, transparent);
  color: #1f2328;
}
::highlight(dsh-boost-quote-active) {
  background-color: color-mix(in srgb, #ff8f00 88%, transparent);
  color: #1f2328;
}
/* Plain marks are a cool plate so a page full of them reads as "noted", not
   "still to do". Kept light enough for the pinned dark ink in both palettes. */
::highlight(dsh-boost-mark) {
  background-color: color-mix(in srgb, #7dd3fc 72%, transparent);
  color: #1f2328;
}
::highlight(dsh-boost-mark-active) {
  background-color: color-mix(in srgb, #38bdf8 88%, transparent);
  color: #1f2328;
}

/* The conversation column is centred inside its scroll container, so the
   shift goes on the scroll container: the column moves left as a whole and
   keeps its own max width. */
html[data-dsh-boost-shift] [data-conversation-scroll] {
  padding-right: 312px;
  transition: padding-right 180ms ease;
}

/* Matches the shipped statistics pills: 22px tall, 12px muted text, no
   border, 8px radius, transparent until hover. */
.dsh-boost-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 1px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #81858c);
  font: inherit;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
  /* The shipped pills sit one step lighter than label-secondary; matching the
     composite means fading the whole control rather than picking a new token. */
  opacity: 0.8;
}
.dsh-boost-pill svg {
  width: 14px;
  height: 14px;
  flex: none;
}
.dsh-boost-pill:hover {
  background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-primary, #1f2328);
  opacity: 1;
}
.dsh-boost-pill[data-active='true'] {
  background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.06));
  color: var(--dsw-alias-brand-primary, #2563eb);
  opacity: 1;
}
.dsh-boost-pill-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.dsh-boost-panel {
  position: fixed;
  top: 84px;
  right: 12px;
  width: 288px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  font: inherit;
  z-index: 30;
}
.dsh-boost-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-boost-panel-title {
  flex: none;
  white-space: nowrap;
}
.dsh-boost-close {
  margin-left: auto;
  font: inherit;
  font-size: 12px;
  border: 0;
  background: none;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #6b7280);
}
.dsh-boost-filter {
  min-width: 0;
  max-width: 128px;
  flex: 0 1 auto;
  font: inherit;
  font-size: 11px;
  padding: 1px 16px 1px 4px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  /* A native menu-list select keeps the UA's light chrome even in the dark
     palette; dropping the appearance is the only way to honour our colours. */
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--dsw-alias-bg-layer-2, #ffffff);
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2381858c' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 9px;
  color: var(--dsw-alias-label-primary, #1f2328);
  cursor: pointer;
}
body[data-ds-dark-theme] .dsh-boost-filter {
  color-scheme: dark;
}
.dsh-boost-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 8px;
  list-style: none;
}
.dsh-boost-empty {
  padding: 16px 12px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.7;
}
/* A row is a tinted block with a colour bar, not a bordered card: the bar
   carries the kind (warm = actionable note, cool = plain mark), the tint keeps
   the row readable as one unit, and hover/selection deepen the same hue. */
.dsh-boost-item {
  --dsh-boost-accent: #b6bcc6;
  --dsh-boost-tint: rgba(38, 49, 72, 0.03);
  border: 0;
  border-left: 3px solid var(--dsh-boost-accent);
  border-radius: 6px;
  padding: 7px 9px;
  margin-bottom: 6px;
  cursor: pointer;
  background: var(--dsh-boost-tint);
  box-shadow: none;
  transition: background-color 120ms ease;
}
.dsh-boost-item[data-kind='quote'] {
  --dsh-boost-accent: #f0b429;
  --dsh-boost-tint: rgba(240, 180, 41, 0.09);
}
.dsh-boost-item[data-kind='mark'] {
  --dsh-boost-accent: #38a3e8;
  --dsh-boost-tint: rgba(56, 163, 232, 0.09);
}
.dsh-boost-item:hover {
  background: color-mix(in srgb, var(--dsh-boost-accent) 14%, transparent);
}
.dsh-boost-item[data-active='true'] {
  background: color-mix(in srgb, var(--dsh-boost-accent) 18%, transparent);
  box-shadow: inset 0 0 0 1px rgba(15, 17, 21, 0.25);
}
body[data-ds-dark-theme] .dsh-boost-item[data-kind='quote'] {
  --dsh-boost-tint: rgba(240, 180, 41, 0.14);
}
body[data-ds-dark-theme] .dsh-boost-item[data-kind='mark'] {
  --dsh-boost-tint: rgba(56, 163, 232, 0.14);
}
body[data-ds-dark-theme] .dsh-boost-item[data-active='true'] {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34);
}

.dsh-boost-quote[data-kind='mark'] {
  background: color-mix(in srgb, #7dd3fc 38%, transparent);
}
/* The row carries a tint of the same hue, so the excerpt needs a step more
   presence in the dark palette to stay the focal element. */
body[data-ds-dark-theme] .dsh-boost-quote {
  background: color-mix(in srgb, #ffc400 52%, transparent);
}
body[data-ds-dark-theme] .dsh-boost-quote[data-kind='mark'] {
  background: color-mix(in srgb, #7dd3fc 52%, transparent);
}
.dsh-boost-quote {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-primary, #1f2328);
  background: color-mix(in srgb, #ffc400 34%, transparent);
  border-radius: 3px;
  padding: 0 2px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dsh-boost-note {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary, #6b7280);
  white-space: pre-wrap;
  border-radius: 4px;
  padding: 1px 3px;
  margin-left: -3px;
  cursor: text;
}
.dsh-boost-note:hover {
  background: color-mix(in srgb, var(--dsh-boost-accent) 12%, transparent);
}
.dsh-boost-note[data-empty='true'] {
  opacity: 0.65;
  font-style: italic;
}
.dsh-boost-note-edit {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 4px;
  min-height: 48px;
  resize: vertical;
  font: inherit;
  font-size: 12px;
  line-height: 1.6;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-boost-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-secondary, #6b7280);
}
.dsh-boost-badge {
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0 5px;
  font-size: 10px;
}
.dsh-boost-badge[data-status='exact'] { color: #047857; }
.dsh-boost-badge[data-status='fuzzy'] { color: #b45309; }
.dsh-boost-badge[data-status='lost'],
.dsh-boost-badge[data-status='missing'] { color: #b91c1c; }
.dsh-boost-panel-foot {
  display: flex;
  justify-content: flex-end;
  padding: 4px 10px;
  border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
}
.dsh-boost-foot-button {
  font: inherit;
  font-size: 11px;
  padding: 2px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #81858c);
  cursor: pointer;
  opacity: 0.8;
}
.dsh-boost-foot-button:hover {
  background: var(--dsw-alias-bg-layer-3, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-primary, #1f2328);
  opacity: 1;
}
.dsh-boost-foot-button[data-on='true'] {
  color: var(--dsw-alias-brand-primary, #2563eb);
  opacity: 1;
}
.dsh-boost-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.dsh-boost-action {
  font: inherit;
  font-size: 11.5px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  background: transparent;
  color: var(--dsw-alias-label-primary, #1f2328);
  cursor: pointer;
}
.dsh-boost-action:hover {
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  color: var(--dsw-alias-brand-primary, #2563eb);
}
.dsh-boost-more {
  margin-left: auto;
  font: inherit;
  font-size: 12px;
  line-height: 1;
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280);
  cursor: pointer;
}
.dsh-boost-more:hover {
  border-color: var(--dsw-alias-border-l2, #e5e7eb);
  color: var(--dsw-alias-label-primary, #1f2328);
}

.dsh-boost-overflow {
  position: fixed;
  z-index: 60;
  min-width: 148px;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
}
.dsh-boost-overflow button {
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 12px;
  padding: 6px 10px;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--dsw-alias-label-primary, #1f2328);
  cursor: pointer;
}
.dsh-boost-overflow button:hover {
  background: var(--dsw-alias-bg-layer-3, rgba(0, 0, 0, 0.05));
}
.dsh-boost-overflow button[data-tone='danger'] {
  color: #b91c1c;
}

.dsh-boost-menu {
  position: fixed;
  min-width: 132px;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  z-index: 40;
}
.dsh-boost-menu button {
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 12.5px;
  padding: 6px 10px;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--dsw-alias-label-primary, #1f2328);
  cursor: pointer;
}
.dsh-boost-menu button:hover {
  background: var(--dsw-alias-bg-layer-2, #f3f4f6);
}

.dsh-boost-composer {
  position: fixed;
  width: 300px;
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  z-index: 40;
}
.dsh-boost-composer textarea {
  width: 100%;
  min-height: 64px;
  resize: vertical;
  box-sizing: border-box;
  font: inherit;
  font-size: 12.5px;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-boost-composer-row {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}
.dsh-boost-composer-row button {
  font: inherit;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  background: transparent;
  color: var(--dsw-alias-label-primary, #1f2328);
  cursor: pointer;
}
/* The primary fill inverts per palette (near-black in light, near-white in
   dark), so its label must come from the inverted label token — a fixed white
   would vanish against the dark palette's white fill. */
.dsh-boost-composer-row button[data-primary='true'] {
  background: var(--dsw-alias-button-primary-fill, #2563eb);
  border-color: var(--dsw-alias-button-primary-fill, #2563eb);
  color: var(--dsw-alias-label-primary-inverted, #ffffff);
  font-weight: 500;
}
.dsh-boost-composer-row button[data-primary='true']:hover {
  background: var(--dsw-alias-button-primary-hover, var(--dsw-alias-button-primary-fill, #2563eb));
  filter: brightness(1.05);
}
.dsh-boost-toast {
  position: fixed;
  left: 50%;
  top: 76px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.92);
  color: #ffffff;
  font-size: 12px;
  z-index: 50;
  pointer-events: none;
}
`
