/**
 * DSKIN — a light cartoon pixel skin for the DSH web GUI, as a hot-pluggable
 * client plugin. It leaves the original UI completely untouched (no frame,
 * no background, no layout changes) and only hosts a small troop of pixel
 * pets along the bottom edge: two mice, a whale, and one switchable kitten
 * (大橘 / 小白 / 玄猫 / 花猫) picked via a tiny paw switcher. Pets are small
 * and sit on the screen edge so they never block the view.
 *
 * apply() owns the whole surface and retracts it on dispose (the
 * ThemePresenter retraction discipline: the plugin only ever removes what it
 * wrote): the `data-dsh-dskin` body attribute, the pet nodes, the switcher,
 * the injected favicon, and the document title the shell's DocumentTitle
 * will capture as the product title. The CSS rides the bundle's CSS-modules
 * auto-inject (style tag owned by the loader, removed on entry dispose).
 * No services are injected: the skin needs only the DOM.
 */
import type { Context } from '@deepseek-ai/cordis'
import css from './dskin.module.css'
import {
  KIT_BIGORANGE_BLINK,
  KIT_BIGORANGE_FACE,
  KIT_BIGORANGE_IDLE,
  KIT_BIGORANGE_NAME,
  KIT_BIGORANGE_WALK_A,
  KIT_BIGORANGE_WALK_B,
  KIT_BLACK_BLINK,
  KIT_BLACK_FACE,
  KIT_BLACK_IDLE,
  KIT_BLACK_NAME,
  KIT_BLACK_WALK_A,
  KIT_BLACK_WALK_B,
  KIT_TUXEDO_BLINK,
  KIT_TUXEDO_FACE,
  KIT_TUXEDO_IDLE,
  KIT_TUXEDO_NAME,
  KIT_TUXEDO_WALK_A,
  KIT_TUXEDO_WALK_B,
  KIT_WHITE_BLINK,
  KIT_WHITE_FACE,
  KIT_WHITE_IDLE,
  KIT_WHITE_NAME,
  KIT_WHITE_WALK_A,
  KIT_WHITE_WALK_B,
} from './mascots.ts'

/** The product title the skin pins (captured by the shell's DocumentTitle after settle). */
const SKIN_TITLE = 'DSKIN · DeepSeek Harness'

/** Walk-frame flip interval in ms while walking. */
const WALK_FRAME_MS = 200

/** Small horizontal inset so pets never clip the screen edges. */
const EDGE = 4

/** Where the chosen kitten is remembered. */
const KITTEN_STORAGE_KEY = 'dskin-kitten'

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

/** Pet spec for the switchable kitten. */
interface PetSpec {
  readonly frames: PetFrames
  readonly kind: 'kitten'
  /** movement speed in px/s */
  readonly speed: number
  /** vertical offset from the bottom of the viewport in px */
  readonly bottom: number
  /** initial x */
  readonly startX: number
  /** whether the pet flips sprite when turning around */
  readonly edgeTurn: boolean
}

/** The four switchable kittens. */
const KITTENS = [
  {
    id: 'bigorange',
    name: KIT_BIGORANGE_NAME,
    face: KIT_BIGORANGE_FACE,
    frames: { idle: KIT_BIGORANGE_IDLE, blink: KIT_BIGORANGE_BLINK, walkA: KIT_BIGORANGE_WALK_A, walkB: KIT_BIGORANGE_WALK_B } satisfies PetFrames,
  },
  {
    id: 'white',
    name: KIT_WHITE_NAME,
    face: KIT_WHITE_FACE,
    frames: { idle: KIT_WHITE_IDLE, blink: KIT_WHITE_BLINK, walkA: KIT_WHITE_WALK_A, walkB: KIT_WHITE_WALK_B } satisfies PetFrames,
  },
  {
    id: 'black',
    name: KIT_BLACK_NAME,
    face: KIT_BLACK_FACE,
    frames: { idle: KIT_BLACK_IDLE, blink: KIT_BLACK_BLINK, walkA: KIT_BLACK_WALK_A, walkB: KIT_BLACK_WALK_B } satisfies PetFrames,
  },
  {
    id: 'tuxedo',
    name: KIT_TUXEDO_NAME,
    face: KIT_TUXEDO_FACE,
    frames: { idle: KIT_TUXEDO_IDLE, blink: KIT_TUXEDO_BLINK, walkA: KIT_TUXEDO_WALK_A, walkB: KIT_TUXEDO_WALK_B } satisfies PetFrames,
  },
] as const

type KittenId = (typeof KITTENS)[number]['id']

function kittenById(id: string | null): (typeof KITTENS)[number] {
  return KITTENS.find((k) => k.id === id) ?? KITTENS[0]
}

function loadKittenId(): KittenId {
  try {
    return kittenById(localStorage.getItem(KITTEN_STORAGE_KEY)).id
  } catch {
    return KITTENS[0].id
  }
}

function saveKittenId(id: KittenId): void {
  try {
    localStorage.setItem(KITTEN_STORAGE_KEY, id)
  } catch {
    // storage unavailable — the choice simply does not persist
  }
}

