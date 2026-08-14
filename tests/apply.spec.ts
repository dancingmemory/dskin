// @vitest-environment jsdom
/**
 * apply() owns the whole pixel surface and retracts it on fiber dispose: the
 * body attribute the stylesheet is scoped on, the chrome bars, the injected
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
  it('mounts the pixel surface: attribute, chrome bars, title, favicon', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()

    expect(document.body.dataset.dshDskin).toBe('')
    const titlebar = document.body.querySelector('[class*="dskinTitlebar"]')
    const statusbar = document.body.querySelector('[class*="dskinStatusbar"]')
    expect(titlebar).not.toBeNull()
    expect(statusbar).not.toBeNull()
    expect(titlebar?.textContent).toContain('DSKIN · DeepSeek Harness')
    expect(statusbar?.textContent).toContain('DSKIN')
    expect(statusbar?.textContent).toContain('PLAYER 1')
    expect(statusbar?.textContent).toContain('♥')
    expect(statusbar?.querySelector('svg')).not.toBeNull()
    expect(document.title).toBe('DSKIN · DeepSeek Harness')
    expect(document.head.querySelector('link[rel="icon"]')).not.toBeNull()
  })

  it('retracts everything on fiber dispose', async () => {
    document.title = 'DeepSeek Harness'
    fiber = await mount()
    await fiber.dispose()
    fiber = undefined

    expect(document.body.dataset.dshDskin).toBeUndefined()
    expect(document.body.querySelector('[class*="dskinTitlebar"]')).toBeNull()
    expect(document.body.querySelector('[class*="dskinStatusbar"]')).toBeNull()
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
