<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, markDone } = useDay(props, { who: '', words: '' })
const who = ref(data.value.who)
const words = ref(data.value.words)
const sending = ref(false)

function send() {
  if (!who.value.trim() || !props.editable)
    return
  sending.value = true
  haptic.press()
  setTimeout(() => sfx.play('whoosh'), 500)
  setTimeout(() => {
    markDone({ who: who.value.trim(), words: words.value.trim() })
    sending.value = false
  }, 1100)
}
</script>

<template>
  <div>
    <div class="env-wrap">
      <svg viewBox="0 0 160 100" class="envelope" :class="{ sending, sent: done && !sending }">
        <rect x="4" y="16" width="152" height="80" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="3" />
        <rect x="18" :y="sending ? 40 : 4" width="124" height="60" fill="#fff" stroke="var(--color-ink)" stroke-width="2" class="letter" />
        <path d="M4 96 L80 52 L156 96" fill="none" stroke="var(--color-ink)" stroke-width="3" />
        <path d="M4 16 L80 62 L156 16" :fill="sending || done ? 'var(--color-sheet)' : 'none'" stroke="var(--color-ink)" stroke-width="3" class="flap" :class="{ closed: sending || done }" />
        <text v-if="done && !sending" x="80" y="88" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="11">{{ data.who.toUpperCase() }}</text>
      </svg>
    </div>
    <label class="block mt-4">
      <span class="t-label">{{ L('À qui ?', 'To whom?') }}</span>
      <input v-model="who" class="ink-input mt-1" :disabled="!editable" :placeholder="L('Maman, Julien, Mme Leroy…', 'Mum, Julian, Mrs Leroy…')">
    </label>
    <label class="block mt-3">
      <span class="t-label">{{ L('Ce que vous lui avez dit', 'What you told them') }}</span>
      <textarea v-model="words" rows="2" class="ink-input mt-1 resize-none" :disabled="!editable" :placeholder="L('Merci pour ce week-end à la mer en 2009…', 'Thanks for that weekend by the sea in 2009…')" />
    </label>
    <button class="btn btn-ink w-full mt-4" :disabled="!editable || !who.trim()" @click="send">
      {{ done ? L('Message envoyé ✓', 'Message sent ✓') : L('C\'est dit', 'Said and done') }}
    </button>
  </div>
</template>

<style scoped>
.env-wrap {
  display: flex;
  justify-content: center;
  overflow: visible;
}

.envelope {
  width: 170px;
  overflow: visible;
}

.letter {
  transition: y 500ms var(--ease-ink);
}

.flap {
  transform-origin: 80px 16px;
  transform: scaleY(-1);
  transition: transform 400ms var(--ease-ink) 350ms;
}

.flap.closed {
  transform: scaleY(1);
}

.envelope.sending {
  animation: send 1100ms var(--ease-ink) forwards;
}

@keyframes send {
  0%,
  65% {
    transform: none;
  }
  100% {
    transform: translate(220px, -90px) rotate(-18deg) scale(0.4);
    opacity: 0;
  }
}

.envelope.sent {
  animation: back 500ms var(--ease-spring);
}

@keyframes back {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
}
</style>
