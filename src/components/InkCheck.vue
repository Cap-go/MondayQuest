<script setup lang="ts">
import { computed, ref } from 'vue'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'

const props = withDefaults(defineProps<{
  modelValue: boolean
  size?: number
  disabled?: boolean
  /** When checked, require a long press to erase so a stray tap never undoes a day. */
  eraseHold?: number
  label?: string
  variant?: 'day' | 'done'
}>(), { size: 76, eraseHold: 650, variant: 'day' })

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'denied': []
}>()

const pressing = ref(false)
const erasing = ref(0)
const bump = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | undefined
let raf = 0
let holdStart = 0

const checked = computed(() => props.modelValue)

function down() {
  if (props.disabled) {
    haptic.warning()
    emit('denied')
    return
  }
  pressing.value = true
  if (checked.value) {
    holdStart = performance.now()
    const loop = () => {
      erasing.value = Math.min(1, (performance.now() - holdStart) / props.eraseHold)
      if (erasing.value < 1)
        raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    holdTimer = setTimeout(() => {
      sfx.play('erase')
      haptic.thud()
      emit('update:modelValue', false)
      reset()
    }, props.eraseHold)
  }
}

function up() {
  if (!pressing.value)
    return
  const wasChecked = checked.value
  const held = erasing.value
  reset()
  if (!wasChecked && !props.disabled) {
    bump.value = true
    setTimeout(() => (bump.value = false), 420)
    sfx.play('check')
    void haptic.check()
    emit('update:modelValue', true)
  }
  else if (wasChecked && held < 1 && held > 0) {
    haptic.select()
  }
}

function reset() {
  pressing.value = false
  erasing.value = 0
  clearTimeout(holdTimer)
  cancelAnimationFrame(raf)
}
</script>

<template>
  <button
    type="button"
    class="ink-check relative inline-flex flex-col items-center gap-1.5 outline-none"
    :class="{ 'is-checked': checked, 'is-pressing': pressing, 'is-bump': bump, 'is-disabled': disabled }"
    :aria-pressed="checked"
    :aria-label="label"
    @pointerdown.prevent="down"
    @pointerup="up"
    @pointerleave="reset"
    @pointercancel="reset"
  >
    <span v-if="label" class="t-label text-[0.72rem]" :class="variant === 'done' ? 'font-extrabold' : ''">{{ label }}</span>
    <svg :width="size" :height="size" viewBox="0 0 100 100" class="overflow-visible">
      <rect x="8" y="8" width="84" height="84" fill="var(--color-sheet)" stroke="var(--color-ink)" :stroke-width="variant === 'done' ? 6 : 5" />
      <rect v-if="erasing > 0" x="8" y="8" width="84" height="84" fill="var(--color-ink)" :opacity="erasing * 0.12" />
      <!-- the ink check: overshoots the frame like a pen check would -->
      <path
        class="tick"
        d="M20 50 C27 55 33 63 40 77 C40 78 41 78 42 77 C53 52 72 25 104 2"
        pathLength="1"
        fill="none"
        stroke="var(--color-ink)"
        stroke-width="10"
        stroke-linecap="round"
        stroke-linejoin="round"
        :style="{ opacity: 1 - erasing * 0.85 }"
      />
      <circle class="blot" cx="20" cy="50" r="6" fill="var(--color-ink)" />
    </svg>
  </button>
</template>

<style scoped>
.ink-check svg {
  transition: transform 180ms var(--ease-spring);
}

.is-pressing svg {
  transform: scale(0.93);
}

.is-bump svg {
  animation: bump 420ms var(--ease-spring);
}

.is-disabled {
  opacity: 0.32;
}

.tick {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 260ms var(--ease-ink);
}

.is-checked .tick {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 380ms var(--ease-ink) 40ms;
}

.blot {
  transform-origin: 20px 50px;
  transform: scale(0);
  transition: transform 140ms ease-out;
}

.is-checked .blot {
  transform: scale(1);
  animation: blot 380ms ease-out forwards;
}

@keyframes blot {
  0% {
    transform: scale(0);
  }
  30% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(0);
  }
}

@keyframes bump {
  0% {
    transform: scale(0.9);
  }
  45% {
    transform: scale(1.07) rotate(-2deg);
  }
  100% {
    transform: scale(1);
  }
}
</style>
