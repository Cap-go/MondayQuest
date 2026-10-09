<script setup lang="ts">
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'

const props = defineProps<{ modelValue: boolean, label: string, hint?: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

function flip() {
  haptic.select()
  sfx.play('tick', 0.5)
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button class="row" role="switch" :aria-checked="modelValue" @click="flip">
    <span class="flex-1 text-left">
      <span class="t-body block">{{ label }}</span>
      <span v-if="hint" class="t-body block text-xs text-pencil mt-0.5">{{ hint }}</span>
    </span>
    <span class="sw" :class="{ on: modelValue }"><span class="knob" /></span>
  </button>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 0;
  border-bottom: 1px dashed var(--color-rule);
}

.sw {
  width: 50px;
  height: 28px;
  border: 2.5px solid var(--color-ink);
  position: relative;
  transition: background 200ms;
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  background: var(--color-ink);
  transition:
    transform 260ms var(--ease-spring),
    background 200ms;
}

.sw.on {
  background: var(--color-ink);
}

.sw.on .knob {
  transform: translateX(22px);
  background: var(--color-paper);
}
</style>
