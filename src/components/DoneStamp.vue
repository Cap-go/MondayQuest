<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import { FileSharer } from '@capgo/capacitor-file-sharer'
import { CapgoInAppReview } from '@capgo/capacitor-in-app-review'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import QuestIcon from '~/components/QuestIcon.vue'
import { useL } from '~/composables/useL'
import { COMMUNITY_URL, openExternal } from '~/config'
import { CHALLENGES } from '~/data/challenges'
import { ct } from '~/i18n/content'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

const props = defineProps<{ challenge: Challenge }>()
const emit = defineEmits<{ stamped: [], close: [] }>()

const quest = useQuest()
const router = useRouter()
const L = useL()
const text = computed(() => ct(props.challenge))
const landed = ref(false)
/** The stamp has hit the paper: only then does it blend into it like real ink. */
const inked = ref(false)
const nextBtn = ref<HTMLButtonElement>()
const closeBtn = ref<HTMLButtonElement>()
const timers: ReturnType<typeof setTimeout>[] = []
const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))
// Read before the stamp saves this run: true only for the very first completed challenge.
const firstEver = quest.completedIds.size === 0

// Same pick as the Today screen's "next up": the first booklet challenge not cleared and not running.
const next = computed(() => CHALLENGES.find(c => !quest.clearedIds.has(c.id) && !quest.runFor(c.id)))
const nextTitle = computed(() => (next.value ? ct(next.value).title : ''))

const confetti = Array.from({ length: 20 }, (_, i) => ({
  x: (Math.random() - 0.5) * 520,
  y: -Math.random() * 520 - 80,
  r: Math.random() * 720 - 360,
  s: 6 + Math.random() * 12,
  d: Math.random() * 120,
  shape: i % 3,
}))

onMounted(() => {
  // Focus the primary action: "Next" when there is one, otherwise "Continue".
  void nextTick(() => (nextBtn.value ?? closeBtn.value)?.focus({ preventScroll: true }))
  later(() => {
    landed.value = true
    sfx.play('done')
    haptic.thud()
    later(() => haptic.success(), 160)
    emit('stamped')
  }, 420)
  // First completed challenge is the moment people love the app the most.
  if (firstEver)
    later(() => CapgoInAppReview.requestReview().catch(() => {}), 2600)
})
onBeforeUnmount(() => timers.forEach(clearTimeout))

function goNext() {
  const c = next.value
  if (!c)
    return
  haptic.tap()
  emit('close')
  setDirection('forward')
  void router.push(`/challenge/${c.id}/read`)
}

async function share() {
  haptic.tap()
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f6f4ef'
  ctx.fillRect(0, 0, 1080, 1350)
  ctx.fillStyle = '#141414'
  ctx.lineWidth = 10
  ctx.strokeRect(80, 80, 920, 1190)
  ctx.textAlign = 'center'
  ctx.font = '800 92px Archivo'
  ctx.fillText(text.value.title.toUpperCase(), 540, 520, 860)
  ctx.font = '40px "Didact Gothic"'
  wrap(ctx, text.value.short, 540, 610, 800, 54)
  ctx.save()
  ctx.translate(540, 920)
  ctx.rotate(-0.12)
  ctx.lineWidth = 14
  ctx.strokeRect(-250, -95, 500, 190)
  ctx.font = '800 150px Archivo'
  ctx.fillText('DONE', 0, 52)
  ctx.restore()
  ctx.font = '600 34px Archivo'
  ctx.fillText('MONDAYQUEST.COM', 540, 1200)
  const base64Data = canvas.toDataURL('image/png').split(',')[1]!
  await FileSharer.share({ filename: `monday-quest-${props.challenge.n}.png`, base64Data, contentType: 'image/png', title: text.value.title, text: `${text.value.title} — DONE · mondayquest.com` }).catch(() => {})
}

function wrap(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, max: number, lh: number) {
  let line = ''
  for (const w of s.split(' ')) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, y)
      line = w
      y += lh
    }
    else {
      line = test
    }
  }
  ctx.fillText(line, x, y)
}
</script>

