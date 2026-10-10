<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { RichNotifications } from '@capgo/capacitor-rich-notifications'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// One paragraph a day of a letter to yourself; on day seven it is sealed and comes back in a year.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { text: '', sealedAt: 0, opensAt: 0 })
const MIN_WORDS = 20
const YEAR = 365 * 24 * 3600 * 1000

const draft = ref(data.value.text)
const words = computed(() => draft.value.trim() ? draft.value.trim().split(/\s+/).length : 0)
const lastDay = computed(() => props.idx === 6)

/** Paragraphs written so far, in order (previous days + today). */
const paragraphs = computed(() => props.run.days.map((d, i) => (i === props.idx ? draft.value : String(d.data?.text ?? ''))).filter(p => p.trim()))
const sealed = computed(() => props.run.days.find(d => d.data?.sealedAt)?.data as { sealedAt: number, opensAt: number } | undefined)
const isOpen = computed(() => !!sealed.value && Date.now() >= sealed.value.opensAt)
const opensOn = computed(() => sealed.value ? new Date(sealed.value.opensAt).toLocaleDateString(L.tag(), { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const sealing = ref(false)

function save() {
  patch({ text: draft.value })
}

function addParagraph() {
  if (!props.editable || words.value < MIN_WORDS)
    return
  sfx.play('page')
  haptic.press()
  markDone({ text: draft.value.trim() })
}

async function seal() {
  if (!props.editable || words.value < MIN_WORDS)
    return
  const sealedAt = Date.now()
  const opensAt = sealedAt + YEAR
  sealing.value = true
  haptic.thud()
  sfx.play('stamp')
  if (Capacitor.isNativePlatform()) {
    await RichNotifications.schedule({
      notification: { id: `mq-letter-${props.run.id}-6`, title: L('A letter from you, one year ago'), body: L('It was sealed on Monday Quest. Open it now.'), channelId: 'quest' },
      trigger: { type: 'timestamp', timestamp: opensAt },
    }).catch(() => {})
  }
  setTimeout(() => {
    markDone({ text: draft.value.trim(), sealedAt, opensAt })
    sealing.value = false
  }, 900)
}
</script>

<template>
  <div>
    <!-- sealed: the envelope stays closed until next year -->
    <div v-if="sealed && !isOpen" class="envelope mx-auto">
      <svg viewBox="0 0 240 160" class="w-full">
        <rect x="6" y="6" width="228" height="148" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="3" />
        <path d="M6 6 L120 92 L234 6" fill="none" stroke="var(--color-ink)" stroke-width="3" />
        <circle cx="120" cy="92" r="20" fill="var(--color-ink)" />
        <text x="120" y="99" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="16" fill="var(--color-paper)">MQ</text>
      </svg>
      <p class="t-label text-center mt-3">
        {{ L('Sealed. It opens on') }} {{ opensOn }}
      </p>
    </div>

    <template v-else>
      <div class="letter" :class="{ folding: sealing }">
        <p class="t-display text-lg">
          {{ L('Dear future me,') }}
        </p>
        <p v-for="(para, i) in paragraphs.slice(0, editable && !done ? -1 : undefined)" :key="i" class="t-body text-sm mt-2 para">
          {{ para }}
        </p>
        <textarea
          v-if="editable && !done" v-model="draft" rows="5" class="ink-input w-full resize-none mt-2 text-sm"
          :placeholder="lastDay ? L('Last paragraph: what do you want to tell yourself in a year?') : L('Today\'s paragraph: who you are, what changed, what you hope…')"
          @change="save"
        />
      </div>

      <template v-if="editable && !done">
        <p class="t-label text-pencil text-right mt-1">
          {{ words }}/{{ MIN_WORDS }} {{ L('words') }}
        </p>
        <button v-if="!lastDay" class="btn btn-ink w-full mt-3" :disabled="words < MIN_WORDS" @click="addParagraph">
          {{ L('Add it to the letter') }}
        </button>
        <button v-else class="btn btn-ink w-full mt-3" :disabled="words < MIN_WORDS || sealing" @click="seal">
          {{ L('Seal the letter for one year') }}
        </button>
      </template>
      <p v-else-if="isOpen" class="t-label text-center mt-3">
        {{ L('Opened, one year later.') }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.letter {
  padding: 16px;
  border: 2.5px solid var(--color-ink);
  background: repeating-linear-gradient(to bottom, var(--color-sheet) 0 27px, var(--color-rule) 27px 28px);
  transform-origin: top center;
}

.para {
  line-height: 1.55;
}

.letter.folding {
  animation: fold 900ms var(--ease-ink) forwards;
}

@keyframes fold {
  60% {
    transform: perspective(600px) rotateX(70deg) scaleY(0.6);
  }
  100% {
    transform: perspective(600px) rotateX(90deg) scaleY(0.2);
    opacity: 0;
  }
}

.envelope {
  max-width: 280px;
  animation: drop 700ms var(--ease-spring) both;
}

@keyframes drop {
  from {
    transform: translateY(-24px) rotate(-4deg);
    opacity: 0;
  }
}
</style>
