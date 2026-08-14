/**
 * DSKIN — a light cartoon pixel skin for the DSH web GUI, as a hot-pluggable
 * client plugin. It leaves the original UI completely untouched (no frame,
 * no background, no layout changes) and spawns 1–4 random pixel kittens
 * along the bottom edge that wander, interact, and play with each other.
 *
 * apply() owns the whole surface and retracts it on dispose: the
 * `data-dsh-dskin` body attribute, all pet nodes, the switcher,
 * the injected favicon, and the document title. The CSS rides the bundle's
 * CSS-modules auto-inject (style tag owned by the loader, removed on entry
 * dispose). No services are injected: the skin needs only the DOM.
 */
import type { Context } from '@deepseek-ai/cordis'
import css from './dskin.module.css'
import { DSKIN_VERSION } from './version.ts'
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

/** Walk-frame flip interval in ms while walking. */
const WALK_FRAME_MS = 200

/** Small horizontal inset so pets never clip the screen edges. */
const EDGE = 4

/** Where the chosen kitten is remembered. */
const KITTEN_STORAGE_KEY = 'dskin-kitten'

/** Random kitten count range per page load. */
const CAT_COUNT_MIN = 1
const CAT_COUNT_MAX = 4

/** Sprite height estimate (42px wide, 20×15 viewBox). */
const SPRITE_H = 32

/** How long a dropped cat plays near its landing spot before roaming free. */
const PLAY_LOCAL_MS = 9000

/** How long the selection star stays visible before auto-clearing. */
const SELECT_MS = 10000

/** Distance in px at which two cats trigger an interaction. */
const INTERACT_DIST = 60

/** How long (ms) a cat stays in the playful interaction state. */
const INTERACT_DURATION = 800

/** How long (ms) after an interaction the cat is exempt from re-triggering. */
const INTERACT_COOLDOWN = 1300

/** Vertical extent (px) of the cats' home zone above the screen bottom. */
const ZONE_HEIGHT = 160

/** Movement (px) before a press counts as a drag instead of a click. */
const DRAG_THRESHOLD = 6

/** Interval (ms) between heart pops while the cat is being petted. */
const HEART_INTERVAL = 1400

/** Drag the cat this close to the top edge and it latches (hangs). */
const HANG_Y = 2

/** Pull distance (px) below the latch line to un-hang back into a drag. */
const UNHANG_DRAG = 40

/* ------------------------------------------------------------------ */
/* built-in updater: checks the GitHub repo for new releases           */
/* ------------------------------------------------------------------ */

/** GitHub API endpoint returning the latest release tag. */
const UPDATE_URL = 'https://api.github.com/repos/dancingmemory/dskin/releases/latest'

/** Fallback source: the raw package.json on the default branch. */
const UPDATE_FALLBACK_URL = 'https://raw.githubusercontent.com/dancingmemory/dskin/main/package.json'

/** How often the checker polls in the background (6 h). */
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000

/** A manual check (panel open) is only re-run when the last one is older. */
const UPDATE_STALE_MS = 30 * 60 * 1000

/** Compare two dotted version strings ('1.0.5' / 'v1.0.5'). */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = String(a).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

/** Polls the repo for a newer version; stays silent on network errors. */
class UpdateChecker {
  latest: string | null = null
  hasUpdate = false
  /** Called whenever the state changes (drives the paw badge + panel row). */
  onChange: (() => void) | null = null

  private nextCheckAt = 0
  private checking = false

  /** Fetch the latest release version from GitHub (with a package.json fallback). */
  private async fetchLatest(): Promise<string | null> {
    try {
      const res = await fetch(UPDATE_URL, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as { tag_name?: unknown }
        const tag = String(data.tag_name ?? '').trim().replace(/^v/i, '')
        if (tag) return tag
      }
    } catch {
      // fall through to the raw package.json
    }
    try {
      const res = await fetch(UPDATE_FALLBACK_URL, { cache: 'no-store' })
      if (!res.ok) return null
      const pkg = await res.json() as { version?: unknown }
      const version = String(pkg.version ?? '').trim()
      return version || null
    } catch {
      return null
    }
  }

