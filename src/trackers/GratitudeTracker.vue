<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'
import { onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { items: ['', '', ''] as string[] })
const listening = ref<number | null>(null)
let partial: PluginListenerHandle | undefined

function set(i: number, v: string) {
  const items = [...data.value.items]
  const was = !!items[i]?.trim()
  items[i] = v
  patch({ items })
  if (!was && v.trim()) {
    sfx.play('pop')
    haptic.tap()
  }
  const all = items.every(s => s.trim())
  if (all && !done.value)
    markDone({ items })
  else if (!all && done.value)
    unmark()
}

async function dictate(i: number) {
  if (!Capacitor.isNativePlatform() || !props.editable)
    return
  if (listening.value != null)
    return stopDictation()
  const perm = await SpeechRecognition.requestPermissions().catch(() => null)
  if (perm?.speechRecognition !== 'granted')
    return
  listening.value = i
  haptic.press()
  partial = await SpeechRecognition.addListener('partialResults', (e) => {
    const t = e.accumulatedText ?? e.matches?.[0]
    if (t)
      set(i, t)
  })
  await SpeechRecognition.start({ language: L.tag(), partialResults: true, addPunctuation: true, popup: false, maxResults: 1 }).catch(stopDictation)
}

async function stopDictation() {
  listening.value = null
  await SpeechRecognition.stop().catch(() => {})
  await partial?.remove()
}

onBeforeUnmount(() => {
  if (listening.value != null)
    void stopDictation()
})
</script>

<template>
  <div>
    <ol class="space-y-4">
      <li v-for="i in 3" :key="i" class="flex items-end gap-3 item" :class="{ filled: data.items[i - 1]?.trim() }">
        <span class="t-display text-xl w-5">{{ i }}.</span>
        <input class="ink-input" :value="data.items[i - 1]" :disabled="!editable" :placeholder="[L('Le soleil sur la terrasse', 'Sun on the terrace'), L('Un fou rire avec Léa', 'A laughing fit with Lea'), L('Un bon café', 'A good coffee')][i - 1]" @change="set(i - 1, ($event.target as HTMLInputElement).value)">
        <button class="mic" :class="{ on: listening === i - 1 }" :disabled="!editable" :aria-label="L('Dicter', 'Dictate')" @click="dictate(i - 1)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        </button>
      </li>
    </ol>
    <div class="flex justify-center mt-5">
      <svg viewBox="0 0 48 48" class="w-14 h-14 heart" :class="{ full: done }">
        <path d="M24 40S8 30 8 18.5C8 13 12 9 16.5 9c3.5 0 6 2 7.5 5 1.5-3 4-5 7.5-5C36 9 40 13 40 18.5 40 30 24 40 24 40z" stroke="var(--color-ink)" stroke-width="2.6" :fill="done ? 'var(--color-ink)' : 'none'" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.mic {
  padding: 8px;
  border: 1.5px solid var(--color-ink);
  transition: all 200ms;
}

.mic.on {
  background: var(--color-ink);
  color: var(--color-paper);
  animation: rec 1s ease-in-out infinite;
}

@keyframes rec {
  50% {
    transform: scale(1.12);
  }
}

.heart.full {
  animation: beat 700ms var(--ease-spring);
}

@keyframes beat {
  30% {
    transform: scale(1.35);
  }
}
</style>
