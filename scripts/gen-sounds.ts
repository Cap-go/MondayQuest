// Synthesises the app's small sound palette into public/sounds/*.wav.
// Run with `bun run sounds`. Everything is procedural, no third-party samples.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 44_100
const OUT = fileURLToPath(new URL('../public/sounds', import.meta.url))
mkdirSync(OUT, { recursive: true })

type Buf = Float32Array

function buf(seconds: number): Buf {
  return new Float32Array(Math.floor(seconds * RATE))
}

let seed = 1234567
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0xFFFFFFFF * 2 - 1
}

function env(t: number, attack: number, decay: number) {
  if (t < attack)
    return t / attack
  return Math.exp(-(t - attack) / decay)
}

/** One-pole low/high pass helpers for shaping noise. */
function lowpass(b: Buf, cutoff: number): Buf {
  const rc = 1 / (2 * Math.PI * cutoff)
  const a = (1 / RATE) / (rc + 1 / RATE)
  const out = new Float32Array(b.length)
  let y = 0
  for (let i = 0; i < b.length; i++) {
    y += a * (b[i]! - y)
    out[i] = y
  }
  return out
}

function highpass(b: Buf, cutoff: number): Buf {
  const lp = lowpass(b, cutoff)
  return b.map((v, i) => v - lp[i]!)
}

function mix(target: Buf, src: Buf, at = 0, gain = 1) {
  const off = Math.floor(at * RATE)
  for (let i = 0; i < src.length && off + i < target.length; i++)
    target[off + i]! += src[i]! * gain
}

function normalize(b: Buf, peak = 0.85): Buf {
  let m = 0
  for (const v of b) m = Math.max(m, Math.abs(v))
  return m ? b.map(v => v / m * peak) : b
}

function fadeOut(b: Buf, seconds = 0.02) {
  const n = Math.floor(seconds * RATE)
  for (let i = 0; i < n; i++)
    b[b.length - 1 - i]! *= i / n
  return b
}

function writeWav(name: string, b: Buf) {
  const data = Buffer.alloc(44 + b.length * 2)
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + b.length * 2, 4)
  data.write('WAVE', 8)
  data.write('fmt ', 12)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(RATE, 24)
  data.writeUInt32LE(RATE * 2, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(b.length * 2, 40)
  b.forEach((v, i) => data.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767, 44 + i * 2))
  writeFileSync(join(OUT, `${name}.wav`), data)
  console.log('✓', name, `${(b.length / RATE).toFixed(2)}s`)
}

/** Pen stroke: band-limited noise with a moving resonance. */
function stroke(seconds: number, from: number, to: number): Buf {
  const b = buf(seconds)
  for (let i = 0; i < b.length; i++) b[i] = rand()
  const hp = highpass(b, 1800)
  const out = new Float32Array(hp.length)
  for (let i = 0; i < hp.length; i++) {
    const t = i / RATE
    const p = t / seconds
    const grain = 0.6 + 0.4 * Math.sin(2 * Math.PI * (from + (to - from) * p) * t)
    out[i] = hp[i]! * grain * Math.sin(Math.PI * p) ** 0.6
  }
  return lowpass(out, 7000)
}

function tone(freq: number, seconds: number, decay: number, attack = 0.004, partials: [number, number][] = [[1, 1]]): Buf {
  const b = buf(seconds)
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE
    let v = 0
    for (const [mult, amp] of partials) v += Math.sin(2 * Math.PI * freq * mult * t) * amp
    b[i] = v * env(t, attack, decay)
  }
  return b
}

// ✓ check — two pen strokes: short down, long up
{
  const b = buf(0.36)
  mix(b, stroke(0.08, 90, 140), 0)
  mix(b, stroke(0.2, 120, 60), 0.09, 1.1)
  writeWav('check', fadeOut(normalize(b, 0.7)))
}

// erase — rubber back and forth
{
  const b = buf(0.5)
  for (let k = 0; k < 4; k++) mix(b, lowpass(stroke(0.1, 40, 50), 2500), k * 0.11, 0.9)
  writeWav('erase', fadeOut(normalize(b, 0.55)))
}

// tick — tiny wooden click
{
  const b = buf(0.06)
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE
    b[i] = (Math.sin(2 * Math.PI * 1900 * t) * 0.6 + rand() * 0.4) * Math.exp(-t / 0.006)
  }
  writeWav('tick', fadeOut(normalize(b, 0.5), 0.005))
}

// page — paper swoosh
{
  const b = buf(0.45)
  for (let i = 0; i < b.length; i++) b[i] = rand()
  const shaped = lowpass(highpass(b, 600), 4500)
  for (let i = 0; i < shaped.length; i++) {
    const p = i / shaped.length
    shaped[i]! *= Math.sin(Math.PI * p) ** 2 * (1 + 0.5 * Math.sin(p * 40))
  }
  writeWav('page', fadeOut(normalize(shaped, 0.5)))
}