  /** Run a check now unless a fresh one exists (or one is in flight). */
  async check(force = false): Promise<void> {
    if (this.checking) return
    if (!force && Date.now() < this.nextCheckAt) return
    this.checking = true
    this.nextCheckAt = Date.now() + UPDATE_STALE_MS
    try {
      const latest = await this.fetchLatest()
      if (latest) {
        this.latest = latest
        this.hasUpdate = compareVersions(latest, DSKIN_VERSION) > 0
        this.onChange?.()
      }
    } finally {
      this.checking = false
    }
  }
}

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
  readonly kind: 'kitten'
  readonly speed: number
  readonly bottom: number
  readonly startX: number
}

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
 * One animated pixel kitten. A state machine over requestAnimationFrame:
 * idle (bobbing + blink), walk (stepping along the bottom edge), drag
 * (grabbed by the pointer — dangles and struggles) and return (gliding back
 * into the home zone after being dropped outside it).
 * Petting (hover) pops hearts; dragging is a different experience — the cat
 * sways, its shadow shrinks, and it occasionally cries "!". Click = hop.
 * Cats that meet inside the zone stop to play, then scatter apart.
 */
type PetState = 'idle' | 'walk' | 'drag' | 'hang' | 'return'

class PixelPet {
  private readonly el: HTMLDivElement
  private readonly hang: HTMLDivElement
  private readonly flip: HTMLDivElement
  private readonly sprite: HTMLDivElement
  private readonly marker: HTMLSpanElement
  private spec: PetSpec

  private state: PetState = 'idle'
  private direction: 1 | -1 = 1
  private x: number
  private y = 0
  private walkFrame = 0
  private nextWalkFlip = 0
  private nextWalkAt: number
  private walkUntil = 0
  private nextBlinkAt: number
  private blinkEnd = 0
  private blinking = false
  private lastNow = 0
  private raf = 0

  /* 2D roaming (replaced by bottom-walking + drop-and-play) */
  private playUntil = 0
  private nextPlayHopAt = 0

  private interacting = false
  private interactEnd = 0
  private leaveUntil = 0

  /* dragging */
  private dragging = false
  private hanging = false
  private grabDx = 0
  private grabDy = 0
  private movedDist = 0
  private lastPointerX = 0
  private lastPointerY = 0
  /* returning to the home zone */
  private returnFromX = 0
  private returnFromY = 0
  private returnToX = 0
  private returnToY = 0
  private returnT = 0

  /* petted: hearts pop while hovered */
  private nextHeartAt = 0
  /* dragged: occasional "!" bubble */
  private nextBubbleAt = 0

  constructor(spec: PetSpec) {
    this.spec = spec
    this.x = spec.startX
    this.nextWalkAt = performance.now() + rand(800, 2200)
    this.nextBlinkAt = performance.now() + rand(600, 1800)

    this.el = document.createElement('div')
    this.el.className = `${cls('pixelPet')} ${cls(`pixelPet${spec.kind[0].toUpperCase()}${spec.kind.slice(1)}`)}`
    this.el.dataset.petState = 'idle'
    this.hang = document.createElement('div')
    this.hang.className = cls('pixelPetHang')
    this.flip = document.createElement('div')
    this.flip.className = cls('pixelPetFlip')
    this.sprite = document.createElement('div')
    this.sprite.className = cls('pixelPetSprite')
    this.sprite.innerHTML = spec.frames.idle
    const shadow = document.createElement('div')
    shadow.className = cls('pixelPetShadow')
    this.flip.append(this.sprite)
    this.hang.append(this.flip)
    // selection marker: a tiny star above the cat that is being recolored
    this.marker = document.createElement('span')
    this.marker.className = cls('pixelPetSelected')
    this.marker.textContent = '★'
    this.marker.hidden = true
    this.el.append(this.hang, shadow, this.marker)
    // top-based positioning everywhere (bottom stays a CSS fallback only)
    const vh = window.innerHeight ?? document.documentElement.clientHeight ?? 900
    this.y = vh - SPRITE_H - spec.bottom
    this.el.style.left = `${Math.round(this.x)}px`
    this.el.style.top = `${Math.round(this.y)}px`

    this.el.addEventListener('pointerenter', this.onHover)
    this.el.addEventListener('pointerleave', this.onLeave)
    this.el.addEventListener('pointerdown', this.onPointerDown)
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
    this.hop()
  }

