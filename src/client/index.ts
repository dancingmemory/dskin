/**
 * DSKIN — a light cartoon pixel skin for the DSH web GUI, as a hot-pluggable
 * client plugin. It deliberately leaves the original UI untouched (fonts,
 * buttons, layout stay native) and only adds: a subtle sky backdrop with a
 * pixel grass strip, a thin pixel frame on the app window, a pixel favicon +
 * product title, and a troop of animated pixel pets — two cartoon mice that
 * stroll along the bottom edge (stepping, blinking, turning at the edges)
 * and a pixel whale that swims slowly through the sky. Hover a pet and it
 * bounces; click it and it hops.
 *
 * apply() owns the whole surface and retracts it on dispose (the
 * ThemePresenter retraction discipline: the plugin only ever removes what it
 * wrote): the `data-dsh-dskin` body attribute the stylesheet is scoped on,
 * the pet nodes, the injected favicon, and the document title the shell's
 * DocumentTitle will capture as the product title. The CSS rides the
 * bundle's CSS-modules auto-inject (style tag owned by the loader, removed
 * on entry dispose). No services are injected: the skin needs only the DOM.
 */
import type { Context } from '@deepseek-ai/cordis'
import css from './dskin.module.css'
import {
  MOUSE_BLINK,
  MOUSE_IDLE,
  MOUSE_WALK_A,
  MOUSE_WALK_B,
  WHALE_BLINK,
  WHALE_IDLE,
  WHALE_WALK_A,
  WHALE_WALK_B,
} from './mascots.ts'

/** The product title the skin pins (captured by the shell's DocumentTitle after settle). */
const SKIN_TITLE = 'DSKIN · DeepSeek Harness'

/** Walk-frame flip interval in ms while walking. */
const WALK_FRAME_MS = 200

/** Pixel frame insets on body (mirrors the stylesheet) — pets stay inside it. */
const FRAME_X = 12
const FRAME_BOTTOM = 26

/**
 * Resolve one module class name. The css-modules record types as
 * `string | undefined` under noUncheckedIndexedAccess; every key used here
 * is a literal name in this package's own stylesheet, so the fallback is
 * unreachable in practice and only satisfies the indexed-access type.
 */
const cls = (name: keyof typeof css): string => css[name] ?? ''

const rand = (min: number, max: number): number => min + Math.random() * (max - min)

interface PetFrames {
  readonly idle: string
  readonly blink: string
  readonly walkA: string
  readonly walkB: string
}

interface PetSpec {
  readonly frames: PetFrames
  /** sprite modifier class (pixelPetMouse / pixelPetWhale) */
  readonly kind: 'mouse' | 'whale'
  /** movement speed in px/s */
  readonly speed: number
  /** vertical offset from the bottom of the viewport in px */
  readonly bottom: number
  /** initial x */
  readonly startX: number
  /** whether the pet turns around at the edges (whale just swims back) */
  readonly edgeTurn: boolean
}

const MOUSE_FRAMES: PetFrames = { idle: MOUSE_IDLE, blink: MOUSE_BLINK, walkA: MOUSE_WALK_A, walkB: MOUSE_WALK_B }
const WHALE_FRAMES: PetFrames = { idle: WHALE_IDLE, blink: WHALE_BLINK, walkA: WHALE_WALK_A, walkB: WHALE_WALK_B }

/**
 * One animated pixel pet. A tiny state machine over requestAnimationFrame:
 * idle (bobbing + occasional blink) and walk (frames flip while the pet
 * glides along its lane, flipping sprite direction at the viewport edges).
 * Clicking makes it hop; hovering makes it bounce in place.
 */
class PixelPet {
  private readonly el: HTMLDivElement
  private readonly flip: HTMLDivElement
  private readonly sprite: HTMLDivElement
  private readonly spec: PetSpec

  private state: 'idle' | 'walk' = 'idle'
  private direction: 1 | -1 = 1
  private x: number
  private walkFrame = 0
  private nextWalkFlip = 0
  private nextWalkAt: number
  private walkUntil = 0
  private nextBlinkAt: number
  private blinkEnd = 0
  private blinking = false
  private lastNow = 0
  private raf = 0

