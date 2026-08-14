// @vitest-environment jsdom
/**
 * apply() owns the whole pixel surface and retracts it on fiber dispose: the
 * body attribute the stylesheet is scoped on, the pet node, the injected
 * favicon, and the document title. Assert the writes and the teardown both
 * ways — including that a session title projected over the skin title is
 * never clobbered by skin teardown.
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
})

describe('DSKIN skin apply', () => {
  it('mounts the pixel surface: attribute, pet, favicon, title', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()

    expect(document.body.dataset.dshDskin).toBe('')
    const pet = document.body.querySelector('[class*="pixelPet"]')
    expect(pet).not.toBeNull()
    expect(pet?.querySelector('svg')).not.toBeNull()
    expect(document.title).toBe('DSKIN · DeepSeek Harness')
    expect(document.head.querySelector('link[rel="icon"]')).not.toBeNull()
  })

  it('pet reacts to click without breaking', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()
    const pet = document.body.querySelector('[class*="pixelPet"]')
    expect(pet).not.toBeNull()
    pet?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.querySelector('[class*="pixelPet"]')).not.toBeNull()
    // dispose cancels the rAF loop and drops the node
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