  /** One quick hop (click / selection feedback). */
  hop(): void {
    this.el.classList.remove(cls('pixelPetJump'))
    void this.el.offsetWidth
    this.el.classList.add(cls('pixelPetJump'))
  }

  /** Return the pet's bounding-box center x for interaction checks. */
  centerX(): number {
    return this.x + (this.el.offsetWidth ?? 42) / 2
  }

  /**
   * Start a playful interaction: snap to idle, wiggle, then walk away from
   * the partner once the wiggle ends (so close cats always separate again).
   * @param now - current rAF timestamp
   * @param away - direction to face/walk when the interaction ends (1 | -1)
   */
  startInteraction(now: number, away: 1 | -1): void {
    this.direction = away
    this.flip.dataset.petFlip = String(-away)
    if (this.state === 'walk') {
      this.setState('idle')
      this.sprite.innerHTML = this.spec.frames.idle
    }
    this.interacting = true
    this.interactEnd = now + INTERACT_DURATION
    this.leaveUntil = now + INTERACT_DURATION + INTERACT_COOLDOWN
    this.nextWalkAt = now + INTERACT_DURATION + rand(150, 400)
    this.el.dataset.petInteract = '1'
  }

  /** Whether the cat is mid-wiggle or still in the post-interaction cooldown. */
  isBusy(now: number): boolean {
    return this.leaveUntil > now || this.state === 'return'
  }

  /** Whether the cat is currently held by the pointer. */
  isDragging(): boolean {
    return this.dragging
  }

  /* ------------------------------------------------------------------ */
  /* dragging & home zone                                                 */
  /* ------------------------------------------------------------------ */

  /** The cat's home zone: a band of ZONE_HEIGHT px above the screen bottom. */
  private zone(): { top: number; bottom: number; left: number; right: number } {
    const vw = window.innerWidth ?? document.documentElement.clientWidth
    const vh = window.innerHeight ?? document.documentElement.clientHeight
    const w = this.el.offsetWidth || 42
    return { top: vh - ZONE_HEIGHT, bottom: vh - SPRITE_H - this.spec.bottom, left: EDGE, right: vw - w - EDGE }
  }

  /** Begin a slow descent back to the bottom edge. */
  private beginReturn(): void {
    const zone = this.zone()
    this.returnFromX = this.x
    this.returnFromY = this.y
    this.returnToX = Math.max(zone.left, Math.min(zone.right, this.x))
    this.returnToY = zone.bottom
    this.returnT = 0
    this.setState('return')
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    const rect = this.el.getBoundingClientRect()
    this.dragging = true
    this.movedDist = 0
    this.grabDx = e.clientX - rect.left
    this.grabDy = e.clientY - rect.top
    this.lastPointerX = e.clientX
    this.lastPointerY = e.clientY
    this.setState('drag')
    this.el.style.top = `${Math.round(rect.top)}px`
    this.y = rect.top
    try {
      this.el.setPointerCapture(e.pointerId)
    } catch {
      // capture unsupported (jsdom) — move/up still arrive on the element
    }
    this.el.addEventListener('pointermove', this.onPointerMove)
    this.el.addEventListener('pointerup', this.onPointerUp)
    this.el.addEventListener('pointercancel', this.onPointerCancel)
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    const dx = e.clientX - this.lastPointerX
    const dy = e.clientY - this.lastPointerY
    this.movedDist += Math.abs(dx) + Math.abs(dy)
    this.lastPointerX = e.clientX
    this.lastPointerY = e.clientY

    const zone = this.zone()
    const nextX = Math.max(zone.left, Math.min(zone.right, e.clientX - this.grabDx))
    const nextY = Math.max(0, Math.min(e.clientY - this.grabDy, zone.bottom))

    // latch on the top edge: the cat hangs there instead of falling
    if (!this.hanging && nextY <= HANG_Y) {
      this.hanging = true
      this.setState('hang')
      this.el.dataset.petHang = '1'
      this.nextBubbleAt = 0
    } else if (this.hanging && nextY > HANG_Y + UNHANG_DRAG) {
      this.hanging = false
      this.setState('drag')
      delete this.el.dataset.petHang
    }

    this.x = nextX
    this.y = this.hanging ? HANG_Y : nextY
    this.el.style.left = `${Math.round(this.x)}px`
    this.el.style.top = `${Math.round(this.y)}px`
  }

