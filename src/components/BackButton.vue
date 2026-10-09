<script setup lang="ts">
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { useRouter } from 'vue-router'
import { haptic } from '~/services/haptics'

// The one back arrow used across pushed pages. Falls back to `fallback` when there is no history.
const props = withDefaults(defineProps<{ fallback?: string }>(), { fallback: '/today' })
const emit = defineEmits<{ back: [] }>()
const router = useRouter()

function back() {
  haptic.tap()
  emit('back')
  setDirection('back')
  if (window.history.state?.back)
    router.back()
  else
    void router.replace(props.fallback)
}
</script>

<template>
  <button class="icon-btn" :aria-label="$t('common.back')" @click="back">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M15 5l-7 7 7 7" /></svg>
  </button>
</template>

<style scoped>
.icon-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  transition: transform 160ms var(--ease-spring);
}

.icon-btn:active {
  transform: scale(0.9);
}
</style>