<template>
  <Teleport to="body">
    <div class="done-overlay" role="dialog" aria-modal="true" aria-labelledby="done-title" @click.self="emit('close')">
      <!-- static blur: the tint above it fades in, the backdrop filter itself is never animated -->
      <div class="done-blur" aria-hidden="true" />
      <div class="confetti" :class="{ go: landed }" aria-hidden="true">
        <i v-for="(c, i) in confetti" :key="i" :class="`s${c.shape}`" :style="{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, '--s': `${c.s}px`, '--d': `${c.d}ms` }" />
      </div>
      <div class="card sheet">
        <!-- drawn once the stamp has landed, not while the card rises -->
        <QuestIcon :name="challenge.icon" :size="72" draw :draw-delay="700" class="mx-auto mb-3" />
        <p class="t-label text-center">
          {{ $t('done.title') }}
        </p>
        <h2 id="done-title" class="t-display text-3xl text-center mt-1">
          {{ text.title }}
        </h2>
        <div class="stamp" :class="{ landed, inked }" @animationend="inked = true">
          DONE
        </div>
        <p class="t-body text-center text-graphite px-4">
          {{ $t('done.subtitle') }}
        </p>
        <button v-if="next" ref="nextBtn" class="btn btn-ink w-full mt-6" @click="goNext">
          {{ $t('done.next', { title: nextTitle }) }}
        </button>
        <div class="grid grid-cols-2 gap-3" :class="next ? 'mt-3' : 'mt-6'">
          <button class="btn" @click="share">
            {{ $t('done.share') }}
          </button>
          <button ref="closeBtn" class="btn" :class="{ 'btn-ink': !next }" @click="emit('close')">
            {{ L('Continue') }}
          </button>
        </div>
        <button v-if="COMMUNITY_URL" class="t-label underline text-graphite w-full text-center mt-4" @click="openExternal(COMMUNITY_URL)">
          {{ L('Tell the Monday Quest group') }} ↗
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.done-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px calc(var(--safe-right) + 24px) 24px calc(var(--safe-left) + 24px);
  background: color-mix(in oklab, var(--color-paper) 70%, transparent);
  animation: tint 260ms ease both;
}

.done-blur {
  position: absolute;
  inset: 0;
  z-index: -1;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
}

.card {
  width: min(100%, 380px);
  padding: 28px 22px 22px;
  border: 2.5px solid var(--color-ink);
  animation: rise 520ms var(--ease-out-quint) both;
}

.stamp {
  margin: 22px auto 18px;
  width: fit-content;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 64px;
  letter-spacing: 0.04em;
  padding: 2px 22px;
  border: 7px solid var(--color-ink);
  transform: rotate(-8deg) scale(3);
  opacity: 0;
}

/* blend only once it sits still: a blended layer scaling down from 3x is costly to composite */
.stamp.inked {
  mix-blend-mode: multiply;
}

.stamp.landed {
  animation: stamp 260ms cubic-bezier(0.5, 0, 0.75, 0) forwards;
}

@keyframes stamp {
  0% {
    transform: rotate(-14deg) scale(2.6);
    opacity: 0;
  }
  70% {
    transform: rotate(-7deg) scale(0.94);
    opacity: 1;
  }
  100% {
    transform: rotate(-8deg) scale(1);
    opacity: 1;
  }
}

.confetti {
  position: absolute;
  left: 50%;
  top: 46%;
  pointer-events: none;
}

.confetti i {
  position: absolute;
  width: var(--s);
  height: var(--s);
  background: var(--color-ink);
  opacity: 0;
  will-change: transform, opacity;
}

.confetti i.s1 {
  height: 3px;
  width: calc(var(--s) * 1.6);
}

.confetti i.s2 {
  background: transparent;
  border: 2px solid var(--color-ink);
}

.confetti.go i {
  animation: burst 1500ms var(--ease-out-quint) var(--d) forwards;
}

@keyframes burst {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0);
  }
  60% {
    opacity: 1;
    transform: translate(var(--x), var(--y)) rotate(var(--r));
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--x) * 1.1), calc(var(--y) * -0.3 + 420px)) rotate(calc(var(--r) * 2));
  }
}

@keyframes tint {
  from {
    background-color: transparent;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.96);
  }
}
</style>
