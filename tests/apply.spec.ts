// @vitest-environment jsdom
/**
 * apply() owns the whole pixel surface and retracts it on fiber dispose: the
 * body attribute the stylesheet is scoped on, the pet troop, the kitten
 * switcher, the injected favicon, and the document title. Also covers the
 * kitten-switch interaction. Assert the writes and the teardown both ways —
 * including that a session title projected over the skin title is never
 * clobbered by skin teardown.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { DSKIN_THOUGHT_MAX_MS, DSKIN_THOUGHT_MIN_MS, apply, compareVersions, setThoughtDelay } from '../src/client/index.ts'
import { isSoundEnabled, setSoundEnabled } from '../src/client/sound.ts'
import { QUOTES } from '../src/client/quotes.ts'

let fiber: Fiber | undefined

async function mount(): Promise<Fiber> {
  const f = new Context().plugin({ apply })
  await f.await()
  return f
}

afterEach(async () => {
  await fiber?.dispose()
  fiber = undefined
  document.body.innerHTML = ''
  document.head.querySelectorAll('link[rel="icon"]').forEach((link) => { link.remove() })
  delete document.body.dataset.dshDskin
  document.title = ''
  localStorage.clear()
})

const PET_SELECTOR = '[class*="pixelPetKitten"]'

describe('DSKIN updater', () => {
  it('compares dotted versions', () => {
    expect(compareVersions('1.0.5', '1.0.5')).toBe(0)
    expect(compareVersions('1.0.5', '1.0.6')).toBe(-1)
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1)
    expect(compareVersions('v1.0.5', '1.0.4')).toBe(1)
    expect(compareVersions('1.1.0', '1.0.99')).toBe(1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
  })
})

describe('DSKIN wisdom pool', () => {
  it('has at least 1000 unique quotes', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(1000)
    expect(new Set(QUOTES).size).toBe(QUOTES.length)
    // every quote is short enough to fit a bubble
    for (const q of QUOTES) {
      expect(q.length).toBeLessThanOrEqual(40)
      expect(q.length).toBeGreaterThan(0)
    }
  })

  it('kittens occasionally share a thought (~1 min average)', async () => {
    setThoughtDelay(10, 30)
    fiber = await mount()
    try {
      // no thought yet
      expect(document.querySelector('[class*="pixelPetQuote"]')).toBeNull()
      // wait past the (test-shortened) interval → a thought appears
      await new Promise((r) => setTimeout(r, 200))
      const quote = document.querySelector('[class*="pixelPetQuote"]')
      expect(quote).not.toBeNull()
      expect((quote as HTMLElement).textContent?.length).toBeGreaterThan(0)
      expect(document.querySelector('[class*="pixelPet"][data-pet-thinking="1"]')).not.toBeNull()
    } finally {
      await fiber.dispose()
      fiber = undefined
      setThoughtDelay(DSKIN_THOUGHT_MIN_MS, DSKIN_THOUGHT_MAX_MS)
    }
  }, 15000)

  it('posed cats (climbing) do not share thoughts', async () => {
    setThoughtDelay(10, 30)
    fiber = await mount()
    try {
      const pet = document.body.querySelector(PET_SELECTOR) as HTMLElement
      // force a wall-climb via the drag path
      pet.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 874 }))
      pet.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 104, clientY: 1600 }))
      pet.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
      expect(pet.dataset.petState).toBe('climb')
      // a short thought interval is long past → but climbing cats must stay quiet
      await new Promise((r) => setTimeout(r, 300))
      const thinking = document.body.querySelector('[class*="pixelPet"][data-pet-thinking="1"]')
      // the climbing cat itself never shows a quote (another idle cat might)
      expect(pet.dataset.petThinking).toBeUndefined()
      // and a bubble never sits on the wall-climber
      const quoteOnClimber = pet.querySelector('[class*="pixelPetQuote"]')
      expect(quoteOnClimber).toBeNull()
      void thinking
    } finally {
      await fiber.dispose()
      fiber = undefined
      setThoughtDelay(DSKIN_THOUGHT_MIN_MS, DSKIN_THOUGHT_MAX_MS)
    }
  }, 15000)

  it('thought interval averages ~1 minute', () => {
    const avg = (DSKIN_THOUGHT_MIN_MS + DSKIN_THOUGHT_MAX_MS) / 2
    expect(avg).toBeGreaterThan(50 * 1000)
    expect(avg).toBeLessThan(70 * 1000)
  })
})

describe('DSKIN sound', () => {
  it('meow toggle persists its mute state', () => {
    setSoundEnabled(false)
    expect(isSoundEnabled()).toBe(false)
    expect(localStorage.getItem('dskin-sound')).toBe('0')
    setSoundEnabled(true)
    expect(isSoundEnabled()).toBe(true)
    expect(localStorage.getItem('dskin-sound')).toBe('1')
  })

  it('mutes through the paw panel button', async () => {
    fiber = await mount()
    const paw = document.body.querySelector('[class*="pixelPaw"]')
    paw?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const palette = document.body.querySelector('[class*="pixelPalette"]')
    const btn = palette?.querySelector('[class*="pixelActionBtn"][data-muted]') as HTMLElement | null
    expect(btn).not.toBeNull()
    const wasOn = btn?.dataset.muted === '0'
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(btn?.dataset.muted).toBe(wasOn ? '1' : '0')
    await fiber.dispose()
    fiber = undefined
  })
})

describe('DSKIN skin apply', () => {
  it('mounts the pixel surface: attribute, pet troop, switcher', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()

    expect(document.body.dataset.dshDskin).toBe('')
    const pets = document.body.querySelectorAll(PET_SELECTOR)
    expect(pets.length).toBeGreaterThanOrEqual(1) // 1–4 random kittens
    expect(document.body.querySelector('[class*="pixelPetWhale"]')).toBeNull()
    expect(document.body.querySelector('[class*="pixelPetMouse"]')).toBeNull()
    expect(document.body.querySelector('[class*="pixelPetKitten"]')).not.toBeNull()
    for (const pet of pets) {
      expect(pet.querySelector('svg')).not.toBeNull()
    }
    expect(document.body.querySelector('[class*="pixelPaw"]')).not.toBeNull()
    expect(document.body.querySelector('[class*="pixelPalette"]')).not.toBeNull()
    expect(document.title).toBe('DeepSeek Harness') // the app's own title is untouched
  })

  it('switches the kitten through the paw palette', async () => {
    fiber = await mount()
    const paw = document.body.querySelector('[class*="pixelPaw"]')
    const palette = document.body.querySelector('[class*="pixelPalette"]')
    expect(palette).not.toBeNull()
    const kitten = document.body.querySelector('[class*="pixelPetKitten"]')
    expect(kitten).not.toBeNull()

    // palette starts closed
    expect((palette as HTMLElement).hidden).toBe(true)
    paw?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect((palette as HTMLElement).hidden).toBe(false)

    // 4 breed items + count stepper (2 buttons) + hint
    const items = palette?.querySelectorAll('[class*="pixelPaletteItem"]') ?? []
    expect(items.length).toBe(4)
    expect(palette?.querySelectorAll('[class*="pixelCountBtn"]').length).toBe(2)

    const before = kitten?.querySelector('svg')?.outerHTML
    items[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const after = kitten?.querySelector('svg')?.outerHTML
    expect(after).not.toBe(before)
    expect(localStorage.getItem('dskin-cats')).toBeTruthy()
  })

  it('count stepper adds and removes kittens', async () => {
    fiber = await mount()
    const paw = document.body.querySelector('[class*="pixelPaw"]')
    const palette = document.body.querySelector('[class*="pixelPalette"]')
    paw?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const plus = palette?.querySelectorAll('[class*="pixelCountBtn"]')[1]
    const minus = palette?.querySelectorAll('[class*="pixelCountBtn"]')[0]
    // click plus up to 3 times: count caps at 4
    plus?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    plus?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    plus?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.querySelectorAll(PET_SELECTOR).length).toBe(4)
    // one minus brings it down
    minus?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.querySelectorAll(PET_SELECTOR).length).toBe(3)
    await fiber.dispose()
    fiber = undefined
  })

  it('randomize re-dresses every kitten and keeps the count', async () => {
    fiber = await mount()
    const before = [...document.body.querySelectorAll(PET_SELECTOR)].map((p) => p.querySelector('svg')?.outerHTML)
    const paw = document.body.querySelector('[class*="pixelPaw"]')
    paw?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const palette = document.body.querySelector('[class*="pixelPalette"]')
    const dice = [...(palette?.querySelectorAll('[class*="pixelActionBtn"]') ?? [])].find((b) => b.textContent?.includes('🎲'))
    expect(dice).toBeTruthy()
    ;(dice as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const after = [...document.body.querySelectorAll(PET_SELECTOR)].map((p) => p.querySelector('svg')?.outerHTML)
    expect(after.length).toBe(before.length)
    expect(after.some((svg, i) => svg !== before[i])).toBe(true)
    await fiber.dispose()
    fiber = undefined
  })

  it('pets react to click without breaking', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()
    const pet = document.body.querySelector(PET_SELECTOR)
    expect(pet).not.toBeNull()
    pet?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.querySelectorAll(PET_SELECTOR).length).toBeGreaterThanOrEqual(1)
    await fiber.dispose()
    fiber = undefined
    expect(document.body.querySelector('[class*="pixelPet"]')).toBeNull()
  })

  it('kittens can be dragged and land back in their zone', async () => {
    fiber = await mount()
    const pet = document.body.querySelector(PET_SELECTOR) as HTMLElement
    expect(pet).not.toBeNull()

    const before = pet.style.left
    pet.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 500 }))
    pet.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 420, clientY: 260 }))
    pet.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    // released: not in drag state anymore, and the cat moved with the pointer
    expect(pet.dataset.petState).not.toBe('drag')
    const after = pet.style.left
    expect(after).not.toBe(before)
    await fiber.dispose()
    fiber = undefined
  })

  it('selected cat shows the star marker and breed highlight follows it', async () => {
    fiber = await mount()
    const kittens = document.body.querySelectorAll(PET_SELECTOR)
    expect(kittens.length).toBeGreaterThanOrEqual(1)
    // first cat is selected by default → its marker is visible
    const marker = kittens[0]?.querySelector('[class*="pixelPetSelected"]') as HTMLElement | null
    expect(marker).not.toBeNull()
    expect(marker?.hidden).toBe(false)
    // select the last cat → markers move
    if (kittens.length > 1) {
      kittens[kittens.length - 1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect((kittens[kittens.length - 1]?.querySelector('[class*="pixelPetSelected"]') as HTMLElement | null)?.hidden).toBe(false)
      expect((kittens[0]?.querySelector('[class*="pixelPetSelected"]') as HTMLElement | null)?.hidden).toBe(true)
    }
    // open the panel → one breed button is highlighted (data-active=1)
    const paw = document.body.querySelector('[class*="pixelPaw"]')
    paw?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const palette = document.body.querySelector('[class*="pixelPalette"]')
    const active = palette?.querySelectorAll('[class*="pixelPaletteItem"][data-active="1"]') ?? []
    expect(active.length).toBe(1)
    await fiber.dispose()
    fiber = undefined
  })

  it('selection star auto-clears after 10s and re-selects on click', async () => {
    vi.useFakeTimers()
    try {
      fiber = await mount()
      const kittens = document.body.querySelectorAll(PET_SELECTOR)
      const first = kittens[0] as HTMLElement
      const marker = () => first.querySelector('[class*="pixelPetSelected"]') as HTMLElement
      // selected on mount → star visible
      expect(marker().hidden).toBe(false)
      // after 10s the star disappears
      vi.advanceTimersByTime(10000)
      expect(marker().hidden).toBe(true)
      // clicking again re-selects → star back
      first.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(marker().hidden).toBe(false)
    } finally {
      vi.useRealTimers()
    }
    await fiber?.dispose()
    fiber = undefined
  })

  it('releasing a dragged-down hanging cat drops it (no stuck cats)', async () => {
    fiber = await mount()
    const pet = document.body.querySelector(PET_SELECTOR) as HTMLElement
    // drag to the top → latch & hang
    pet.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 10 }))
    pet.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 100, clientY: 5 }))
    expect(pet.dataset.petState).toBe('hang')
    expect(pet.dataset.petHang).toBe('1')
    // drag down beyond the stick window, then release → it drops, not stuck
    pet.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 100, clientY: 40 }))
    pet.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(pet.dataset.petState).not.toBe('hang')
    // pose-only attributes are cleaned up when the pose ends
    expect(pet.dataset.petHang).toBeUndefined()
    await fiber.dispose()
    fiber = undefined
  })

  it('dropping a cat against a side edge starts wall-climbing', async () => {
    fiber = await mount()
    const pet = document.body.querySelector(PET_SELECTOR) as HTMLElement
    // jsdom rects are all-zero, so grab offsets are clientX/clientY themselves:
    // grab at (100, 874), move to land nextX=4 (left edge) and nextY=726 (in-zone)
    pet.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 874 }))
    pet.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 104, clientY: 1600 }))
    pet.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(pet.dataset.petState).toBe('climb')
    expect(pet.dataset.petClimb).toBe('-1')
    await fiber.dispose()
    fiber = undefined
  })

  it('retracts everything on fiber dispose', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()
    await fiber.dispose()
    fiber = undefined

    expect(document.body.dataset.dshDskin).toBeUndefined()
    expect(document.body.querySelector('[class*="pixelPet"]')).toBeNull()
    expect(document.body.querySelector('[class*="pixelPaw"]')).toBeNull()
    expect(document.body.querySelector('[class*="pixelPalette"]')).toBeNull()
    expect(document.title).toBe('DeepSeek Harness')
  })

  it('never touches the app title', async () => {
    document.title = '我的 DeepSeek 会话'
    fiber = await mount()
    expect(document.title).toBe('我的 DeepSeek 会话')
    await fiber.dispose()
    fiber = undefined
    expect(document.title).toBe('我的 DeepSeek 会话')
  })
})
