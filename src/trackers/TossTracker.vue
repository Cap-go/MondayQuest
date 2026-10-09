<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorShake } from '@capgo/capacitor-shake'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, markDone } = useDay(props, { objects: [] as string[] })

const name = ref('')
const drag = ref({ x: 0, y: 0, active: false })
const flying = ref(false)
const binOpen = ref(false)
let start = { x: 0, y: 0, t: 0 }
let shake: PluginListenerHandle | undefined

function down(e: PointerEvent) {
  if (!name.value.trim() || !props.editable)
    return
  const el = e.target as HTMLElement
  el.setPointerCapture(e.pointerId)
  start = { x: e.clientX, y: e.clientY, t: performance.now() }
  drag.value = { x: 0, y: 0, active: true }
  haptic.tap()
}

function move(e: PointerEvent) {
  if (!drag.value.active)
    return
  drag.value = { x: e.clientX - start.x, y: e.clientY - start.y, active: true }
  binOpen.value = drag.value.y < -60
}

function up(e: PointerEvent) {
  if (!drag.value.active)
    return
  const dt = Math.max(1, performance.now() - start.t)
  const vy = (e.clientY - start.y) / dt
  drag.value.active = false
  if (drag.value.y < -120 || vy < -0.6)
    toss()
  else
    drag.value = { x: 0, y: 0, active: false }
  binOpen.value = false
}

function toss() {
  const obj = name.value.trim()
  if (!obj || flying.value)
    return
  flying.value = true
  binOpen.value = true
  sfx.play('whoosh')
  haptic.press()
  setTimeout(() => {
    haptic.thud()
    const objects = [...data.value.objects, obj]
    markDone({ objects })
    name.value = ''
    flying.value = false
    binOpen.value = false
    drag.value = { x: 0, y: 0, active: false }
  }, 620)
}

onMounted(async () => {
  shake = await CapacitorShake.addListener('shake', () => {
    if (name.value.trim())
      toss()
  }).catch(() => undefined)
})
onBeforeUnmount(() => void shake?.remove())
</script>

<template>
  <div class="relative">
    <div class="flex justify-center">
      <svg viewBox="0 0 80 80" class="w-20 h-20">
        <g class="lid" :class="{ open: binOpen }">
          <path d="M14 22 H66" stroke="var(--color-ink)" stroke-width="3.5" stroke-linecap="round" />
          <path d="M32 22 v-5 h16 v5" fill="none" stroke="var(--color-ink)" stroke-width="3" />
        </g>
        <path d="M19 28 L24 72 H56 L61 28" fill="none" stroke="var(--color-ink)" stroke-width="3.5" stroke-linejoin="round" />
        <path d="M33 36 v28 M47 36 v28" stroke="var(--color-ink)" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </div>

    <div class="h-36 grid place-items-center">
      <div
        v-if="name.trim()"
        class="object"
        :class="{ flying, active: drag.active }"
        :style="flying ? {} : { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 8}deg)` }"
        @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"
      >
        {{ name }}
      </div>
      <p v-else class="t-body text-sm text-pencil text-center">
        {{ L('Write the object, then flick it to the bin (or shake your phone).') }}
      </p>
    </div>

    <label class="block">
      <span class="t-label">{{ L('Object(s) thrown away') }}</span>
      <input v-model="name" class="ink-input mt-1" :disabled="!editable" :placeholder="L('e.g. the duplicate old charger')" @keyup.enter="toss">
    </label>

    <ul v-if="data.objects.length" class="mt-4 flex flex-wrap gap-2">
      <li v-for="(o, i) in data.objects" :key="i" class="text-sm line-through decoration-2 text-graphite">
        {{ o }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.object {
  touch-action: none;
  padding: 12px 18px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 4px 4px 0 var(--color-ink);
  transition: transform 380ms var(--ease-spring);
  max-width: 80%;
  text-align: center;
}

.object.active {
  transition: none;
  box-shadow: 8px 10px 0 var(--color-ink);
}

.object.flying {
  animation: fly 620ms cubic-bezier(0.4, 0, 0.9, 0.6) forwards;
}

@keyframes fly {
  0% {
    transform: translate(0, 0) rotate(0) scale(1);
  }
  60% {
    transform: translate(0, -150px) rotate(200deg) scale(0.55);
    opacity: 1;
  }
  100% {
    transform: translate(0, -112px) rotate(320deg) scale(0.1);
    opacity: 0;
  }
}

.lid {
  transform-origin: 66px 22px;
  transition: transform 300ms var(--ease-spring);
}

.lid.open {
  transform: rotate(28deg) translateY(-4px);
}
</style>
