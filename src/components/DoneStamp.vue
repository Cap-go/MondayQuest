<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import { FileSharer } from '@capgo/capacitor-file-sharer'
import { CapgoInAppReview } from '@capgo/capacitor-in-app-review'
import { computed, onMounted, ref } from 'vue'
import QuestIcon from '~/components/QuestIcon.vue'
import { useL } from '~/composables/useL'
import { COMMUNITY_URL, openExternal } from '~/config'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

const props = defineProps<{ challenge: Challenge }>()
const emit = defineEmits<{ stamped: [], close: [] }>()

const quest = useQuest()
const L = useL()
const text = computed(() => props.challenge.text[quest.locale])
const landed = ref(false)

const confetti = Array.from({ length: 46 }, (_, i) => ({
  x: (Math.random() - 0.5) * 520,
  y: -Math.random() * 520 - 80,
  r: Math.random() * 720 - 360,
  s: 6 + Math.random() * 12,
  d: Math.random() * 120,
  shape: i % 3,
}))

onMounted(() => {
  setTimeout(() => {
    landed.value = true
    sfx.play('done')
    haptic.thud()
    setTimeout(() => haptic.success(), 160)
    emit('stamped')
  }, 420)
  // First completed challenge is the moment people love the app the most.
  if (quest.completedIds.size <= 1)
    setTimeout(() => CapgoInAppReview.requestReview().catch(() => {}), 2600)
})

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
    <div class="done-overlay" @click.self="emit('close')">
      <div class="confetti" :class="{ go: landed }">
        <i v-for="(c, i) in confetti" :key="i" :class="`s${c.shape}`" :style="{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, '--s': `${c.s}px`, '--d': `${c.d}ms` }" />
      </div>
      <div class="card sheet">
        <QuestIcon :name="challenge.icon" :size="72" draw class="mx-auto mb-3" />
        <p class="t-label text-center">
          {{ $t('done.title') }}
        </p>
        <h2 class="t-display text-3xl text-center mt-1">
          {{ text.title }}
        </h2>
        <div class="stamp" :class="{ landed }">
          DONE
        </div>
        <p class="t-body text-center text-graphite px-4">
          {{ $t('done.subtitle') }}
        </p>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <button class="btn" @click="share">
            {{ $t('done.share') }}
          </button>
          <button class="btn btn-ink" @click="emit('close')">
            {{ L('Continuer', 'Continue') }}
          </button>
        </div>
        <button v-if="COMMUNITY_URL" class="t-label underline text-graphite w-full text-center mt-4" @click="openExternal(COMMUNITY_URL)">
          {{ L('Raconter ça dans le groupe Monday Quest', 'Tell the Monday Quest group') }} ↗
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
  padding: 24px;
  background: color-mix(in oklab, var(--color-paper) 70%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: fade 260ms ease both;
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

@keyframes fade {
  from {
    opacity: 0;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.96);
  }
}
</style>
