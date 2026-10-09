<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref, watch } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { text: '', words: 0 })
// 150 words on day one, 50 more every day, 450 on day seven.
const GOAL = 150 + props.idx * 50
const text = ref<string>(data.value.text)
const words = computed(() => (text.value.trim() ? text.value.trim().split(/\s+/).length : 0))
const C = 2 * Math.PI * 18

let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(text, (t) => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(patch, 600, { text: t, words: words.value })
})

watch(words, (w, old) => {
  if (Math.floor(w / 50) > Math.floor(old / 50))
    haptic.tap()
  if (w >= GOAL && !done.value)
    markDone({ text: text.value, words: w })
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="t-label">{{ L('Aujourd\'hui', 'Today') }} · {{ GOAL }} {{ L('mots', 'words') }}</span>
      <div class="flex items-center gap-2">
        <span class="t-label tabular-nums">{{ words }}/{{ GOAL }}</span>
        <svg viewBox="0 0 44 44" class="w-9 h-9 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-rule)" stroke-width="4" />
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-ink)" stroke-width="4" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - Math.min(1, words / GOAL))" style="transition: stroke-dashoffset 300ms" />
        </svg>
      </div>
    </div>
    <p class="t-body text-xs text-pencil mb-2">
      {{ L('Écrivez sans vous relire.', 'Write without rereading.') }}
    </p>
    <textarea v-model="text" class="pages" :disabled="!editable" :placeholder="L('Ce matin, je…', 'This morning, I…')" />
  </div>
</template>

<style scoped>
.pages {
  width: 100%;
  min-height: 260px;
  border: 0;
  outline: none;
  resize: none;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 32px;
  padding: 4px 2px;
  color: var(--color-ink);
  background: repeating-linear-gradient(transparent 0 31px, var(--color-rule) 31px 32px);
}
</style>
