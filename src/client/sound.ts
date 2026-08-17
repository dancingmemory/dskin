/**
 * Pixel meow engine: tiny synthesized cat sounds via Web Audio — no audio
 * files, no network, nothing injected into the page. A lazy AudioContext is
 * created on the first real playback attempt (browsers only allow sound
 * after a user gesture, so playback always happens inside one). Muting is
 * persisted in localStorage under `dskin-sound` ('1' = on, default).
 *
 * jsdom (tests) has no AudioContext, so every call degrades to a no-op.
 */

const SOUND_KEY = 'dskin-sound'

let soundOn = true

try {
  soundOn = localStorage.getItem(SOUND_KEY) !== '0'
} catch {
  // storage unavailable — sound stays on
}

/** Whether synthesized meows are currently audible. */
export function isSoundEnabled(): boolean {
  return soundOn
}

/** Turn meows on/off. Persisted across sessions. */
export function setSoundEnabled(on: boolean): void {
  soundOn = on
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    // storage unavailable — the choice simply does not persist
  }
}

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (!soundOn) return null
  const AC = typeof window !== 'undefined'
    ? (window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined
  if (!AC) return null
  if (!audioCtx) {
    try {
      audioCtx = new AC()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

interface MeowShape {
  /** Start frequency (Hz). */
  readonly from: number
  /** Bend target (Hz) at the end of the dip. */
  readonly to: number
  /** Total duration (s). */
  readonly dur: number
  /** Peak gain (0–1, scaled by the master volume). */
  readonly gain: number
  /** Extra pitch wobble depth (Hz). */
  readonly wobble?: number
}

/**
 * Play one synthesized meow: a triangle wave with a quick up-chirp into a
 * downward glide (the classic "miaow" pitch bend), plus a soft sine sub.
 */
function meow(shape: MeowShape): void {
  const ctx = getCtx()
  if (!ctx) return

  const t0 = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.14
  master.connect(ctx.destination)

  const voice = ctx.createOscillator()
  voice.type = 'triangle'
  voice.frequency.setValueAtTime(shape.from, t0)
  // the dip: glide down to `to`, then back up — two legs of the bend
  const dip = t0 + shape.dur * 0.35
  voice.frequency.exponentialRampToValueAtTime(Math.max(60, shape.to), dip)
  voice.frequency.exponentialRampToValueAtTime(shape.from * 0.85, t0 + shape.dur)

  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(shape.from * 0.5, t0)
  sub.frequency.exponentialRampToValueAtTime(Math.max(40, shape.to * 0.5), dip)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, t0)
  envelope.gain.exponentialRampToValueAtTime(shape.gain, t0 + 0.03)
  envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + shape.dur)

  const wobble: OscillatorNode | null = shape.wobble
    ? (() => {
        const lfo = ctx.createOscillator()
        lfo.frequency.value = 18
        const depth = ctx.createGain()
        depth.gain.value = shape.wobble
        lfo.connect(depth)
        depth.connect(voice.frequency)
        lfo.start(t0)
        return lfo
      })()
    : null

  voice.connect(envelope)
  sub.connect(envelope)
  envelope.connect(master)
  voice.start(t0)
  sub.start(t0)
  voice.stop(t0 + shape.dur + 0.02)
  sub.stop(t0 + shape.dur + 0.02)
  wobble?.stop(t0 + shape.dur + 0.02)
}

/** Playful greeting: click / select. Quick up-chirp, bright. */
export function meowGreet(): void {
  meow({ from: 620, to: 380, dur: 0.24, gain: 0.5, wobble: 12 })
}

/** Mid-drag struggle: higher, wobbly, a little annoyed. */
export function meowDrag(): void {
  meow({ from: 780, to: 520, dur: 0.2, gain: 0.45, wobble: 26 })
}

/** Latched onto the top edge: surprised, slow falling bend. */
export function meowHang(): void {
  meow({ from: 880, to: 300, dur: 0.5, gain: 0.5, wobble: 8 })
}

/** Cats met and are playing: quick double chirp. */
export function meowInteract(): void {
  meow({ from: 700, to: 460, dur: 0.14, gain: 0.4, wobble: 16 })
  window.setTimeout(() => meow({ from: 560, to: 400, dur: 0.16, gain: 0.35, wobble: 14 }), 150)
}

/** Woken from a nap: low, slow, sleepy. */
export function meowWake(): void {
  meow({ from: 400, to: 250, dur: 0.42, gain: 0.4, wobble: 6 })
}

/** Dropped into a wall-climb: determined little grunt. */
export function meowClimb(): void {
  meow({ from: 520, to: 440, dur: 0.18, gain: 0.35, wobble: 10 })
}