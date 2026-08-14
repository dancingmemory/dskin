/**
 * DSKIN — a light cartoon pixel skin for the DSH web GUI, as a hot-pluggable
 * client plugin. It deliberately leaves the original UI untouched (fonts,
 * buttons, layout stay native) and only adds: a subtle sky backdrop, a thin
 * pixel frame on the app window, a pixel favicon + product title, and the
 * star of the show — an animated pixel mouse pet that walks along the bottom
 * of the screen, blinks, bobs, flips direction at the edges, hops when
 * clicked and reacts when hovered.
 *
 * apply() owns the whole surface and retracts it on dispose (the
 * ThemePresenter retraction discipline: the plugin only ever removes what it
 * wrote): the `data-dsh-dskin` body attribute the stylesheet is scoped on,
 * the pet node, the injected favicon, and the document title the shell's
 * DocumentTitle will capture as the product title. The CSS rides the
 * bundle's CSS-modules auto-inject (style tag owned by the loader, removed
 * on entry dispose). No services are injected: the skin needs only the DOM.
 */
import type { Context } from '@deepseek-ai/cordis'
import css from './dskin.module.css'
import { BLINK, IDLE, WALK_A, WALK_B } from './mascots.ts'

/** The product title the skin pins (captured by the shell's DocumentTitle after settle). */
const SKIN_TITLE = 'DSKIN · DeepSeek Harness'

/** Pet speed in CSS pixels per second. */
const PET_SPEED = 26

/** Walk-frame flip interval in ms while walking. */
const WALK_FRAME_MS = 200

/**
 * Resolve one module class name. The css-modules record types as
 * `string | undefined` under noUncheckedIndexedAccess; every key used here
 * is a literal name in this package's own stylesheet, so the fallback is
 * unreachable in practice and only satisfies the indexed-access type.
 */
const cls = (name: keyof typeof css): string => css[name] ?? ''

const rand = (min: number, max: number): number => min + Math.random() * (max - min)

/**
 * The animated pixel pet. A tiny state machine over requestAnimationFrame:
 * idle (bobbing + occasional blink) and walk (frames flip while the pet
 * glides along the bottom edge, flipping sprite direction at the viewport
 * edges). Clicking makes it hop; hovering makes it bounce in place.
 */
class PixelPet {
  private readonly el: HTMLDivElement
  private readonly flip: HTMLDivElement
  private readonly sprite: HTMLDivElement
  private readonly favicon: HTMLLinkElement

  private state: 'idle' | 'walk' = 'idle'
  private direction: 1 | -1 = 1
  private x = 16
  private walkFrame = 0
  private nextWalkFlip = 0
  private nextWalkAt = performance.now() + rand(1000, 3000)
  private walkUntil = 0
  private nextBlinkAt = performance.now() + rand(600, 2000)
  private blinkEnd = 0
  private blinking = false
  private lastNow = 0
  private raf = 0

  constructor() {
    this.el = document.createElement('div')
    this.el.className = cls('pixelPet')
    this.el.dataset.petState = 'idle'
    this.flip = document.createElement('div')
    this.flip.className = cls('pixelPetFlip')
    this.sprite = document.createElement('div')
    this.sprite.className = cls('pixelPetSprite')
    this.sprite.innerHTML = IDLE
    const shadow = document.createElement('div')
    shadow.className = cls('pixelPetShadow')
    this.flip.append(this.sprite)
    this.el.append(this.flip, shadow)
    this.el.style.left = `${this.x}px`

    const favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.href = `data:image/svg+xml;utf8,${encodeURIComponent(IDLE)}`
    this.favicon = favicon

    this.el.addEventListener('pointerenter', this.onHover)
    this.el.addEventListener('pointerleave', this.onLeave)
    this.el.addEventListener('click', this.onClick)
  }

  attach(): void {
    document.head.append(this.favicon)
    document.body.append(this.el)
    this.raf = requestAnimationFrame(this.loop)
  }

  private readonly loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min((now - this.lastNow) / 1000, 0.05)
    this.lastNow = now

    if (this.state === 'idle') {
      // occasional blink: fully independent timer from walking
      if (!this.blinking && this.nextBlinkAt < now) {
        this.blinking = true
        this.blinkEnd = now + 220
        this.sprite.innerHTML = BLINK
      } else if (this.blinking && this.blinkEnd < now) {
        this.blinking = false
        this.sprite.innerHTML = IDLE
        this.nextBlinkAt = now + rand(1800, 5000)
      }
      // decide to walk
      if (this.nextWalkAt < now) {
        this.state = 'walk'
        this.direction = Math.random() < 0.5 ? 1 : -1
        this.flip.dataset.petFlip = String(-this.direction)
        this.walkUntil = now + rand(1800, 4500)
        this.el.dataset.petState = 'walk'
        this.sprite.innerHTML = WALK_A
        this.walkFrame = 0
      }
    } else {
      // glide along the bottom edge
      this.x += this.direction * PET_SPEED * dt
      const width = this.el.offsetWidth
      const maxX = Math.max(0, (window.innerWidth ?? document.documentElement.clientWidth) - width)
      if (this.x >= maxX) {
        this.x = maxX
        this.direction = -1
        this.flip.dataset.petFlip = '1'
      } else if (this.x <= 0) {
        this.x = 0
        this.direction = 1
        this.flip.dataset.petFlip = '-1'
      }
      this.el.style.left = `${Math.round(this.x)}px`
      // walk frames
      if (now >= this.nextWalkFlip) {
        this.nextWalkFlip = now + WALK_FRAME_MS
        this.walkFrame = this.walkFrame === 0 ? 1 : 0
        this.sprite.innerHTML = this.walkFrame === 0 ? WALK_A : WALK_B
      }
      // stop walking
      if (this.walkUntil < now) {
        this.state = 'idle'
        this.el.dataset.petState = 'idle'
        this.sprite.innerHTML = IDLE
        this.nextWalkAt = now + rand(1500, 4000)
      }
    }
  }

  private readonly onHover = (): void => {
    this.el.dataset.petHover = '1'
  }

  private readonly onLeave = (): void => {
    delete this.el.dataset.petHover
  }

  private readonly onClick = (): void => {
    // hop: re-trigger the jump keyframe by toggling the class
    this.el.classList.remove(cls('pixelPetJump'))
    void this.el.offsetWidth
    this.el.classList.add(cls('pixelPetJump'))
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.el.removeEventListener('pointerenter', this.onHover)
    this.el.removeEventListener('pointerleave', this.onLeave)
    this.el.removeEventListener('click', this.onClick)
    this.el.remove()
    this.favicon.remove()
  }
}

/**
 * Apply the DSKIN skin: body attribute, the pixel pet, favicon, title.
 * All writes are retracted by the effect disposer on dispose.
 * @param ctx - owning context (the effect lifecycle owns retraction).
 */
export function apply(ctx: Context): void {
  const body = document.body
  const originalTitle = document.title
  body.dataset.dshDskin = ''

  const pet = new PixelPet()
  pet.attach()

  document.title = SKIN_TITLE

  ctx.effect(() => () => {
    delete body.dataset.dshDskin
    pet.dispose()
    // Only restore when the skin's own title still stands — a session title
    // projected by the shell must not be clobbered by skin teardown.
    if (document.title === SKIN_TITLE) document.title = originalTitle
  }, 'ui-skin-dskin: DSKIN pet + chrome')
}