/**
 * One animated pixel pet. A tiny state machine over requestAnimationFrame:
 * idle (bobbing + occasional blink) and walk (frames flip while the pet
 * glides along the bottom edge, flipping sprite direction at the edges).
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
    this.el.className = `${cls('pixelPet')} ${cls(`pixelPet${spec.kind[0].toUpperCase()}${spec.kind.slice(1)}`)}`
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

  /** Swap the sprite frameset (used by the kitten switcher). */
  setFrames(frames: PetFrames): void {
    this.spec.frames = frames
    this.sprite.innerHTML = this.state === 'walk' ? frames.walkA : frames.idle
    this.el.classList.remove(cls('pixelPetJump'))
    void this.el.offsetWidth
    this.el.classList.add(cls('pixelPetJump'))
  }

  private readonly loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min((now - this.lastNow) / 1000, 0.05)
    this.lastNow = now

    if (this.state === 'idle') {
      if (!this.blinking && this.nextBlinkAt < now) {
        this.blinking = true
        this.blinkEnd = now + 220
        this.sprite.innerHTML = this.spec.frames.blink
      } else if (this.blinking && this.blinkEnd < now) {
        this.blinking = false
        this.sprite.innerHTML = this.spec.frames.idle
        this.nextBlinkAt = now + rand(1800, 5000)
      }
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
      this.x += this.direction * this.spec.speed * dt
      const maxX = Math.max(0, (window.innerWidth ?? document.documentElement.clientWidth) - this.el.offsetWidth - EDGE)
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
      if (now >= this.nextWalkFlip) {
        this.nextWalkFlip = now + WALK_FRAME_MS
        this.walkFrame = this.walkFrame === 0 ? 1 : 0
        this.sprite.innerHTML = this.walkFrame === 0 ? this.spec.frames.walkA : this.spec.frames.walkB
      }
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

/** Pixel paw button + kitten palette. Tap the paw to switch kittens. */
class KittenSwitcher {
  private readonly el: HTMLDivElement
  private readonly palette: HTMLDivElement
  private open = false
  private readonly onDocClick: (e: MouseEvent) => void

  constructor(private readonly kitten: PixelPet) {
    this.el = document.createElement('div')
    this.el.className = cls('pixelPaw')
    this.el.innerHTML = `<span>🐾</span>`
    this.el.title = '切换小猫'
    this.el.addEventListener('click', this.toggle)

    this.palette = document.createElement('div')
    this.palette.className = cls('pixelPalette')
    this.palette.hidden = true
    for (const k of KITTENS) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = cls('pixelPaletteItem')
      item.innerHTML = `<span class="${cls('pixelPaletteFace')}">${k.face}</span><span class="${cls('pixelPaletteName')}">${k.name}</span>`
      item.addEventListener('click', () => this.pick(k))
      this.palette.append(item)
    }

    this.onDocClick = (e: MouseEvent) => {
      if (!this.el.contains(e.target as Node) && !this.palette.contains(e.target as Node)) this.close()
    }
  }

  attach(): void {
    document.body.append(this.el, this.palette)
    document.addEventListener('click', this.onDocClick)
  }

  private readonly toggle = (): void => {
    if (this.open) this.close()
    else this.openPalette()
  }

  private openPalette(): void {
    this.open = true
    this.palette.hidden = false
    this.el.dataset.pixelPawOpen = '1'
  }

  private close(): void {
    this.open = false
    this.palette.hidden = true
    delete this.el.dataset.pixelPawOpen
  }

  private pick(k: (typeof KITTENS)[number]): void {
    saveKittenId(k.id)
    this.kitten.setFrames(k.frames)
    this.close()
  }

  dispose(): void {
    document.removeEventListener('click', this.onDocClick)
    this.el.remove()
    this.palette.remove()
  }
}

/**
 * Apply the DSKIN skin: body attribute, the switchable pixel kitten, the
 * paw switcher, favicon, title. All writes are retracted by the effect
 * disposer on dispose.
 * @param ctx - owning context (the effect lifecycle owns retraction).
 */
export function apply(ctx: Context): void {
  const body = document.body
  const originalTitle = document.title
  body.dataset.dshDskin = ''

  const kittenPet = new PixelPet({
    frames: kittenById(loadKittenId()).frames,
    kind: 'kitten',
    speed: rand(22, 30),
    bottom: 4,
    startX: rand(120, 320),
    edgeTurn: true,
  })
  kittenPet.attach()
  const switcher = new KittenSwitcher(kittenPet)
  switcher.attach()

  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.href = `data:image/svg+xml;utf8,${encodeURIComponent(kittenPetFavicon())}`
  document.head.append(favicon)

  document.title = SKIN_TITLE

  ctx.effect(() => () => {
    delete body.dataset.dshDskin
    kittenPet.dispose()
    switcher.dispose()
    favicon.remove()
    if (document.title === SKIN_TITLE) document.title = originalTitle
  }, 'ui-skin-dskin: DSKIN kitten + switcher')
}

/** Favicon shows whichever kitten is currently selected. */
function kittenPetFavicon(): string {
  return kittenById(loadKittenId()).face
}
