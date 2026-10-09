<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { useL } from '~/composables/useL'
import NoteTracker from './NoteTracker.vue'

const props = defineProps<TrackerProps>()
const L = useL()
</script>

<template>
  <NoteTracker v-bind="props" field="note" :label="L('Who did you talk to, about what?')" :placeholder="L('The lady on the subway, about her Murakami book')" :cta="L('I talked to a stranger')" :done-label="L('Conversation ✓')">
    <template #visual="{ done }">
      <svg viewBox="0 0 200 80" class="w-full max-w-60 mx-auto mb-4">
        <g class="b1"><path d="M10 10h80v36H40l-14 12V46H10z" fill="none" stroke="var(--color-ink)" stroke-width="2.6" stroke-linejoin="round" /><text x="50" y="34" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="16">{{ L('Hi') }}</text></g>
        <g class="b2" :class="{ on: done }"><path d="M110 26h80v36h-16v12l-14-12h-50z" :fill="done ? 'var(--color-ink)' : 'none'" stroke="var(--color-ink)" stroke-width="2.6" stroke-linejoin="round" /><text x="150" y="50" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="16" :fill="done ? 'var(--color-paper)' : 'var(--color-pencil)'">{{ done ? ':)' : '…' }}</text></g>
      </svg>
    </template>
  </NoteTracker>
</template>

<style scoped>
.b1 {
  animation: pop 500ms var(--ease-spring) both;
}

.b2 {
  animation: pop 500ms var(--ease-spring) 300ms both;
  transform-origin: 150px 50px;
}

.b2.on {
  animation: pop 600ms var(--ease-spring);
}

@keyframes pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}
</style>
