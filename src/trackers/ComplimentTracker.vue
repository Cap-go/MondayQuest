<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// A real compliment, not "you're great": something precise they did, what it says about
// them, what it changed for you. Ask for their attention, then speak for at least N seconds.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { to: '', did: '', shows: '', changed: '', spoke: 0 })
/** 30 s on day one, 5 more each day, 60 s on day seven. */
const SECONDS = 30 + props.idx * 5

const to = ref(data.value.to)
const did = ref(data.value.did)
const shows = ref(data.value.shows)
const changed = ref(data.value.changed)
const landing = ref(false)

// Zig-zag rosette edge, 24 points.
function rosette(cx: number, cy: number, r1: number, r2: number) {
  const pts = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2
    const r = i % 2 ? r2 : r1
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  })
  return `M${pts.join('L')}Z`
}
const big = rosette(60, 50, 40, 33)
const small = rosette(20, 16, 13, 10.5)

const enough = (v: string) => v.trim().length >= 8
const ready = computed(() => to.value.trim().length > 0 && enough(did.value) && enough(shows.value) && enough(changed.value))

const week = computed(() => props.run.days.map((d, i) => ({
  i,
  on: d.done,
  initial: String(d.data?.to ?? '').trim().charAt(0).toUpperCase(),
  today: i === props.idx,
})))

function save() {
  patch({ to: to.value, did: did.value, shows: shows.value, changed: changed.value })
}

// Speaking session
const speaking = ref(false)
const left = ref(SECONDS)
let timer: ReturnType<typeof setInterval> | undefined

function speak() {
  if (!props.editable || !ready.value)
    return
  save()
  speaking.value = true
  left.value = SECONDS
  haptic.press()
  sfx.play('chime', 0.4)
  void KeepAwake.keepAwake().catch(() => {})
  timer = setInterval(() => {
    left.value--
    if (left.value === 0) {
      haptic.success()
      sfx.play('bell', 0.5)
    }
  }, 1000)
}

function finish() {
  clearInterval(timer)
  void KeepAwake.allowSleep().catch(() => {})
  const spoke = SECONDS - Math.max(0, left.value)
  speaking.value = false
  if (left.value > 0) {
    haptic.warning()
    patch({ spoke })
    return
  }
  landing.value = true
  setTimeout(() => {
    sfx.play('stamp')
    haptic.thud()
    markDone({ to: to.value.trim(), did: did.value.trim(), shows: shows.value.trim(), changed: changed.value.trim(), spoke: SECONDS })
  }, 320)
  setTimeout(() => (landing.value = false), 900)
}

onBeforeUnmount(() => {
  clearInterval(timer)
  void KeepAwake.allowSleep().catch(() => {})
})

const C = 2 * Math.PI * 120
</script>

