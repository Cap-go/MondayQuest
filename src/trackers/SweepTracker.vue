<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { rooms: [] as string[] })

const ROOMS = computed(() => ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Desk', 'Sheets', 'Hallway', 'Cupboards'])
const room = ref<string>(ROOMS.value.find(r => !data.value.rooms.includes(r)) ?? ROOMS.value[0]!)

const canvas = ref<HTMLCanvasElement | null>(null)
const cleared = ref(0)
let ctx: CanvasRenderingContext2D | null = null
let last: { x: number, y: number } | null = null
let moves = 0

function paintDust() {
  const c = canvas.value
  if (!c)
    return
  const dpr = window.devicePixelRatio || 1
  const rect = c.getBoundingClientRect()
  c.width = rect.width * dpr
  c.height = rect.height * dpr
  ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.scale(dpr, dpr)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#cfcac0'
  ctx.fillRect(0, 0, rect.width, rect.height)
  // specks, crumbs and hair, drawn like a messy page
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(20,20,20,${Math.random() * 0.35})`
    const s = Math.random() * 3
    ctx.fillRect(Math.random() * rect.width, Math.random() * rect.height, s, s)
  }
  ctx.strokeStyle = 'rgba(20,20,20,0.35)'
  ctx.lineWidth = 1
  for (let i = 0; i < 14; i++) {
    ctx.beginPath()
    const x = Math.random() * rect.width
    const y = Math.random() * rect.height
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + 20, y - 10, x + 30, y + 20, x + 50 * Math.random(), y + 30 * Math.random())
    ctx.stroke()
  }
  ctx.font = '600 15px Archivo'
  ctx.fillStyle = 'rgba(20,20,20,0.75)'
  ctx.textAlign = 'center'
  ctx.fillText(L('RUB TO CLEAN'), rect.width / 2, rect.height / 2 + 5)
  cleared.value = 0
}

function pos(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function down(e: PointerEvent) {
  if (!props.editable || !ctx)
    return
  last = pos(e)
  canvas.value!.setPointerCapture(e.pointerId)
}

function move(e: PointerEvent) {
  if (!last || !ctx)
    return
  const p = pos(e)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineCap = 'round'
  ctx.lineWidth = 46
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  last = p
  if (++moves % 6 === 0) {
    haptic.select()
    measure()
  }
}

function up() {
  last = null
  measure()
}

function measure() {
  const c = canvas.value
  if (!c || !ctx)
    return
  const img = ctx.getImageData(0, 0, c.width, c.height).data
  let clear = 0
  let total = 0
  for (let i = 3; i < img.length; i += 64) {
    total++
    if (img[i]! < 40)
      clear++
  }
  cleared.value = clear / total
}

watch(cleared, (v, old) => {
  if (v > 0.88 && old <= 0.88)
    finishRoom()
})

function finishRoom() {
  sfx.play('chime')
  haptic.success()
  const rooms = Array.from(new Set([...data.value.rooms, room.value]))
  patch({ rooms })
  if (!done.value)
    markDone({ rooms })
  const next = ROOMS.value.find(r => !rooms.includes(r))
  setTimeout(() => {
    if (next)
      room.value = next
    void nextTick(paintDust)
  }, 900)
}

function pickRoom(r: string) {
  haptic.tap()
  room.value = r
  paintDust()
}

onMounted(paintDust)
</script>

<template>
  <div>
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2">
      <button v-for="r in ROOMS" :key="r" class="room" :class="{ on: r === room, done: data.rooms.includes(r) }" @click="pickRoom(r)">
        {{ data.rooms.includes(r) ? '✓ ' : '' }}{{ L(r) }}
      </button>
    </div>
    <div class="relative mt-2 border-[2.5px] border-ink" style="height: 210px">
      <div class="absolute inset-0 grid place-items-center bg-sheet">
        <div class="text-center">
          <p class="t-display text-2xl">
            {{ L(room) }}
          </p>
          <p class="t-label text-graphite mt-1">
            {{ L('Spotless') }} ✦
          </p>
        </div>
      </div>
      <canvas ref="canvas" class="absolute inset-0 w-full h-full touch-none" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" />
    </div>
    <div class="h-1.5 bg-rule mt-3">
      <div class="h-full bg-ink transition-all duration-300" :style="{ width: `${Math.min(100, cleared / 0.88 * 100)}%` }" />
    </div>
    <p class="t-body text-xs text-pencil mt-3">
      {{ L('Tidy a real room, then wipe it clean here too. At least one room a day.') }}
    </p>
  </div>
</template>

<style scoped>
.room {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1.5px solid var(--color-ink);
  font-size: 0.85rem;
  transition: all 200ms;
}

.room.on {
  background: var(--color-ink);
  color: var(--color-paper);
}

.room.done:not(.on) {
  color: var(--color-pencil);
  border-color: var(--color-pencil);
}
</style>