  constructor(spec: PetSpec) {
    this.spec = spec
    this.x = spec.startX
    this.nextWalkAt = performance.now() + rand(800, 2200)
    this.nextBlinkAt = performance.now() + rand(600, 1800)

    this.el = document.createElement('div')
    this.el.className = `${cls('pixelPet')} ${cls(spec.kind === 'whale' ? 'pixelPetWhale' : 'pixelPetMouse')}`
    this.el.dataset.petState = 'idle'
    this.el.style.bottom = `${spec.bottom}px`
    this.flip = document.createElement('div')
    this.flip.className = cls('pixelPetFlip')
    this.sprite = document.createElement('div')
    this.sprite.className = cls('pixelPetSprite')
    this.sprite.innerHTML = spec.frames.idle
    const shadow = document.createElement('div')
    shadow.className = cls('pixelPetShadow')
    this.flip.append(this.sprite)
    this.el.append(this.flip, shadow)
    this.el.style.left = `${Math.round(this.x)}px`

    this.el.addEventListener('pointerenter', this.onHover)
    this.el.addEventListener('pointerleave', this.onLeave)
    this.el.addEventListener('click', this.onClick)
  }

  attach(): void {
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
        this.sprite.innerHTML = this.spec.frames.blink
      } else if (this.blinking && this.blinkEnd < now) {
        this.blinking = false
        this.sprite.innerHTML = this.spec.frames.idle
        this.nextBlinkAt = now + rand(1800, 5000)
      }
      // decide to walk
      if (this.nextWalkAt < now) {
        this.state = 'walk'
        this.direction = Math.random() < 0.5 ? 1 : -1
        this.flip.dataset.petFlip = String(-this.direction)
        this.walkUntil = now + rand(1800, 4500)
        this.el.dataset.petState = 'walk'
        this.sprite.innerHTML = this.spec.frames.walkA
        this.walkFrame = 0
      }
    } else {
      // glide along the lane
      this.x += this.direction * this.spec.speed * dt
      const maxX = Math.max(0, (window.innerWidth ?? document.documentElement.clientWidth) - this.el.offsetWidth - FRAME_X)
      if (this.x >= maxX) {
        this.x = maxX
        this.direction = -1
        if (this.spec.edgeTurn) this.flip.dataset.petFlip = '1'
      } else if (this.x <= 0) {
        this.x = 0
        this.direction = 1
        if (this.spec.edgeTurn) this.flip.dataset.petFlip = '-1'
      }
      this.el.style.left = `${Math.round(this.x)}px`
      // walk frames
      if (now >= this.nextWalkFlip) {
        this.nextWalkFlip = now + WALK_FRAME_MS
        this.walkFrame = this.walkFrame === 0 ? 1 : 0
        this.sprite.innerHTML = this.walkFrame === 0 ? this.spec.frames.walkA : this.spec.frames.walkB
      }
      // stop walking
      if (this.walkUntil < now) {
        this.state = 'idle'
        this.el.dataset.petState = 'idle'
        this.sprite.innerHTML = this.spec.frames.idle
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
  }
}

/** The pet troop: two mice on the grass strip + a whale swimming in the sky. */
const PET_SPECS: readonly PetSpec[] = [
  {
    frames: MOUSE_FRAMES, kind: 'mouse', speed: rand(22, 30), bottom: FRAME_BOTTOM,
    startX: rand(20, 120), edgeTurn: true,
  },
  {
    frames: MOUSE_FRAMES, kind: 'mouse', speed: rand(18, 26), bottom: FRAME_BOTTOM,
    startX: rand(140, 260), edgeTurn: true,
  },
  {
    frames: WHALE_FRAMES, kind: 'whale', speed: 14, bottom: 120,
    startX: rand(200, 400), edgeTurn: false,
  },
]

/**
 * Apply the DSKIN skin: body attribute, the pixel pet troop, favicon, title.
 * All writes are retracted by the effect disposer on dispose.
 * @param ctx - owning context (the effect lifecycle owns retraction).
 */
export function apply(ctx: Context): void {
  const body = document.body
  const originalTitle = document.title
  body.dataset.dshDskin = ''

  const pets = PET_SPECS.map((spec) => new PixelPet(spec))
  for (const pet of pets) pet.attach()

  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.href = `data:image/svg+xml;utf8,${encodeURIComponent(MOUSE_IDLE)}`
  document.head.append(favicon)

  document.title = SKIN_TITLE

  ctx.effect(() => () => {
    delete body.dataset.dshDskin
    for (const pet of pets) pet.dispose()
    favicon.remove()
    // Only restore when the skin's own title still stands — a session title
    // projected by the shell must not be clobbered by skin teardown.
    if (document.title === SKIN_TITLE) document.title = originalTitle
  }, 'ui-skin-dskin: DSKIN pets + chrome')
}