  private readonly onPointerUp = (): void => {
    if (!this.dragging) return
    if (this.hanging) {
      // let go while hanging: the cat stays up there until grabbed again
      this.hanging = false
      this.dragging = false
      this.el.removeEventListener('pointermove', this.onPointerMove)
      this.el.removeEventListener('pointerup', this.onPointerUp)
      this.el.removeEventListener('pointercancel', this.onPointerCancel)
      this.setState('hang')
      return
    }
    this.finishDrag()
  }

  private readonly onPointerCancel = (): void => {
    if (!this.dragging) return
    this.finishDrag()
  }

  private finishDrag(): void {
    this.dragging = false
    this.el.removeEventListener('pointermove', this.onPointerMove)
    this.el.removeEventListener('pointerup', this.onPointerUp)
    this.el.removeEventListener('pointercancel', this.onPointerCancel)
    const zone = this.zone()
    const inside = this.y >= zone.top - 24 && this.y <= zone.bottom + 24 && this.x >= zone.left && this.x <= zone.right
    if (inside) {
      // dropped inside the zone: the cat stays at the landing spot and plays
      // there, then slowly descends back to the bottom
      this.playUntil = performance.now() + PLAY_LOCAL_MS
      this.nextPlayHopAt = 0
      this.el.style.top = `${Math.round(this.y)}px`
      this.setState('idle')
    } else {
      // dropped above the zone: a slow, graceful descent back into it
      this.beginReturn()
    }
  }

  /** Position the sprite frame set. */
  private setState(state: PetState): void {
    this.state = state
    this.el.dataset.petState = state
  }

  /** Mark this cat as the currently-selected one (for the type switcher). */
  setSelected(selected: boolean): void {
    if (selected) {
      this.el.dataset.petSelected = '1'
      this.marker.hidden = false
    } else {
      delete this.el.dataset.petSelected
      this.marker.hidden = true
    }
  }

  /** Whether the given node is inside this cat. */
  contains(node: Node): boolean {
    return this.el.contains(node)
  }

  /** Whether the cat hangs from the top edge. */
  isHanging(): boolean {
    return this.state === 'hang'
  }

  private endInteract(): void {
    this.interacting = false
    delete this.el.dataset.petInteract
  }

  private readonly loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min((now - this.lastNow) / 1000, 0.05)
    this.lastNow = now

    // Interaction timeout
    if (this.interacting && this.interactEnd < now) {
      this.endInteract()
    }

    // Petting hearts: while hovered (and not dragged/interacting) pop hearts
    if (this.el.dataset.petHover === '1' && this.state !== 'drag' && !this.interacting && this.nextHeartAt < now) {
      this.nextHeartAt = now + HEART_INTERVAL
      this.popHeart()
    }

    if (this.state === 'drag') {
      // dangling in the pointer's grip: occasional "!" bubble
      if (this.nextBubbleAt < now) {
        this.nextBubbleAt = now + rand(700, 1400)
        this.popBubble('!')
      }
      return
    }

    if (this.state === 'hang') {
      // hanging from the top edge: sway + occasional "…" bubble
      if (this.nextBubbleAt < now) {
        this.nextBubbleAt = now + rand(1200, 2400)
        this.popBubble('…')
      }
      return
    }