<template>
  <div>
    <div class="flex items-start gap-3">
      <svg viewBox="0 0 120 130" class="w-20 shrink-0 medal" :class="{ on: done, landing }">
        <path d="M44 78 L30 124 L44 114 L52 126 L60 84" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="miter" />
        <path d="M76 78 L90 124 L76 114 L68 126 L60 84" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="miter" />
        <path :d="big" :fill="done ? 'var(--color-sun)' : 'var(--color-paper)'" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="miter" class="petals" />
        <circle cx="60" cy="50" r="22" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" />
        <text x="60" y="58" text-anchor="middle" class="t-display" font-size="22" fill="var(--color-ink)">{{ done ? (data.to.trim().charAt(0).toUpperCase() || '★') : '?' }}</text>
      </svg>
      <div class="flex-1 min-w-0">
        <p class="t-label text-graphite">
          {{ L('Today') }} · {{ L(`at least ${SECONDS} s`) }}
        </p>
        <p class="t-body text-xs text-pencil mt-1">
          {{ L('Not "you\'re great". A precise thing they did, what it says about them, what it changed for you.') }}
        </p>
      </div>
    </div>

    <div v-if="done || !editable" class="mt-4 space-y-2">
      <p class="t-label">
        {{ L('To') }} {{ data.to || '—' }}
      </p>
      <p class="t-body text-sm">
        <span class="t-label text-pencil">1.</span> {{ data.did }}
      </p>
      <p class="t-body text-sm">
        <span class="t-label text-pencil">2.</span> {{ data.shows }}
      </p>
      <p class="t-body text-sm">
        <span class="t-label text-pencil">3.</span> {{ data.changed }}
      </p>
    </div>
    <div v-else class="mt-4 space-y-3">
      <input v-model="to" class="ink-input w-full" :placeholder="L('For whom? (Lea, my dad, the neighbour…)')" @change="save">
      <label class="block">
        <span class="t-label">1 · {{ L('What they did, precisely') }}</span>
        <textarea v-model="did" rows="2" class="ink-input w-full resize-none mt-1" :placeholder="L('You took over the project when I was sick, without being asked.')" @change="save" />
      </label>
      <label class="block">
        <span class="t-label">2 · {{ L('What it says about them') }}</span>
        <textarea v-model="shows" rows="2" class="ink-input w-full resize-none mt-1" :placeholder="L('You are reliable: people can count on you when it matters.')" @change="save" />
      </label>
      <label class="block">
        <span class="t-label">3 · {{ L('What it changed for you') }}</span>
        <textarea v-model="changed" rows="2" class="ink-input w-full resize-none mt-1" :placeholder="L('I could rest without stress. It really touched me.')" @change="save" />
      </label>
      <p class="t-body text-xs text-graphite">
        {{ L('Then ask for their attention: "Can I tell you something?" Look at them, and take your time.') }}
      </p>
    </div>

    <button v-if="!done" class="btn btn-ink w-full mt-4" :disabled="!editable || !ready" @click="speak">
      {{ ready ? L('I\'m telling them now') : L('Fill in the 3 points') }}
    </button>
    <p v-if="!done && data.spoke" class="t-body text-xs text-pencil text-center mt-2">
      {{ L(`Last try: ${data.spoke} s. Aim for ${SECONDS} s.`) }}
    </p>

    <div class="flex justify-between mt-5 border-t-2 border-rule pt-3">
      <svg v-for="d in week" :key="d.i" viewBox="0 0 40 44" class="w-9" :class="{ 'opacity-30': !d.on && !d.today }">
        <path d="M14 26 L9 42 L15 38 L18 43 L20 30 M26 26 L31 42 L25 38 L22 43 L20 30" fill="none" :stroke="d.on ? 'var(--color-ink)' : 'var(--color-pencil)'" stroke-width="1.5" />
        <path :d="small" :fill="d.on ? 'var(--color-ink)' : 'none'" :stroke="d.on ? 'var(--color-ink)' : 'var(--color-pencil)'" stroke-width="1.5" />
        <text x="20" y="20" text-anchor="middle" font-size="10" font-weight="800" :fill="d.on ? 'var(--color-paper)' : 'var(--color-pencil)'">{{ d.on ? (d.initial || '★') : d.i + 1 }}</text>
      </svg>
    </div>

    <!-- speaking: cue cards + minimum time -->
    <Teleport to="body">
      <div v-if="speaking" class="speak">
        <p class="t-label opacity-70">
          {{ L('To') }} {{ to }}
        </p>
        <div class="dial">
          <svg viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="8" />
            <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" stroke-width="8" :stroke-dasharray="C" :stroke-dashoffset="C * (Math.max(0, left) / SECONDS)" transform="rotate(-90 130 130)" />
          </svg>
          <p class="t-display tabular-nums num">
            {{ left > 0 ? left : '✓' }}
          </p>
        </div>
        <ol class="cues">
          <li><span class="t-label">1</span>{{ did }}</li>
          <li><span class="t-label">2</span>{{ shows }}</li>
          <li><span class="t-label">3</span>{{ changed }}</li>
        </ol>
        <button class="btn finish" @click="finish">
          {{ left > 0 ? L('Done (too short)') : L('Said it. Pin the ribbon') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.speak {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--color-ink);
  color: var(--color-paper);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: calc(var(--safe-top) + 20px) 24px calc(var(--safe-bottom) + 24px);
}

.dial {
  position: relative;
  width: min(48vw, 200px);
  display: grid;
  place-items: center;
}

.dial svg {
  width: 100%;
}

.dial circle {
  transition: stroke-dashoffset 1s linear;
}

.num {
  position: absolute;
  font-size: min(16vw, 72px);
  line-height: 1;
}

.cues {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cues li {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid rgb(255 255 255 / 0.25);
  font-size: 0.95rem;
  line-height: 1.35;
}

.finish {
  background: transparent;
  border-color: var(--color-paper);
  color: var(--color-paper);
  width: 100%;
  max-width: 360px;
}

.medal {
  transform-origin: 60px 50px;
  transition: transform 300ms var(--ease-spring);
}

.medal.landing {
  animation: pin 620ms cubic-bezier(0.5, 0, 0.75, 0) both;
}

.medal.on .petals {
  animation: glow 900ms var(--ease-out-quint) both;
}

@keyframes pin {
  0% {
    transform: translateY(-30px) rotate(-18deg) scale(1.6);
    opacity: 0.4;
  }
  50% {
    transform: translateY(0) rotate(4deg) scale(0.92);
    opacity: 1;
  }
  100% {
    transform: rotate(-3deg) scale(1);
  }
}

@keyframes glow {
  from {
    transform: rotate(-30deg);
  }
}

.petals {
  transform-origin: 60px 50px;
}
</style>
