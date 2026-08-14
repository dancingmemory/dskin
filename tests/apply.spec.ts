// @vitest-environment jsdom
/**
 * apply() owns the whole pixel surface and retracts it on fiber dispose: the
 * body attribute the stylesheet is scoped on, the pet troop, the kitten
 * switcher, the injected favicon, and the document title. Also covers the
 * kitten-switch interaction. Assert the writes and the teardown both ways —
 * including that a session title projected over the skin title is never
 * clobbered by skin teardown.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.ts'

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

describe('DSKIN skin apply', () => {
  it('mounts the pixel surface: attribute, pet troop, switcher, favicon, title', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()

    expect(document.body.dataset.dshDskin).toBe('')
    const pets = document.body.querySelectorAll(PET_SELECTOR)
    expect(pets.length).toBe(1) // only the switchable kitten lives in the troop
    expect(document.body.querySelector('[class*="pixelPetWhale"]')).toBeNull()
    expect(document.body.querySelector('[class*="pixelPetMouse"]')).toBeNull()
    expect(document.body.querySelector('[class*="pixelPetKitten"]')).not.toBeNull()
    for (const pet of pets) {
      expect(pet.querySelector('svg')).not.toBeNull()
    }
    expect(document.body.querySelector('[class*="pixelPaw"]')).not.toBeNull()
    expect(document.body.querySelector('[class*="pixelPalette"]')).not.toBeNull()
    expect(document.title).toBe('DSKIN · DeepSeek Harness')
    expect(document.head.querySelector('link[rel="icon"]')).not.toBeNull()
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

    const before = kitten?.querySelector('svg')?.outerHTML
    const items = palette?.querySelectorAll('button') ?? []
    expect(items.length).toBe(4)
    items[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // palette closes and the kitten sprite swapped
    expect((palette as HTMLElement).hidden).toBe(true)
    const after = kitten?.querySelector('svg')?.outerHTML
    expect(after).not.toBe(before)
    expect(localStorage.getItem('dskin-kitten')).toBeTruthy()
  })

  it('pets react to click without breaking', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()
    const pet = document.body.querySelector(PET_SELECTOR)
    expect(pet).not.toBeNull()
    pet?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.querySelectorAll(PET_SELECTOR).length).toBe(1)
    await fiber.dispose()
    fiber = undefined
    expect(document.body.querySelector('[class*="pixelPet"]')).toBeNull()
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
    expect(document.head.querySelector('link[rel="icon"]')).toBeNull()
    expect(document.title).toBe('DeepSeek Harness')
  })

  it('never clobbers a session title projected over the skin title on teardown', async () => {
    fiber = await mount()
    document.title = '我的会话 — DSKIN · DeepSeek Harness'
    await fiber.dispose()
    fiber = undefined

    expect(document.title).toBe('我的会话 — DSKIN · DeepSeek Harness')
  })
})