    if (this.state === 'return') {
      // slow, graceful descent back into the zone (≈3 s ease-out)
      this.returnT = Math.min(1, this.returnT + dt * 0.35)
      const t = this.returnT
      const ease = 1 - (1 - t) * (1 - t) // ease-out quad
      this.x = this.returnFromX + (this.returnToX - this.returnFromX) * ease
      this.y = this.returnFromY + (this.returnToY - this.returnFromY) * ease
      this.el.style.left = `${Math.round(this.x)}px`
      this.el.style.top = `${Math.round(this.y)}px`
      if (this.returnT >= 1) {
        this.y = this.returnToY
        this.el.style.top = `${Math.round(this.y)}px`
        this.setState('idle')
        this.nextWalkAt = now + rand(400, 1200)
      }
      return
    }

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
      if (now < this.playUntil) {
        // playing where the human dropped it: stay put, hop playfully
        if (this.nextPlayHopAt < now) {
          this.nextPlayHopAt = now + rand(1500, 3500)
          this.hop()
        }
        return
      }
      if (this.y > this.zone().bottom + 2) {
        // still above the bottom after playing: float back down slowly
        this.beginReturn()
        return
      }
      if (this.nextWalkAt < now) {
        // bottom-walking: keep the current direction (turns only at edges)
        this.setState('walk')
        this.walkUntil = now + rand(2500, 6000)
        this.sprite.innerHTML = this.spec.frames.walkA
        this.walkFrame = 0
      }
    } else {
      // walk along the bottom edge, turning only at the edges
      const zone = this.zone()
      this.x += this.direction * this.spec.speed * dt
      if (this.x <= zone.left) {
        this.x = zone.left
        this.direction = 1
        this.flip.dataset.petFlip = '-1'
      } else if (this.x >= zone.right) {
        this.x = zone.right
        this.direction = -1
        this.flip.dataset.petFlip = '1'
      }
      this.y = zone.bottom
      this.el.style.left = `${Math.round(this.x)}px`
      this.el.style.top = `${Math.round(this.y)}px`
      if (now >= this.nextWalkFlip) {
        this.nextWalkFlip = now + WALK_FRAME_MS
        this.walkFrame = this.walkFrame === 0 ? 1 : 0
        this.sprite.innerHTML = this.walkFrame === 0 ? this.spec.frames.walkA : this.spec.frames.walkB
      }
      if (this.walkUntil < now) {
        this.setState('idle')
        this.sprite.innerHTML = this.spec.frames.idle
        this.nextWalkAt = now + rand(800, 2500)
      }
    }
  }

  /** Pop a floating heart above the cat (petting feedback). */
  private popHeart(): void {
    const heart = document.createElement('span')
    heart.className = cls('pixelPetHeart')
    heart.textContent = '♥'
    heart.setAttribute('aria-hidden', 'true')
    this.el.append(heart)
    setTimeout(() => heart.remove(), 1000)
  }

  /** Pop a tiny speech bubble (drag feedback). */
  private popBubble(text: string): void {
    const bubble = document.createElement('span')
    bubble.className = cls('pixelPetBubble')
    bubble.textContent = text
    bubble.setAttribute('aria-hidden', 'true')
    this.el.append(bubble)
    setTimeout(() => bubble.remove(), 900)
  }

  private readonly onHover = (): void => {
    this.el.dataset.petHover = '1'
  }

  private readonly onLeave = (): void => {
    delete this.el.dataset.petHover
  }

  private readonly onClick = (): void => {
    // a real click (no dragging) still makes the cat hop — unless it hangs
    if (this.movedDist > DRAG_THRESHOLD || this.state === 'hang') return
    this.hop()
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.el.removeEventListener('pointerenter', this.onHover)
    this.el.removeEventListener('pointerleave', this.onLeave)
    this.el.removeEventListener('pointerdown', this.onPointerDown)
    this.el.removeEventListener('click', this.onClick)
    this.el.remove()
  }
}

/** Where the cat troop (count + per-slot types) is remembered. */
const CATS_STORAGE_KEY = 'dskin-cats'

interface CatState {
  count: number
  types: KittenId[]
}

