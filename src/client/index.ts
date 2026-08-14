/**
 * DSKIN — the cartoon pixel skin for the DSH web GUI, as a hot-pluggable
 * client plugin. apply() owns the whole pixel surface and retracts it on
 * dispose (the ThemePresenter retraction discipline: the plugin only ever
 * removes what it wrote): the `data-dsh-dskin` body attribute the
 * stylesheet is scoped on, the fixed title/status bars, the injected
 * favicon, and the document title the shell's DocumentTitle will capture
 * as the product title. The CSS rides the bundle's CSS-modules auto-inject
 * (style tag owned by the loader, removed on entry dispose). No services
 * are injected: the skin needs only the DOM.
 */
import type { Context } from '@deepseek-ai/cordis'
import css from './dskin.module.css'
import { MOUSE_SVG, WHALE_SVG } from './mascots.ts'

/** The product title the skin pins (captured by the shell's DocumentTitle after settle). */
const SKIN_TITLE = 'DSKIN · DeepSeek Harness'

/** Title bar window buttons (decorative glyphs, aria-hidden). */
const TITLEBAR_GLYPHS = ['–', '□', '×'] as const

/** Status bar cells; the heart cells are rendered separately as pixel hearts. */
const STATUS_CELLS = ['DSKIN', 'PLAYER 1', 'PIXEL MODE ON'] as const

/** The DSKIN brand mark shown beside the mascot in the status bar. */
const STATUS_BRAND = 'DSKIN'

/**
 * Resolve one module class name. The css-modules record types as
 * `string | undefined` under noUncheckedIndexedAccess; every key used here
 * is a literal name in this package's own stylesheet, so the fallback is
 * unreachable in practice and only satisfies the indexed-access type.
 */
const cls = (name: keyof typeof css): string => css[name] ?? ''

/**
 * Apply the DSKIN skin: body attribute, chrome bars, title, favicon.
 * All writes are retracted by the effect disposer on dispose.
 * @param ctx - owning context (the effect lifecycle owns retraction).
 */
export function apply(ctx: Context): void {
  const body = document.body
  const originalTitle = document.title
  body.dataset.dshDskin = ''

  const titlebar = document.createElement('div')
  titlebar.className = cls('dskinTitlebar')
  titlebar.dataset.skinChrome = 'titlebar'
  const icon = document.createElement('span')
  icon.className = cls('dskinTitlebarIcon')
  icon.innerHTML = WHALE_SVG
  const title = document.createElement('span')
  title.className = cls('dskinTitlebarTitle')
  title.textContent = SKIN_TITLE
  titlebar.append(icon, title)
  for (const glyph of TITLEBAR_GLYPHS) {
    const btn = document.createElement('span')
    btn.className = cls('dskinTitlebarBtn')
    btn.setAttribute('aria-hidden', 'true')
    btn.textContent = glyph
    titlebar.append(btn)
  }

  const statusbar = document.createElement('div')
  statusbar.className = cls('dskinStatusbar')
  statusbar.dataset.skinChrome = 'statusbar'
  const mascot = document.createElement('span')
  mascot.className = cls('dskinStatusMascot')
  mascot.innerHTML = MOUSE_SVG
  const brand = document.createElement('span')
  brand.className = cls('dskinStatusBrand')
  brand.textContent = STATUS_BRAND
  const spacer = document.createElement('span')
  spacer.className = cls('dskinStatusbarSpacer')
  statusbar.append(mascot, brand, spacer)
  for (const cell of STATUS_CELLS) {
    const el = document.createElement('span')
    el.className = cls('dskinStatusbarCell')
    el.textContent = cell
    statusbar.append(el)
  }
  for (let i = 0; i < 3; i += 1) {
    const heart = document.createElement('span')
    heart.className = cls('dskinStatusHeart')
    heart.setAttribute('aria-hidden', 'true')
    heart.textContent = '♥'
    statusbar.append(heart)
  }

  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.href = `data:image/svg+xml;utf8,${encodeURIComponent(MOUSE_SVG)}`
  document.head.append(favicon)

  document.title = SKIN_TITLE
  body.append(titlebar, statusbar)

  ctx.effect(() => () => {
    delete body.dataset.dshDskin
    titlebar.remove()
    statusbar.remove()
    favicon.remove()
    // Only restore when the skin's own title still stands — a session title
    // projected by the shell must not be clobbered by skin teardown.
    if (document.title === SKIN_TITLE) document.title = originalTitle
  }, 'ui-skin-dskin: DSKIN chrome')
}