// bell — singing bowl, inharmonic partials
{
  const b = tone(196, 7, 2.6, 0.01, [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12], [1.003, 0.6]])
  writeWav('bell', fadeOut(normalize(b, 0.8), 0.3))
}

// chime — two soft ascending notes
{
  const b = buf(1.4)
  mix(b, tone(659.25, 1.2, 0.5, 0.005, [[1, 1], [2, 0.2], [3, 0.08]]), 0)
  mix(b, tone(987.77, 1.2, 0.6, 0.005, [[1, 1], [2, 0.2], [3, 0.08]]), 0.12)
  writeWav('chime', fadeOut(normalize(b, 0.6)))
}

// done — stamp thud + bright major arpeggio
{
  const b = buf(2)
  const thud = buf(0.25)
  for (let i = 0; i < thud.length; i++) {
    const t = i / RATE
    thud[i] = (Math.sin(2 * Math.PI * (90 - 40 * t) * t) + rand() * 0.3) * Math.exp(-t / 0.05)
  }
  mix(b, lowpass(thud, 900), 0, 1.4)
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, k) => mix(b, tone(f, 1.4, 0.45, 0.004, [[1, 1], [2, 0.3], [4, 0.05]]), 0.12 + k * 0.07, 0.5))
  writeWav('done', fadeOut(normalize(b, 0.8), 0.2))
}

// pop — bubble
{
  const b = buf(0.12)
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE
    b[i] = Math.sin(2 * Math.PI * (400 + 2400 * t / 0.12) * t) * Math.exp(-t / 0.03)
  }
  writeWav('pop', fadeOut(normalize(b, 0.55)))
}

// water — glug
{
  const b = buf(0.6)
  for (let k = 0; k < 3; k++) {
    const g = buf(0.14)
    for (let i = 0; i < g.length; i++) {
      const t = i / RATE
      g[i] = Math.sin(2 * Math.PI * (260 + k * 60 + 900 * t) * t) * Math.sin(Math.PI * t / 0.14)
    }
    mix(b, g, k * 0.15, 0.8 - k * 0.15)
  }
  writeWav('water', fadeOut(normalize(b, 0.6)))
}

// whoosh — throw something away
{
  const b = buf(0.5)
  for (let i = 0; i < b.length; i++) b[i] = rand()
  const out = new Float32Array(b.length)
  let y = 0
  for (let i = 0; i < b.length; i++) {
    const p = i / b.length
    const cutoff = 300 + 5000 * Math.sin(Math.PI * p)
    const rc = 1 / (2 * Math.PI * cutoff)
    const a = (1 / RATE) / (rc + 1 / RATE)
    y += a * (b[i]! - y)
    out[i] = y * Math.sin(Math.PI * p)
  }
  writeWav('whoosh', fadeOut(normalize(out, 0.6)))
}

// stamp — rubber stamp OUI
{
  const b = buf(0.3)
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE
    b[i] = (Math.sin(2 * Math.PI * 140 * t) * 0.8 + rand() * 0.5) * Math.exp(-t / 0.04)
  }
  writeWav('stamp', fadeOut(normalize(lowpass(b, 2200), 0.8)))
}

// shutter — camera
{
  const b = buf(0.18)
  const click = (at: number) => {
    const c = buf(0.04)
    for (let i = 0; i < c.length; i++) c[i] = rand() * Math.exp(-i / RATE / 0.006)
    mix(b, highpass(c, 2000), at)
  }
  click(0)
  click(0.09)
  writeWav('shutter', fadeOut(normalize(b, 0.6)))
}

// wake — gentle rising alarm loop (used for in-app alarm preview)
{
  const b = buf(4)
  const notes = [523.25, 659.25, 783.99, 1046.5]
  for (let rep = 0; rep < 4; rep++) {
    notes.forEach((f, k) => mix(b, tone(f, 0.5, 0.18, 0.005, [[1, 1], [2, 0.25]]), rep + k * 0.12, 0.3 + rep * 0.15))
  }
  writeWav('wake', fadeOut(normalize(b, 0.9), 0.1))
}

// freeze — icy crackle for cold shower
{
  const b = buf(0.8)
  for (let k = 0; k < 18; k++) {
    const c = buf(0.03)
    for (let i = 0; i < c.length; i++) c[i] = rand() * Math.exp(-i / RATE / 0.004)
    mix(b, highpass(c, 4000), Math.abs(rand()) * 0.75, Math.abs(rand()))
  }
  writeWav('freeze', fadeOut(normalize(b, 0.5)))
}