function loadCatState(): CatState | null {
  try {
    const raw = localStorage.getItem(CATS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CatState>
    const count = typeof parsed.count === 'number' ? Math.max(1, Math.min(4, Math.round(parsed.count))) : 1
    const types = Array.isArray(parsed.types)
      ? parsed.types.slice(0, 4).map((t) => kittenById(String(t)).id)
      : []
    return { count, types }
  } catch {
    return null
  }
}

function saveCatState(state: CatState): void {
  try {
    localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable — the choice simply does not persist
  }
}

/** Owns the kitten troop: spawn, remove, select, per-cat type switching. */
class CatManager {
  readonly cats: PixelPet[] = []
  /** Fired after selection / breed / count changes (drives UI refresh). */
  onStateChange: (() => void) | null = null
  private selected: PixelPet | null = null
  private types: KittenId[] = []
  private selectTimer = 0
  private interactRaf = 0
  private lastInteractCheck = 0

  constructor(initial: CatState) {
    for (let i = 0; i < initial.count; i++) {
      this.spawn(i, initial.types[i] ?? kittenById(loadKittenId()).id)
    }
  }

  private spawn(slot: number, type: KittenId): PixelPet {
    const viewW = window.innerWidth ?? document.documentElement.clientWidth
    const margin = 60
    const spacing = Math.max(0, (viewW - margin * 2) / Math.max(this.cats.length + 1, 1))
    const startX = Math.min(margin + spacing * slot + rand(0, spacing * 0.6), viewW - 60)
    const cat = new PixelPet({
      frames: kittenById(type).frames,
      kind: 'kitten',
      speed: rand(22, 30),
      bottom: 4,
      startX,
    })
    this.cats.push(cat)
    this.types.push(type)
    cat.attach()
    return cat
  }

  start(): void {
    if (this.cats.length > 0) this.select(this.cats[0])
    this.interactRaf = requestAnimationFrame(this.checkInteractions)
  }

  /** Select a cat: it becomes the target of the type switcher. The star
   *  marker auto-clears after SELECT_MS; clicking again re-selects. */
  select(cat: PixelPet): void {
    this.selected?.setSelected(false)
    this.selected = cat
    cat.setSelected(true)
    cat.hop()
    window.clearTimeout(this.selectTimer)
    this.selectTimer = window.setTimeout(() => this.clearSelection(), SELECT_MS)
    this.onStateChange?.()
  }

  /** Drop the current selection (star disappears). */
  clearSelection(): void {
    window.clearTimeout(this.selectTimer)
    this.selected?.setSelected(false)
    this.selected = null
    this.onStateChange?.()
  }

  getSelected(): PixelPet | null {
    return this.selected
  }

  /** The breed of the selected cat (null when nothing is selected). */
  selectedType(): KittenId | null {
    const cat = this.selected
    if (!cat) return null
    return this.types[this.cats.indexOf(cat)] ?? null
  }

  /** Change the selected cat's breed. */
  setType(type: KittenId): void {
    const cat = this.selected
    if (!cat) return
    const idx = this.cats.indexOf(cat)
    this.types[idx] = type
    cat.setFrames(kittenById(type).frames)
    this.persist()
    this.onStateChange?.()
  }

  /** Change how many cats live in the troop (1–4). */
  setCount(count: number): void {
    count = Math.max(CAT_COUNT_MIN, Math.min(CAT_COUNT_MAX, count))
    while (this.cats.length < count) {
      this.spawn(this.cats.length, KITTENS[Math.floor(rand(0, KITTENS.length))].id)
    }
    while (this.cats.length > count) {
      const cat = this.cats.pop()
      this.types.pop()
      if (cat) cat.dispose()
    }
    if (this.selected === null || !this.cats.includes(this.selected)) {
      if (this.cats.length > 0) this.select(this.cats[0])
    } else {
      this.selected.setSelected(true)
    }
    this.persist()
    this.onStateChange?.()
  }

  getCount(): number {
    return this.cats.length
  }

  private persist(): void {
    saveCatState({ count: this.cats.length, types: this.types })
  }

  private readonly checkInteractions = (now: number): void => {
    this.interactRaf = requestAnimationFrame(this.checkInteractions)
    if (now - this.lastInteractCheck < 100) return
    this.lastInteractCheck = now

    for (let i = 0; i < this.cats.length; i++) {
      for (let j = i + 1; j < this.cats.length; j++) {
        const a = this.cats[i]
        const b = this.cats[j]
        if (a.isBusy(now) || a.isDragging() || b.isBusy(now) || b.isDragging()) continue
        const dist = Math.abs(a.centerX() - b.centerX())
        if (dist < INTERACT_DIST) {
          const awayA: 1 | -1 = a.centerX() < b.centerX() ? -1 : 1
          const awayB: 1 | -1 = -awayA as 1 | -1
          a.startInteraction(now, awayA)
          b.startInteraction(now, awayB)
        }
      }
    }
  }

  dispose(): void {
    window.clearTimeout(this.selectTimer)
    cancelAnimationFrame(this.interactRaf)
    for (const cat of this.cats) cat.dispose()
  }
}

/** Pixel paw button + cat panel: pick count, pick each cat's breed, updates. */
class CatPanel {
  private readonly el: HTMLDivElement
  private readonly palette: HTMLDivElement
  private readonly countLabel: HTMLSpanElement
  private readonly versionLabel: HTMLSpanElement
  private readonly updateRow: HTMLDivElement
  private readonly breedItems: HTMLButtonElement[] = []
  private open = false
  private readonly onDocClick: (e: MouseEvent) => void

  constructor(
    private readonly manager: CatManager,
    private readonly updater: UpdateChecker,
  ) {
    this.el = document.createElement('div')
    this.el.className = cls('pixelPaw')
    this.el.innerHTML = `<span>🐾</span>`
    this.el.title = '猫咪面板'
    this.el.addEventListener('click', this.toggle)

    this.palette = document.createElement('div')
    this.palette.className = cls('pixelPalette')
    this.palette.hidden = true

    // count stepper row
    const countRow = document.createElement('div')
    countRow.className = cls('pixelCountRow')
    const minus = document.createElement('button')
    minus.type = 'button'
    minus.className = cls('pixelCountBtn')
    minus.textContent = '−'
    minus.addEventListener('click', (e) => { e.stopPropagation(); this.stepCount(-1) })
    this.countLabel = document.createElement('span')
    this.countLabel.className = cls('pixelCountLabel')
    const plus = document.createElement('button')
    plus.type = 'button'
    plus.className = cls('pixelCountBtn')
    plus.textContent = '+'
    plus.addEventListener('click', (e) => { e.stopPropagation(); this.stepCount(1) })
    const hint = document.createElement('span')
    hint.className = cls('pixelHint')
    hint.textContent = '点一只小猫再选品种'
    countRow.append(minus, this.countLabel, plus)
    this.palette.append(countRow)

    // breed row
    const breedRow = document.createElement('div')
    breedRow.className = cls('pixelBreedRow')
    for (const k of KITTENS) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = cls('pixelPaletteItem')
      item.dataset.catType = k.id
      item.innerHTML = `<span class="${cls('pixelPaletteFace')}">${k.face}</span><span class="${cls('pixelPaletteName')}">${k.name}</span>`
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        this.pickType(k)
      })
      this.breedItems.push(item)
      breedRow.append(item)
    }
    this.palette.append(breedRow, hint)

    // version + update rows (built once, filled by render())
    const versionRow = document.createElement('div')
    versionRow.className = cls('pixelVersionRow')
    this.versionLabel = document.createElement('span')
    versionRow.append(this.versionLabel)
    this.updateRow = document.createElement('div')
    this.updateRow.className = cls('pixelUpdateRow')
    this.updateRow.hidden = true
    const updateBtn = document.createElement('button')
    updateBtn.type = 'button'
    updateBtn.className = cls('pixelUpdateBtn')
    updateBtn.textContent = '✨ 查看新版本并升级'
    updateBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      window.open('https://github.com/dancingmemory/dskin/releases/latest', '_blank', 'noopener')
    })
    const updateHint = document.createElement('span')
    updateHint.className = cls('pixelHint')
    updateHint.textContent = '打开后复制安装命令，重启 dsh web 即生效'
    this.updateRow.append(updateBtn, updateHint)
    this.palette.append(versionRow, this.updateRow)

    this.onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      // clicking a kitten selects it (and keeps the panel open)
      const cat = this.manager.cats.find((c) => c.contains(target))
      if (cat) {
        this.manager.select(cat)
        return
      }
      if (!this.el.contains(target) && !this.palette.contains(target)) this.close()
    }
  }

  attach(): void {
    document.body.append(this.el, this.palette)
    document.addEventListener('click', this.onDocClick)
    this.render()
  }

  private render(): void {
    this.countLabel.textContent = String(this.manager.getCount())
    // highlight the breed button matching the selected cat (none when idle)
    const selType = this.manager.selectedType()
    for (const item of this.breedItems) {
      item.dataset.active = selType !== null && item.dataset.catType === selType ? '1' : '0'
    }
    const checker = this.updater
    if (checker.hasUpdate) {
      this.versionLabel.textContent = `当前 v${DSKIN_VERSION} · 发现新版本 v${checker.latest}`
      this.el.dataset.petUpdate = '1'
      this.updateRow.hidden = false
    } else if (checker.latest) {
      this.versionLabel.textContent = `当前 v${DSKIN_VERSION} · 已是最新 (v${checker.latest})`
      delete this.el.dataset.petUpdate
      this.updateRow.hidden = true
    } else {
      this.versionLabel.textContent = `当前 v${DSKIN_VERSION}`
      delete this.el.dataset.petUpdate
      this.updateRow.hidden = true
    }
  }

  private readonly toggle = (): void => {
    if (this.open) this.close()
    else {
      // refresh the update status whenever the panel opens
      void this.updater.check(true)
      this.openPalette()
    }
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

  private stepCount(delta: number): void {
    this.manager.setCount(this.manager.getCount() + delta)
    this.render()
  }

  private pickType(k: (typeof KITTENS)[number]): void {
    this.manager.setType(k.id)
    // keep the panel open so several cats can be styled in one go
  }

  dispose(): void {
    document.removeEventListener('click', this.onDocClick)
    this.el.remove()
    this.palette.remove()
  }
}

