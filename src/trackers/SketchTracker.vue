<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, markDone, patch } = useDay(props, { subject: '', drawing: '' })

const canvas = ref<HTMLCanvasElement | null>(null)
const pen = ref<'fine' | 'bold' | 'erase'>('fine')
const strokes = ref(0)
let ctx: CanvasRenderingContext2D
let last: { x: number, y: number, t: number } | null = null
let width = 2.4
const history: ImageData[] = []

onMounted(() => {
  const c = canvas.value!
  const dpr = window.devicePixelRatio || 1
  const r = c.getBoundingClientRect()
  c.width = r.width * dpr
  c.height = r.height * dpr
  ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.scale(dpr, dpr)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#fbfaf7'
  ctx.fillRect(0, 0, r.width, r.height)
  if (data.value.drawing) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height)
    img.src = data.value.drawing
  }
})

function p(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }
}

function down(e: PointerEvent) {
  if (!props.editable)
    return
  canvas.value!.setPointerCapture(e.pointerId)
  history.push(ctx.getImageData(0, 0, canvas.value!.width, canvas.value!.height))
  if (history.length > 20)
    history.shift()
  last = p(e)
  width = pen.value === 'bold' ? 6 : pen.value === 'erase' ? 22 : 2.4
}

function move(e: PointerEvent) {
  if (!last)
    return
  const q = p(e)
  const speed = Math.hypot(q.x - last.x, q.y - last.y) / Math.max(1, q.t - last.t)
  // ink thins when you draw fast, like a real pen
  const base = pen.value === 'bold' ? 6 : pen.value === 'erase' ? 22 : 2.4
  const target = pen.value === 'erase' ? base : base * Math.max(0.45, 1.25 - speed * 0.6)
  width += (target - width) * 0.35
  ctx.strokeStyle = pen.value === 'erase' ? '#fbfaf7' : '#141414'
  ctx.lineWidth = e.pressure && e.pointerType === 'pen' ? base * (0.4 + e.pressure) : width
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  ctx.lineTo(q.x, q.y)
  ctx.stroke()
  last = q
}

function up() {
  if (!last)
    return
  last = null
  strokes.value++
  if (strokes.value % 4 === 0)
    haptic.select()
}

function undo() {
  const img = history.pop()
  if (img) {
    ctx.putImageData(img, 0, 0)
    haptic.tap()
    sfx.play('erase', 0.4)
  }
}

function save() {
  const url = canvas.value!.toDataURL('image/jpeg', 0.7)
  markDone({ drawing: url })
  sfx.play('chime')
}
</script>

<template>
  <div>
    <input :value="data.subject" class="ink-input mb-3" :disabled="!editable" :placeholder="L('What I\'m drawing: my mug…')" @change="patch({ subject: ($event.target as HTMLInputElement).value })">
    <canvas ref="canvas" class="w-full aspect-square border-[2.5px] border-ink bg-sheet touch-none" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" />
    <div class="flex gap-2 mt-3">
      <button v-for="k in (['fine', 'bold', 'erase'] as const)" :key="k" class="tool" :class="{ on: pen === k }" @click="pen = k; haptic.select()">
        <svg v-if="k !== 'erase'" viewBox="0 0 24 24" width="22" height="22"><line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" :stroke-width="k === 'fine' ? 2 : 5" stroke-linecap="round" /></svg>
        <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16l9-9 6 6-6 6H8z" /></svg>
      </button>
      <button class="tool" :aria-label="L('Undo')" @click="undo">
        ↶
      </button>
      <button class="btn btn-ink flex-1 py-2" :disabled="!editable || (!strokes && !data.drawing)" @click="save">
        {{ done ? L('Save again') : L('Save sketch') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tool {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 2px solid var(--color-ink);
  font-size: 1.2rem;
}

.tool.on {
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>
