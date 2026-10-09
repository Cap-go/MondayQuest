<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { FileSharer } from '@capgo/capacitor-file-sharer'
import { computed, ref } from 'vue'
import QuestIcon from '~/components/QuestIcon.vue'
import { useL } from '~/composables/useL'
import { CHALLENGES } from '~/data/challenges'
import { ct } from '~/i18n/content'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { pick: (props.idx * 7) % CHALLENGES.length, to: '' })

const i = ref(data.value.pick % CHALLENGES.length)
const dir = ref<'l' | 'r'>('l')
const to = ref(data.value.to)
const busy = ref(false)
const c = computed(() => CHALLENGES[i.value]!)
const t = computed(() => ct(c.value))
const sentThisWeek = computed(() => props.run.days.filter(d => d.done).map(d => d.data?.to).filter(Boolean) as string[])

function step(d: 1 | -1) {
  if (!props.editable || done.value)
    return
  dir.value = d > 0 ? 'l' : 'r'
  i.value = (i.value + d + CHALLENGES.length) % CHALLENGES.length
  patch({ pick: i.value })
  haptic.select()
  sfx.play('page', 0.5)
}

let x0 = 0
function swipeStart(e: PointerEvent) {
  x0 = e.clientX
}
function swipeEnd(e: PointerEvent) {
  const dx = e.clientX - x0
  if (Math.abs(dx) > 40)
    step(dx < 0 ? 1 : -1)
}

function render(): string {
  const cv = document.createElement('canvas')
  cv.width = 1080
  cv.height = 1350
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#f6f4ef'
  ctx.fillRect(0, 0, 1080, 1350)
  ctx.fillStyle = '#141414'
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 10
  ctx.strokeRect(80, 80, 920, 1190)
  ctx.textAlign = 'center'
  ctx.font = '600 38px Archivo'
  ctx.fillText(L('AN INVITATION').split('').join(' '), 540, 220)
  ctx.font = '800 220px Archivo'
  ctx.fillText(`N°${c.value.n}`, 540, 470)
  ctx.font = '800 88px Archivo'
  ctx.fillText(t.value.title.toUpperCase(), 540, 640, 860)
  ctx.font = '40px "Didact Gothic"'
  let y = 730
  let line = ''
  for (const w of t.value.short.split(' ')) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > 780) {
      ctx.fillText(line, 540, y)
      line = w
      y += 56
    }
    else {
      line = test
    }
  }
  ctx.fillText(line, 540, y)
  // Seven empty boxes: the week ahead.
  ctx.lineWidth = 6
  for (let k = 0; k < 7; k++)
    ctx.strokeRect(205 + k * 98, 1000, 70, 70)
  ctx.font = '600 34px Archivo'
  ctx.fillText('MONDAYQUEST.COM', 540, 1200)
  return cv.toDataURL('image/png').split(',')[1]!
}

async function send() {
  if (!props.editable || busy.value || !to.value.trim())
    return
  busy.value = true
  haptic.press()
  sfx.play('whoosh')
  await FileSharer.share({
    filename: `monday-quest-invite-${c.value.n}.png`,
    base64Data: render(),
    contentType: 'image/png',
    title: t.value.title,
    text: L(`I challenge you: "${t.value.title}". ${t.value.short} Shall we do it together? https://mondayquest.com`),
  }).catch(() => {})
  busy.value = false
  markDone({ pick: i.value, to: to.value.trim() })
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2">
      <button class="arrow" :disabled="!editable || done" :aria-label="L('Previous')" @click="step(-1)">
        ←
      </button>
      <div class="flex-1 overflow-hidden touch-pan-y" @pointerdown="swipeStart" @pointerup="swipeEnd">
        <Transition :name="`slide-${dir}`" mode="out-in">
          <div :key="c.id" class="card" :class="{ sent: done }">
            <div class="flex items-start justify-between">
              <span class="t-display text-3xl leading-none">N°{{ c.n }}</span>
              <QuestIcon :name="c.icon" :size="34" />
            </div>
            <p class="t-display text-lg leading-tight mt-3">
              {{ t.title }}
            </p>
            <p class="t-body text-xs text-graphite mt-1 line-clamp-3">
              {{ t.short }}
            </p>
            <div class="flex gap-1 mt-3">
              <span v-for="k in 7" :key="k" class="w-4 h-4 border-[1.5px] border-ink" />
            </div>
            <span v-if="done" class="stamp">{{ L('SENT') }}</span>
          </div>
        </Transition>
      </div>
      <button class="arrow" :disabled="!editable || done" :aria-label="L('Next')" @click="step(1)">
        →
      </button>
    </div>
    <template v-if="done || !editable">
      <p class="t-label text-graphite mt-4 text-center">
        {{ data.to ? `${L('Sent to')} ${data.to}` : L('Nothing sent that day') }}
      </p>
    </template>
    <div v-else class="flex items-end gap-2 mt-4">
      <input v-model="to" class="ink-input flex-1" :placeholder="L('To whom? (Marc, mum…)')" @change="patch({ to })">
      <button class="btn btn-ink" :disabled="!to.trim() || busy" @click="send">
        {{ L('Invite') }}
      </button>
    </div>
    <p v-if="sentThisWeek.length" class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('This week') }} : {{ sentThisWeek.join(' · ') }}
    </p>
  </div>
</template>

<style scoped>
.arrow {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  padding: 6px;
  transition: transform 140ms var(--ease-spring);
}

.arrow:active:not(:disabled) {
  transform: scale(0.85);
}

.arrow:disabled {
  opacity: 0.25;
}

.card {
  position: relative;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  padding: 14px;
  min-height: 170px;
}

.stamp {
  position: absolute;
  right: 10px;
  bottom: 14px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  border: 3.5px solid var(--color-ink);
  padding: 0 8px;
  transform: rotate(-10deg);
  animation: stamp 300ms cubic-bezier(0.5, 0, 0.75, 0) both;
  mix-blend-mode: multiply;
}

@keyframes stamp {
  from {
    transform: rotate(-16deg) scale(2.4);
    opacity: 0;
  }
}

.slide-l-enter-active,
.slide-l-leave-active,
.slide-r-enter-active,
.slide-r-leave-active {
  transition:
    transform 200ms var(--ease-out-quint),
    opacity 200ms ease;
}

.slide-l-enter-from,
.slide-r-leave-to {
  transform: translateX(40px) rotate(2deg);
  opacity: 0;
}

.slide-l-leave-to,
.slide-r-enter-from {
  transform: translateX(-40px) rotate(-2deg);
  opacity: 0;
}
</style>
