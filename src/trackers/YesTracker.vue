<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, markDone } = useDay(props, { note: '' })
const draft = ref(data.value.note)
const stamping = ref(false)

function oui() {
  const note = draft.value.trim()
  if (!note || !props.editable)
    return
  stamping.value = true
  setTimeout(() => {
    sfx.play('stamp')
    haptic.thud()
    markDone({ note })
  }, 220)
  setTimeout(() => (stamping.value = false), 900)
}
</script>

<template>
  <div class="relative">
    <label class="block">
      <span class="t-label">{{ L('An unusual request you accepted') }} :</span>
      <textarea v-model="draft" rows="3" class="ink-input mt-2 resize-none" :disabled="!editable" :placeholder="L('“Coming to karaoke tonight?”')" />
    </label>
    <div class="flex items-center justify-between mt-4">
      <button class="btn btn-ink" :disabled="!editable || !draft.trim()" @click="oui">
        {{ L('I said YES') }}
      </button>
      <div class="stamp" :class="{ show: done || stamping, hit: stamping }">
        {{ L('YES') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.stamp {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2.6rem;
  padding: 0 14px;
  border: 5px solid var(--color-ink);
  transform: rotate(-10deg) scale(0.8);
  opacity: 0;
  transition: opacity 200ms;
}

.stamp.show {
  opacity: 1;
  transform: rotate(-10deg);
}

.stamp.hit {
  animation: hit 360ms cubic-bezier(0.5, 0, 0.75, 0);
}

@keyframes hit {
  0% {
    transform: rotate(-20deg) scale(3);
    opacity: 0;
  }
  70% {
    transform: rotate(-9deg) scale(0.9);
    opacity: 1;
  }
}
</style>
