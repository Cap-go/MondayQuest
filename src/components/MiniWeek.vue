<script setup lang="ts">
import type { Run } from '~/lib/progress'

defineProps<{ run: Run, today: number }>()
</script>

<template>
  <div class="flex gap-1.5">
    <span
      v-for="(d, i) in run.days" :key="i"
      class="mini" :class="{ on: d.done, now: i === today }"
      :style="{ transitionDelay: `${i * 40}ms` }"
    >
      <svg v-if="d.done" viewBox="0 0 20 20"><path d="M4 10.5l4 4L17 4" fill="none" stroke="var(--color-paper)" stroke-width="2.6" stroke-linecap="round" /></svg>
    </span>
  </div>
</template>

<style scoped>
.mini {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-ink);
  display: grid;
  place-items: center;
  transition: background 250ms;
}

.mini.on {
  background: var(--color-ink);
}

.mini.now:not(.on) {
  border-style: dashed;
}
</style>