/**
 * Apply the DSKIN skin: body attribute, the kitten troop (1–4, breeds chosen
 * per cat), the paw panel, favicon, title. All writes are retracted by the
 * effect disposer on dispose.
 */
export function apply(ctx: Context): void {
  const body = document.body
  body.dataset.dshDskin = ''

  // Restore the troop (count + per-slot breeds) or roll a random one.
  const stored = loadCatState()
  const count = stored?.count ?? Math.floor(rand(CAT_COUNT_MIN, CAT_COUNT_MAX + 1))
  const types: KittenId[] = []
  if (stored) {
    const favorite = kittenById(loadKittenId()).id
    for (let i = 0; i < count; i++) types.push(stored.types[i] ?? favorite)
  } else {
    const favorite = kittenById(loadKittenId()).id
    for (let i = 0; i < count; i++) {
      types.push(i === 0 ? favorite : KITTENS[Math.floor(rand(0, KITTENS.length))].id)
    }
    saveCatState({ count, types })
  }

  const manager = new CatManager({ count, types })
  manager.start()

  // built-in updater: first check after boot, then periodically
  const updater = new UpdateChecker()
  const panel = new CatPanel(manager, updater)

  // keep the panel in sync with selection / breed / count changes
  manager.onStateChange = () => panel.render()
  updater.onChange = () => panel.render()
  const initialCheck = window.setTimeout(() => void updater.check(), 10000)
  const intervalCheck = window.setInterval(() => void updater.check(), UPDATE_CHECK_INTERVAL)
  panel.attach()

  ctx.effect(() => () => {
    delete body.dataset.dshDskin
    window.clearTimeout(initialCheck)
    window.clearInterval(intervalCheck)
    manager.dispose()
    panel.dispose()
  }, 'ui-skin-dskin: kittens + panel')
}
